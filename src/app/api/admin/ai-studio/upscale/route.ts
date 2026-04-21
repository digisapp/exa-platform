import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const maxDuration = 300;

const FAL_KEY = process.env.FAL_KEY;

const requestSchema = z.object({
  image_url: z.string().url(),
  scale: z.enum(["2x", "4x"]).default("4x"),
});

/**
 * POST /api/admin/ai-studio/upscale
 * Upscales an image using FAL.ai's Aura SR model (4x default).
 * Uses the queue API to avoid timeout on large images.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimited = await checkEndpointRateLimit(request, "uploads", user.id);
  if (rateLimited) return rateLimited;

  if (!FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY not configured" }, { status: 500 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { image_url, scale } = parsed.data;
  const headers = {
    Authorization: `Key ${FAL_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // Step 1: Submit to FAL queue
    const submitRes = await fetch("https://queue.fal.run/fal-ai/aura-sr", {
      method: "POST",
      headers,
      body: JSON.stringify(
        scale === "4x" ? { image_url } : { image_url, upscaling_factor: 2 }
      ),
    });

    if (!submitRes.ok) {
      const errorText = await submitRes.text().catch(() => "Unknown error");
      console.error("[Upscale] FAL submit error:", submitRes.status, errorText);
      return NextResponse.json(
        { error: `Upscale submit failed (${submitRes.status}): ${errorText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const { request_id } = await submitRes.json();
    if (!request_id) {
      return NextResponse.json({ error: "No request_id from FAL queue" }, { status: 502 });
    }

    // Step 2: Poll for completion (up to 4 minutes)
    const maxWait = 240_000;
    const pollInterval = 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const statusRes = await fetch(
        `https://queue.fal.run/fal-ai/aura-sr/requests/${request_id}/status`,
        { headers: { Authorization: `Key ${FAL_KEY}` } }
      );

      if (!statusRes.ok) continue;
      const status = await statusRes.json();

      if (status.status === "COMPLETED") {
        // Step 3: Get the result
        const resultRes = await fetch(
          `https://queue.fal.run/fal-ai/aura-sr/requests/${request_id}`,
          { headers: { Authorization: `Key ${FAL_KEY}` } }
        );

        if (!resultRes.ok) {
          return NextResponse.json({ error: "Failed to fetch upscale result" }, { status: 502 });
        }

        const result = await resultRes.json();
        const upscaledUrl = result?.image?.url;

        if (!upscaledUrl) {
          console.error("[Upscale] Unexpected result:", JSON.stringify(result).slice(0, 500));
          return NextResponse.json({ error: "No image in upscale result" }, { status: 502 });
        }

        // Step 4: Download and save to Supabase storage
        const imgRes = await fetch(upscaledUrl);
        if (!imgRes.ok) {
          return NextResponse.json({ error: "Failed to download upscaled image" }, { status: 502 });
        }

        const contentType = imgRes.headers.get("content-type") || "image/png";
        const buffer = new Uint8Array(await imgRes.arrayBuffer());
        const ext = contentType.includes("png") ? "png" : "jpg";
        const storagePath = `ai-studio/upscaled-${Date.now()}.${ext}`;

        const admin = createServiceRoleClient();
        const { error: uploadError } = await admin.storage
          .from("portfolio")
          .upload(storagePath, buffer, { contentType, upsert: true });

        if (uploadError) {
          console.error("[Upscale] Storage error:", uploadError);
          return NextResponse.json(
            { error: `Storage upload failed: ${uploadError.message}` },
            { status: 500 }
          );
        }

        const {
          data: { publicUrl },
        } = admin.storage.from("portfolio").getPublicUrl(storagePath);

        return NextResponse.json({
          saved_url: `${publicUrl}?v=${Date.now()}`,
          width: result.image.width,
          height: result.image.height,
        });
      }

      if (status.status === "FAILED") {
        console.error("[Upscale] FAL job failed:", status);
        return NextResponse.json(
          { error: "Upscale processing failed" },
          { status: 502 }
        );
      }

      // IN_QUEUE or IN_PROGRESS — keep polling
    }

    return NextResponse.json({ error: "Upscale timed out (4 min)" }, { status: 504 });
  } catch (error: any) {
    console.error("[Upscale] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Upscale failed unexpectedly" },
      { status: 500 }
    );
  }
}
