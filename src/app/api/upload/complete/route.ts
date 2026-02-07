import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const uploadCompleteSchema = z.object({
  storagePath: z.string().min(1),
  bucket: z.string().min(1),
  uploadMeta: z.object({
    isVideo: z.boolean().optional(),
    isAudio: z.boolean().optional(),
    title: z.string().nullish(),
    fileType: z.string().min(1),
    fileSize: z.number().int().nonnegative(),
  }),
});

// Admin client for verifying uploads exist
const adminClient = createServiceRoleClient();

// POST - Complete the upload by creating the media asset record
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

    // Get model and actor IDs server-side - NEVER trust client-submitted IDs
    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

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
    const parsed = uploadCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { storagePath, bucket, uploadMeta } = parsed.data;

    // Security: Verify the storage path belongs to this user
    if (!storagePath.startsWith(`${modelId}/`)) {
      return NextResponse.json(
        { error: "Storage path does not belong to this user" },
        { status: 403 }
      );
    }

    // Verify the file actually exists in storage by checking file metadata
    const fileName = storagePath.replace(`${modelId}/`, "");
    const { data: files, error: listError } = await adminClient.storage
      .from(bucket)
      .list(modelId, { limit: 100 });

    const fileExists = files?.some((f) => f.name === fileName);

    if (listError) {
      console.error("Storage list error:", listError);
      // Don't block upload on list errors - the ownership check is the critical security gate
    } else if (!fileExists) {
      return NextResponse.json(
        { error: "File not found in storage. Please upload the file first." },
        { status: 400 }
      );
    }

    const { isVideo, isAudio, title, fileType, fileSize } = uploadMeta;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    // Determine asset_type based on file type
    const assetType = isVideo ? "video" : isAudio ? "audio" : "portfolio";

    // Determine the media type
    const mediaTypeValue = isVideo ? "video" : isAudio ? "audio" : "photo";

    // Create media_asset record using admin client to bypass RLS
    // This ensures the INSERT cannot fail due to RLS policy issues
    const insertData = {
      owner_id: actorId,
      model_id: modelId,
      type: mediaTypeValue,
      asset_type: assetType,
      photo_url: !isVideo && !isAudio ? publicUrl : null,
      url: publicUrl,
      storage_path: storagePath,
      mime_type: fileType,
      size_bytes: fileSize,
      title: title,
    };

    const { data: mediaAsset, error: mediaError } = await adminClient
      .from("media_assets")
      .insert(insertData)
      .select()
      .single();

    if (mediaError) {
      // Log detailed error info for debugging
      console.error("Media asset INSERT failed:", {
        error: mediaError,
        user_id: user.id,
        model_id: modelId,
        actor_id: actorId,
        storage_path: storagePath,
        bucket,
      });
      return NextResponse.json(
        { error: `Failed to save media record: ${mediaError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaAsset,
      assetType,
    });
  } catch (error) {
    console.error("Upload complete route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
