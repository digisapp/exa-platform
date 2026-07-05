import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { processImage, isProcessableImage } from "@/lib/image-processing";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Lets a pending applicant add a profile photo + bio while waiting for review.
// Values live on model_applications and are copied to the models row at
// approval, so she can go live on /models the moment she's approved.
export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_BIO_LENGTH = 1000;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "uploads", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const admin = createServiceRoleClient();

    // Only applicants with a pending application can use this endpoint
    const { data: application } = await admin
      .from("model_applications")
      .select("id, profile_photo_url")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ error: "No pending application found" }, { status: 400 });
    }

    const { data: actor } = await admin
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "No actor found" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;
    const bioRaw = formData.get("bio");

    const updates: Record<string, unknown> = {};

    if (typeof bioRaw === "string") {
      const bio = bioRaw.trim();
      if (bio.length > MAX_BIO_LENGTH) {
        return NextResponse.json(
          { error: `Bio must be ${MAX_BIO_LENGTH} characters or less` },
          { status: 400 }
        );
      }
      updates.bio = bio || null;
    }

    if (file && file.size > 0) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC" },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 15MB" },
          { status: 400 }
        );
      }

      const inputBuffer = Buffer.from(await file.arrayBuffer());

      // Same treatment as settings avatar uploads: strip EXIF, cap at 1200px
      let uploadBuffer: Buffer | Uint8Array = inputBuffer;
      let contentType = file.type;
      let width: number | null = null;
      let height: number | null = null;
      if (isProcessableImage(file.type)) {
        try {
          const processed = await processImage(inputBuffer, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 90,
          });
          uploadBuffer = processed.buffer;
          contentType = processed.contentType;
          width = processed.width;
          height = processed.height;
        } catch (processError) {
          logger.error("Application photo processing error, uploading original", processError);
        }
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const ext = extMap[contentType] || "jpg";
      const filename = `${actor.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(filename, uploadBuffer, {
          contentType,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) {
        logger.error("Application photo upload error", uploadError);
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: { publicUrl } } = admin.storage.from("avatars").getPublicUrl(filename);
      updates.profile_photo_url = publicUrl;
      updates.profile_photo_width = width;
      updates.profile_photo_height = height;

      // Replace, don't accumulate: drop the previous pending upload (only ever
      // this applicant's own path — it's derived from their photo URL)
      const previous = application.profile_photo_url;
      if (previous) {
        const prevPath = previous.split("/avatars/")[1];
        if (prevPath && prevPath.startsWith(`${actor.id}/`)) {
          await admin.storage.from("avatars").remove([prevPath]);
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await admin
      .from("model_applications")
      .update(updates)
      .eq("id", application.id);

    if (updateError) {
      logger.error("Application profile update error", updateError);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile_photo_url: (updates.profile_photo_url as string) ?? application.profile_photo_url ?? null,
    });
  } catch (error) {
    logger.error("Application profile error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
