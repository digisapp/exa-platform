import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { processImage } from "@/lib/image-processing";
import { CHAT_MEDIA_BUCKET, signChatMediaUrl } from "@/lib/chat-media";

export const runtime = "nodejs";

const chatUploadCompleteSchema = z.object({
  storagePath: z.string().min(1),
  uploadMeta: z.object({
    isVideo: z.boolean().optional(),
    isAudio: z.boolean().optional(),
    fileType: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
  }),
});

// Admin client for verifying uploads exist
const adminClient = createServiceRoleClient();

// POST - Complete a chat media upload. Unlike /api/upload/complete (the
// portfolio pipeline), this deliberately does NOT insert into media_assets or
// content_items: chat media is private, and the old cross-post silently added
// every photo a model sent in a private chat to her public portfolio page.
// Returns the storage path (which the client sends as messages.media_url) and
// a fresh signed download URL so the sender's optimistic bubble renders.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Actor-scoped (fans may attach chat photos too), resolved server-side —
    // NEVER trust client-submitted IDs
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };
    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }
    const actorId = actor.id;

    const body = await request.json();
    const parsed = chatUploadCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { storagePath, uploadMeta } = parsed.data;

    // Security: Verify the storage path belongs to this user
    if (!storagePath.startsWith(`${actorId}/`)) {
      return NextResponse.json(
        { error: "Storage path does not belong to this user" },
        { status: 403 }
      );
    }

    // Verify the file actually exists in storage by checking file metadata
    const fileName = storagePath.replace(`${actorId}/`, "");
    const { data: files, error: listError } = await adminClient.storage
      .from(CHAT_MEDIA_BUCKET)
      .list(actorId, { limit: 100 });

    const fileExists = files?.some((f) => f.name === fileName);

    if (listError) {
      logger.error("Chat media storage list error", listError);
      // Don't block upload on list errors - the ownership check is the critical security gate
    } else if (!fileExists) {
      return NextResponse.json(
        { error: "File not found in storage. Please upload the file first." },
        { status: 400 }
      );
    }

    const { isVideo, isAudio, fileType } = uploadMeta;

    // Normalize image: bake EXIF orientation into pixels (and HEIC→JPEG).
    // Browser direct-uploads via signed URL skip server-side image processing,
    // so iPhone photos with an EXIF Orientation tag would otherwise render
    // sideways anywhere EXIF isn't honored. Same helper/params as
    // /api/upload/complete.
    if (!isVideo && !isAudio && fileType.startsWith("image/")) {
      try {
        const { data: blob, error: dlErr } = await adminClient.storage
          .from(CHAT_MEDIA_BUCKET)
          .download(storagePath);
        if (dlErr) throw dlErr;
        const buf = Buffer.from(await blob.arrayBuffer());
        const processed = await processImage(buf, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 90,
        });
        const { error: upErr } = await adminClient.storage
          .from(CHAT_MEDIA_BUCKET)
          .upload(storagePath, processed.buffer, {
            contentType: processed.contentType,
            cacheControl: "31536000",
            upsert: true,
          });
        if (upErr) throw upErr;
      } catch (normalizeError) {
        logger.error("[upload/chat/complete] Image normalize failed", normalizeError, {
          storage_path: storagePath,
          actor_id: actorId,
        });
        // Fall through — better to deliver the raw upload than to fail it
      }
    }

    // Fresh signed download URL (1h) so the sender's optimistic bubble renders
    // immediately; the message itself carries the storage path as media_url.
    const previewUrl = await signChatMediaUrl(adminClient, storagePath);
    if (!previewUrl) {
      return NextResponse.json(
        { error: "Failed to create preview URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path: storagePath,
      previewUrl,
    });
  } catch (error) {
    logger.error("Chat upload complete route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
