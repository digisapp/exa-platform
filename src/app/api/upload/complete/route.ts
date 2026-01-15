import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { storagePath, bucket, uploadMeta } = await request.json();

    if (!storagePath || !bucket || !uploadMeta) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { modelId, actorId, isVideo, title, fileType, fileSize } = uploadMeta;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    // Determine asset_type based on file type
    const assetType = isVideo ? "video" : "portfolio";

    // Create media_asset record
    const { data: mediaAsset, error: mediaError } = await (supabase
      .from("media_assets") as any)
      .insert({
        owner_id: actorId,
        model_id: modelId,
        type: isVideo ? "video" : "photo",
        asset_type: assetType,
        photo_url: !isVideo ? publicUrl : null,
        url: publicUrl,
        storage_path: storagePath,
        mime_type: fileType,
        size_bytes: fileSize,
        title: title,
      })
      .select()
      .single();

    if (mediaError) {
      console.error("Media asset error:", mediaError);
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
