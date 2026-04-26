import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { logger } from "@/lib/logger";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

/**
 * POST /api/admin/models/[id]/images
 *
 * Body: { type: "avatar" | "portrait", contentItemId: string }
 *
 * avatar   — sets profile_photo_url to the content item's media_url
 * portrait — sets is_primary=true on the content item (drives the hero portrait)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "general",
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, contentItemId, clear } = body as {
      type: "avatar" | "portrait";
      contentItemId?: string;
      clear?: boolean;
    };

    if (!type || !["avatar", "portrait"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'avatar' or 'portrait'" },
        { status: 400 }
      );
    }

    const adminDb = createServiceRoleClient();

    // Portrait clear operation — removes is_primary from all content items
    if (type === "portrait" && clear) {
      const { data: model } = await (adminDb as any)
        .from("models")
        .select("id")
        .eq("id", modelId)
        .single();
      if (!model) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }
      await (adminDb as any)
        .from("content_items")
        .update({ is_primary: false })
        .eq("model_id", modelId)
        .eq("is_primary", true);
      await logAdminAction({
        supabase,
        adminUserId: user.id,
        action: AdminActions.MODEL_PHOTO_UPDATED,
        targetType: "model",
        targetId: modelId,
        oldValues: {},
        newValues: { portrait: "cleared" },
      });
      return NextResponse.json({ success: true });
    }

    if (!contentItemId || typeof contentItemId !== "string") {
      return NextResponse.json(
        { error: "contentItemId is required" },
        { status: 400 }
      );
    }

    // Verify model exists
    const { data: model } = await (adminDb as any)
      .from("models")
      .select("id, profile_photo_url")
      .eq("id", modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Verify the content item belongs to this model and is an image
    const { data: item } = await (adminDb as any)
      .from("content_items")
      .select("id, media_url, media_type")
      .eq("id", contentItemId)
      .eq("model_id", modelId)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: "Content item not found" },
        { status: 404 }
      );
    }

    if (item.media_type !== "image") {
      return NextResponse.json(
        { error: "Content item must be an image" },
        { status: 400 }
      );
    }

    if (type === "avatar") {
      const oldUrl = model.profile_photo_url;

      const { error: updateError } = await (adminDb as any)
        .from("models")
        .update({
          profile_photo_url: item.media_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", modelId);

      if (updateError) {
        logger.error("[Admin Images] Avatar update error", updateError);
        return NextResponse.json(
          { error: "Failed to update avatar" },
          { status: 500 }
        );
      }

      await logAdminAction({
        supabase,
        adminUserId: user.id,
        action: AdminActions.MODEL_PHOTO_UPDATED,
        targetType: "model",
        targetId: modelId,
        oldValues: { profile_photo_url: oldUrl },
        newValues: { profile_photo_url: item.media_url, source: "content-portfolio" },
      });

      return NextResponse.json({ success: true, url: item.media_url });
    }

    // type === "portrait" — set is_primary on the content item
    // Clear existing primary for this model first
    await (adminDb as any)
      .from("content_items")
      .update({ is_primary: false })
      .eq("model_id", modelId)
      .eq("is_primary", true);

    const { error: setPrimaryError } = await (adminDb as any)
      .from("content_items")
      .update({ is_primary: true })
      .eq("id", contentItemId)
      .eq("model_id", modelId);

    if (setPrimaryError) {
      logger.error("[Admin Images] Portrait set-primary error", setPrimaryError);
      return NextResponse.json(
        { error: "Failed to set portrait" },
        { status: 500 }
      );
    }

    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.MODEL_PHOTO_UPDATED,
      targetType: "model",
      targetId: modelId,
      oldValues: {},
      newValues: { portrait_content_item_id: contentItemId, portrait_url: item.media_url },
    });

    return NextResponse.json({ success: true, url: item.media_url });
  } catch (error) {
    logger.error("[Admin Images] Route error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
