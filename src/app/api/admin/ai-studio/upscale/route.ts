import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import sharp from "sharp";

export const maxDuration = 300;

const FAL_KEY = process.env.FAL_KEY;

const requestSchema = z.object({
  image_url: z.string().url(),
  scale: z.enum(["2x", "4x"]).default("4x"),
});

/**
 * POST /api/admin/ai-studio/upscale
 * Upscales an image using FAL.ai's Aura SR model (4x default).
 * Downloads image first, sends as base64 to FAL (Supabase URLs aren't accessible to FAL).
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
  const falHeaders = {
    Authorization: `Key ${FAL_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    // Step 1: Download the image from Supabase (or wherever) and convert to base64
    const imgDownload = await fetch(image_url);
    if (!imgDownload.ok) {
      return NextResponse.json(
        { error: `Failed to download source image: ${imgDownload.status}` },
        { status: 400 }
      );
    }

    const imgBuffer = await imgDownload.arrayBuffer();
    const imgContentType = imgDownload.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const dataUri = `data:${imgContentType};base64,${base64}`;

    // Step 2: Submit to FAL queue with base64 data URI
    const submitRes = await fetch("https://queue.fal.run/fal-ai/aura-sr", {
      method: "POST",
      headers: falHeaders,
      body: JSON.stringify(
        scale === "4x"
          ? { image_url: dataUri }
          : { image_url: dataUri, upscaling_factor: 2 }
      ),
    });

    if (!submitRes.ok) {
      const errorText = await submitRes.text().catch(() => "Unknown error");
      console.error("[Upscale] FAL submit error:", submitRes.status, errorText);
      return NextResponse.json(
        { error: `Upscale submit failed (${submitRes.status})` },
        { status: 502 }
      );
    }

    const { request_id } = await submitRes.json();
    if (!request_id) {
      return NextResponse.json({ error: "No request_id from FAL" }, { status: 502 });
    }

    // Step 3: Poll for completion (up to 4 minutes)
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
        // Step 4: Get the result
        const resultRes = await fetch(
          `https://queue.fal.run/fal-ai/aura-sr/requests/${request_id}`,
          { headers: { Authorization: `Key ${FAL_KEY}` } }
        );

        if (!resultRes.ok) {
          return NextResponse.json({ error: "Failed to fetch upscale result" }, { status: 502 });
        }

        const result = await resultRes.json();

        // Check for error in result
        if (result.detail) {
          console.error("[Upscale] FAL result error:", JSON.stringify(result.detail));
          return NextResponse.json(
            { error: "Upscale processing error" },
            { status: 502 }
          );
        }

        const upscaledUrl = result?.image?.url;
        if (!upscaledUrl) {
          console.error("[Upscale] No image in result:", JSON.stringify(result).slice(0, 500));
          return NextResponse.json({ error: "No image in upscale result" }, { status: 502 });
        }

        // Step 5: Download upscaled image, compress to JPEG, save to Supabase
        const upscaledRes = await fetch(upscaledUrl);
        if (!upscaledRes.ok) {
          return NextResponse.json({ error: "Failed to download upscaled image" }, { status: 502 });
        }

        const rawBuffer = Buffer.from(await upscaledRes.arrayBuffer());
        // Compress to JPEG to stay within storage limits (8192px PNG can be 50-100MB)
        const buffer = await sharp(rawBuffer)
          .jpeg({ quality: 92, mozjpeg: true })
          .toBuffer();
        const upscaledType = "image/jpeg";
        const storagePath = `ai-studio/upscaled-${Date.now()}.jpg`;

        const admin = createServiceRoleClient();
        const { error: uploadError } = await admin.storage
          .from("portfolio")
          .upload(storagePath, buffer, { contentType: upscaledType, upsert: true });

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
        console.error("[Upscale] FAL job failed:", JSON.stringify(status));
        return NextResponse.json({ error: "Upscale processing failed" }, { status: 502 });
      }
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
