import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const maxDuration = 120;

const FAL_KEY = process.env.FAL_KEY;
const UPSCALE_MODEL = "fal-ai/aura-sr";

const requestSchema = z.object({
  image_url: z.string().url(),
  scale: z.enum(["2x", "4x"]).default("4x"),
});

/**
 * POST /api/admin/ai-studio/upscale
 * Upscales an image using FAL.ai's Aura SR model (up to 4x).
 * Saves the result to Supabase storage and returns the permanent URL.
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

  try {
    // Call FAL.ai upscaler
    const falRes = await fetch(`https://fal.run/${UPSCALE_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url,
        upscale_factor: scale === "4x" ? 4 : 2,
        overlapping_tiles: true,
        checkpoint: "v2",
      }),
    });

    if (!falRes.ok) {
      const errorText = await falRes.text().catch(() => "Unknown error");
      console.error("[Upscale] FAL error:", errorText);
      return NextResponse.json(
        { error: `Upscale failed: ${falRes.status}` },
        { status: 502 }
      );
    }

    const falData = await falRes.json();
    const upscaledUrl = falData.image?.url;

    if (!upscaledUrl) {
      return NextResponse.json({ error: "No image returned from upscaler" }, { status: 502 });
    }

    // Download the upscaled image
    const imgRes = await fetch(upscaledUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to download upscaled image" }, { status: 502 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/png";
    const buffer = new Uint8Array(await imgRes.arrayBuffer());
    const ext = contentType.includes("png") ? "png" : "jpg";
    const storagePath = `ai-studio/upscaled-${Date.now()}.${ext}`;

    // Save to Supabase storage
    const admin = createServiceRoleClient();
    const { error: uploadError } = await admin.storage
      .from("portfolio")
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) {
      console.error("[Upscale] Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to save upscaled image" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("portfolio").getPublicUrl(storagePath);

    const savedUrl = `${publicUrl}?v=${Date.now()}`;

    // Get approximate dimensions
    const dimensions = scale === "4x"
      ? { note: "4x upscaled (~8192px for 2k source)" }
      : { note: "2x upscaled (~4096px for 2k source)" };

    return NextResponse.json({
      saved_url: savedUrl,
      ...dimensions,
    });
  } catch (error: any) {
    console.error("[Upscale] Error:", error);
    return NextResponse.json(
      { error: error.message || "Upscale failed" },
      { status: 500 }
    );
  }
}
