import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { gptImageGenerate, gptImageEdit } from "@/lib/fal-image";
import { z } from "zod";

export const maxDuration = 300;

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000),
  mode: z.enum(["generate", "edit"]).default("generate"),
  image_urls: z.array(z.string()).max(5).optional(),
  mask_image_url: z.string().optional(),
  image_size: z
    .enum(["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"])
    .default("auto"),
  quality: z.enum(["low", "medium", "high"]).default("high"),
  num_images: z.number().int().min(1).max(4).default(1),
  output_format: z.enum(["png", "jpeg", "webp"]).default("png"),
  save_to_storage: z.boolean().default(false),
});

/**
 * POST /api/admin/ai-studio/gpt-image
 * Generate or edit images via GPT Image 2 on fal.ai
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prompt, mode, image_urls, mask_image_url, image_size, quality, num_images, output_format, save_to_storage } =
    parsed.data;

  // Validate edit mode has source images
  if (mode === "edit" && (!image_urls || image_urls.length === 0)) {
    return NextResponse.json(
      { error: "Source image(s) required for edit mode" },
      { status: 400 }
    );
  }

  try {
    // Upload any data URIs to Supabase storage so fal can access them
    const resolvedImageUrls = image_urls
      ? await Promise.all(image_urls.map((url) => resolveDataUri(url)))
      : undefined;
    const resolvedMask = mask_image_url
      ? await resolveDataUri(mask_image_url)
      : undefined;

    let result;

    if (mode === "edit" && resolvedImageUrls && resolvedImageUrls.length > 0) {
      result = await gptImageEdit({
        prompt,
        image_urls: resolvedImageUrls,
        image_size,
        quality,
        num_images,
        output_format,
        mask_image_url: resolvedMask,
      });
    } else {
      result = await gptImageGenerate({
        prompt,
        image_size,
        quality,
        num_images,
        output_format,
      });
    }

    // Optionally save to Supabase storage
    const images = await Promise.all(
      result.images.map(async (img, i) => {
        let saved_url: string | undefined;

        if (save_to_storage && img.url) {
          try {
            const admin = createServiceRoleClient();
            const dlRes = await fetch(img.url);
            if (!dlRes.ok) throw new Error("Download failed");

            const buffer = new Uint8Array(await dlRes.arrayBuffer());
            const ext = output_format === "jpeg" ? "jpg" : output_format;
            const storagePath = `ai-studio/gpt-${Date.now()}-${i}.${ext}`;

            const contentType = img.content_type || `image/${output_format}`;
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
            console.error("Failed to save GPT Image 2 result to storage:", err);
          }
        }

        return {
          url: img.url,
          saved_url,
          width: img.width,
          height: img.height,
        };
      })
    );

    return NextResponse.json({ images, prompt, quality });
  } catch (error: any) {
    const message = error?.message || "GPT Image 2 generation failed";
    const status = message.includes("429") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * If the string is a data URI, upload it to Supabase storage and return a public URL.
 * Otherwise return the string as-is (already a URL).
 */
async function resolveDataUri(input: string): Promise<string> {
  if (!input.startsWith("data:")) return input;

  const match = input.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return input;

  const contentType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
  const storagePath = `ai-studio/tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const admin = createServiceRoleClient();
  const { error } = await admin.storage
    .from("portfolio")
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Failed to upload source image: ${error.message}`);

  const {
    data: { publicUrl },
  } = admin.storage.from("portfolio").getPublicUrl(storagePath);

  return publicUrl;
}
