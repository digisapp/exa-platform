import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { submitVideoGeneration, getVideoStatus, downloadImage } from "@/lib/xai-image";
import { z } from "zod";

// Video generation can take several minutes
export const maxDuration = 600;

const videoSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000),
  duration: z.number().int().min(1).max(15).default(5),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]).default("16:9"),
  resolution: z.enum(["480p", "720p"]).default("720p"),
  image_url: z.string().optional(),
  save_to_storage: z.boolean().default(false),
});

const statusSchema = z.object({
  request_id: z.string().min(1),
  save_to_storage: z.boolean().default(false),
});

const saveSchema = z.object({
  save_url: z.string().url(),
});

/**
 * POST /api/admin/ai-studio/video
 * Submit video generation or check status
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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Save an existing media URL to storage
  if (body.save_url) {
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    try {
      const admin = createServiceRoleClient();
      const { buffer, contentType } = await downloadImage(parsed.data.save_url);
      const isVideoContent = contentType.includes("video") || parsed.data.save_url.includes(".mp4");
      const ext = isVideoContent ? "mp4" : "png";
      const storagePath = `ai-studio/${isVideoContent ? "video" : "img"}-${Date.now()}.${ext}`;

      const { error: uploadError } = await admin.storage
        .from("portfolio")
        .upload(storagePath, buffer, {
          contentType: isVideoContent ? "video/mp4" : contentType,
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = admin.storage.from("portfolio").getPublicUrl(storagePath);

      return NextResponse.json({ saved_url: `${publicUrl}?v=${Date.now()}` });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Save failed" }, { status: 500 });
    }
  }

  // Check if this is a status poll or a new generation
  if (body.request_id) {
    // Status polling
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const status = await getVideoStatus(parsed.data.request_id);

      // If done and save requested, save to storage
      if (status.status === "done" && status.video?.url && parsed.data.save_to_storage) {
        try {
          const admin = createServiceRoleClient();
          const { buffer, contentType } = await downloadImage(status.video.url);
          const storagePath = `ai-studio/video-${Date.now()}.mp4`;

          const { error: uploadError } = await admin.storage
            .from("portfolio")
            .upload(storagePath, buffer, { contentType: contentType || "video/mp4", upsert: true });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = admin.storage.from("portfolio").getPublicUrl(storagePath);
            return NextResponse.json({
              ...status,
              saved_url: `${publicUrl}?v=${Date.now()}`,
            });
          }
        } catch (err) {
          console.error("Failed to save video to storage:", err);
        }
      }

      return NextResponse.json(status);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // New video generation
  const parsed = videoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const requestId = await submitVideoGeneration({
      prompt: parsed.data.prompt,
      duration: parsed.data.duration,
      aspect_ratio: parsed.data.aspect_ratio,
      resolution: parsed.data.resolution,
      image_url: parsed.data.image_url,
    });

    return NextResponse.json({ request_id: requestId });
  } catch (error: any) {
    const message = error?.message || "Video generation failed";
    const status = message.includes("429") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
