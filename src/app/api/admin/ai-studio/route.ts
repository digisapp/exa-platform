import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { generateImages, editImage, editMultipleImages, downloadImage } from "@/lib/xai-image";
import { z } from "zod";

export const maxDuration = 120;

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000),
  model: z.enum(["grok-imagine-image", "grok-imagine-image-pro"]),
  n: z.number().int().min(1).max(10).default(1),
  aspect_ratio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "2:1", "1:2", "auto"])
    .default("1:1"),
  resolution: z.enum(["1k", "2k"]).default("1k"),
  mode: z.enum(["generate", "edit", "style-transfer"]).default("generate"),
  image_url: z.string().url().optional(),
  image_urls: z.array(z.string().url()).max(5).optional(),
  save_to_storage: z.boolean().default(false),
});

/**
 * POST /api/admin/ai-studio
 * Generate, edit, or style-transfer images via xAI Grok
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

  // Rate limit: 30/min to stay within xAI pro model limits
  const rateLimited = await checkEndpointRateLimit(request, "uploads", user.id);
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prompt, model, n, aspect_ratio, resolution, mode, image_url, image_urls, save_to_storage } =
    parsed.data;

  // Validate edit modes have source images
  if ((mode === "edit" || mode === "style-transfer") && !image_url && (!image_urls || image_urls.length === 0)) {
    return NextResponse.json(
      { error: "Source image required for edit/style-transfer mode" },
      { status: 400 }
    );
  }

  try {
    let result;

    if (image_urls && image_urls.length > 1) {
      // Multi-image editing
      result = await editMultipleImages({
        prompt,
        model,
        n,
        aspect_ratio,
        resolution,
        image_urls,
      });
    } else if (image_url || (image_urls && image_urls.length === 1)) {
      // Single image editing / style transfer
      result = await editImage({
        prompt,
        model,
        n,
        aspect_ratio,
        resolution,
        image_url: image_url || image_urls![0],
      });
    } else {
      // Pure generation
      result = await generateImages({
        prompt,
        model,
        n,
        aspect_ratio,
        resolution,
      });
    }

    // Optionally save to Supabase storage
    const images = await Promise.all(
      result.data.map(async (img, i) => {
        let saved_url: string | undefined;

        if (save_to_storage && img.url) {
          try {
            const admin = createServiceRoleClient();
            const { buffer, contentType } = await downloadImage(img.url);
            const ext = contentType.includes("png") ? "png" : "jpg";
            const storagePath = `ai-studio/${Date.now()}-${i}.${ext}`;

            const { error: uploadError } = await admin.storage
              .from("portfolio")
              .upload(storagePath, buffer, { contentType, upsert: true });

            if (!uploadError) {
              const {
                data: { publicUrl },
              } = admin.storage.from("portfolio").getPublicUrl(storagePath);
              saved_url = `${publicUrl}?v=${Date.now()}`;
            }
          } catch (err) {
            // Non-fatal: image was generated but save failed
            console.error("Failed to save image to storage:", err);
          }
        }

        return {
          url: img.url,
          saved_url,
          respect_moderation: img.respect_moderation,
        };
      })
    );

    return NextResponse.json({ images, model, prompt });
  } catch (error: any) {
    const message = error?.message || "Image generation failed";
    const status = message.includes("429") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
