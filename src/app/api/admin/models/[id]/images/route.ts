import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { logger } from "@/lib/logger";
import { isContentMediaPath } from "@/lib/content-media";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * POST /api/admin/models/[id]/images
 *
 * Body: { type: "avatar" | "portrait", contentItemId: string }
 *
 * avatar   — sets profile_photo_url to the content item's media_url
 * portrait — sets is_primary=true on the content item (drives the hero portrait)
 */
export const POST = withAuth<{ id: string }>(
  async ({ request, params, user, supabase }) => {
    const { id: modelId } = params;

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

    // Paid media lives in the private content-media bucket — it has no public
    // URL and must not be copied onto a public profile field (fail closed)
    if (isContentMediaPath(item.media_url)) {
      return NextResponse.json(
        { error: "Exclusive (paid) content can't be used as a profile image" },
        { status: 400 }
      );
    }

    if (type === "avatar") {
      const oldUrl = model.profile_photo_url;

      const resolvedAvatarUrl = item.media_url.startsWith("http")
        ? item.media_url
        : adminDb.storage.from("portfolio").getPublicUrl(item.media_url).data.publicUrl;

      const { error: updateError } = await (adminDb as any)
        .from("models")
        .update({
          profile_photo_url: resolvedAvatarUrl,
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
        newValues: { profile_photo_url: resolvedAvatarUrl, source: "content-portfolio" },
      });

      return NextResponse.json({ success: true, url: resolvedAvatarUrl });
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
  },
  { requireType: "admin", rateLimit: "general" }
);
