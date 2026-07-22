import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  CONTENT_MEDIA_BUCKET,
  isContentMediaPath,
  signContentMediaUrls,
  syncContentItemStorageForStatus,
} from "@/lib/content-media";
import { CONTENT_PRICE_MAX_COINS, CONTENT_UNLOCK_MIN_COINS } from "@/lib/coin-config";

const updateItemSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["private", "portfolio", "exclusive"]).optional(),
  coin_price: z.number().int().min(0).max(CONTENT_PRICE_MAX_COINS).optional(),
  tags: z.array(z.string()).optional().nullable(),
  publish_at: z.string().datetime().optional().nullable(),
  set_id: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await service
      .from("content_items")
      .select("id, model_id, status, coin_price, media_url")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existing.model_id !== modelId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = updateItemSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Reject a resulting sub-floor paid state instead of silently hiding the
    // item (fan-facing queries filter coin_price > 0). Forward-only floor:
    // editing a grandfathered sub-floor item forces re-pricing to the floor.
    const nextStatus = parsed.data.status ?? existing.status;
    const nextPrice = parsed.data.coin_price ?? existing.coin_price ?? 0;
    if (nextStatus === "exclusive" && nextPrice < CONTENT_UNLOCK_MIN_COINS) {
      return NextResponse.json(
        { error: `Paid content needs a coin price of at least ${CONTENT_UNLOCK_MIN_COINS}` },
        { status: 400 }
      );
    }

    // Status flips move the object between the public portfolio bucket and the
    // private content-media bucket so paid originals stay unfetchable and free
    // items keep resolving as plain public paths (src/lib/content-media.ts).
    let movedMediaUrl: string | null = null;
    if (parsed.data.status && parsed.data.status !== existing.status) {
      try {
        movedMediaUrl = await syncContentItemStorageForStatus(
          service,
          existing.media_url,
          parsed.data.status
        );
      } catch (moveError) {
        logger.error("Content item media move failed", moveError, {
          item_id: id,
          model_id: modelId,
          next_status: parsed.data.status,
        });
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
      }
    }

    const { data: item, error } = await service
      .from("content_items")
      .update({
        ...parsed.data,
        ...(movedMediaUrl ? { media_url: movedMediaUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Content item update error", error);
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    // Sign private-bucket paths so the studio can render the updated item
    const [signedItem] = await signContentMediaUrls(service, [item]);

    return NextResponse.json({ item: signedItem });
  } catch (error) {
    logger.error("Content item PATCH error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    // Verify ownership and get media_url for cleanup
    const { data: existing, error: fetchError } = await service
      .from("content_items")
      .select("id, model_id, media_url, preview_url")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existing.model_id !== modelId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from content_items
    const { error } = await service
      .from("content_items")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Content item delete error", error);
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }

    // Clean up matching media_assets record
    if (existing.media_url) {
      await service
        .from("media_assets")
        .delete()
        .eq("model_id", modelId)
        .or(`url.eq.${existing.media_url},photo_url.eq.${existing.media_url},storage_path.eq.${existing.media_url}`);
    }

    // Clean up storage files (media + generated preview), routed to the bucket
    // each path lives in (private content-media vs public portfolio)
    const allPaths = [existing.media_url, existing.preview_url]
      .filter(Boolean)
      .map((url: string) =>
        url.startsWith("http") ? url.split("/portfolio/").pop() : url,
      )
      .filter(Boolean) as string[];
    const privatePaths = allPaths.filter((p) => isContentMediaPath(p));
    const publicPaths = allPaths.filter((p) => !isContentMediaPath(p));
    if (privatePaths.length > 0) {
      await service.storage.from(CONTENT_MEDIA_BUCKET).remove(privatePaths);
    }
    if (publicPaths.length > 0) {
      await service.storage.from("portfolio").remove(publicPaths);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Content item DELETE error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
