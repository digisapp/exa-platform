import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  CONTENT_MEDIA_BUCKET,
  isContentMediaPath,
  syncContentItemStorageForStatus,
} from "@/lib/content-media";
import { CONTENT_PRICE_MAX_COINS, CONTENT_UNLOCK_MIN_COINS } from "@/lib/coin-config";

const bulkSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(50),
    action: z.enum(["update_status", "update_price", "delete", "add_tag", "remove_tag", "set_set"]),
    status: z.enum(["private", "portfolio", "exclusive"]).optional(),
    coin_price: z.number().int().min(0).max(CONTENT_PRICE_MAX_COINS).optional(),
    tag: z.string().optional(),
    set_id: z.string().uuid().nullable().optional(),
  })
  // Flipping items to Pay to Unlock must carry an at-or-above-floor price in
  // the same call — otherwise items keep their old price (often 0, which every
  // fan-facing query filters out). The studio UI always sends both together.
  .refine(
    (d) =>
      !(d.action === "update_status" && d.status === "exclusive") ||
      (d.coin_price !== undefined && d.coin_price >= CONTENT_UNLOCK_MIN_COINS),
    {
      message: `Paid content needs a coin price of at least ${CONTENT_UNLOCK_MIN_COINS}`,
      path: ["coin_price"],
    }
  );

export async function POST(request: NextRequest) {
  try {
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

    const rawBody = await request.json();
    const parsed = bulkSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ids, action, status, coin_price, tag, set_id } = parsed.data;

    // Verify all items belong to this model
    const { data: items, error: fetchError } = await service
      .from("content_items")
      .select("id, model_id, tags, status, media_url")
      .in("id", ids);

    if (fetchError) {
      logger.error("Bulk fetch error", fetchError);
      return NextResponse.json({ error: "Failed to verify items" }, { status: 500 });
    }

    if (!items || items.length !== ids.length) {
      return NextResponse.json({ error: "One or more items not found" }, { status: 404 });
    }

    const unauthorized = items.some((item: any) => item.model_id !== modelId);
    if (unauthorized) {
      return NextResponse.json({ error: "Forbidden: not all items belong to you" }, { status: 403 });
    }

    let error: any = null;

    switch (action) {
      case "update_status": {
        if (!status) {
          return NextResponse.json({ error: "status is required for update_status" }, { status: 400 });
        }
        // Setting items to PPV without a price leaves them invisible to fans
        // (fan queries filter coin_price > 0), so the UI sends both together.
        // Per item: status flips move the object between the public portfolio
        // bucket and the private content-media bucket (src/lib/content-media.ts),
        // so update row-by-row and never flip a row whose move failed.
        const updatedAt = new Date().toISOString();
        const results = await Promise.all(
          items.map(async (item: any) => {
            let movedMediaUrl: string | null = null;
            if (status !== item.status) {
              try {
                movedMediaUrl = await syncContentItemStorageForStatus(
                  service,
                  item.media_url,
                  status
                );
              } catch (moveError) {
                logger.error("Bulk media move failed", moveError, {
                  item_id: item.id,
                  model_id: modelId,
                  next_status: status,
                });
                return { error: moveError };
              }
            }
            return service
              .from("content_items")
              .update({
                status,
                ...(status === "exclusive" && coin_price !== undefined ? { coin_price } : {}),
                ...(movedMediaUrl ? { media_url: movedMediaUrl } : {}),
                updated_at: updatedAt,
              })
              .eq("id", item.id);
          }),
        );
        const failed = results.find((r: any) => r.error);
        if (failed?.error) error = failed.error;
        break;
      }
      case "update_price": {
        if (coin_price === undefined) {
          return NextResponse.json({ error: "coin_price is required for update_price" }, { status: 400 });
        }
        // Items that are Pay to Unlock must stay at or above the content floor
        if (
          coin_price < CONTENT_UNLOCK_MIN_COINS &&
          items.some((item: any) => item.status === "exclusive")
        ) {
          return NextResponse.json(
            { error: `Paid content needs a coin price of at least ${CONTENT_UNLOCK_MIN_COINS}` },
            { status: 400 }
          );
        }
        ({ error } = await service
          .from("content_items")
          .update({ coin_price, updated_at: new Date().toISOString() })
          .in("id", ids));
        break;
      }
      case "delete": {
        // Fetch media_urls before deleting for storage cleanup
        const { data: itemsToDelete } = await service
          .from("content_items")
          .select("id, media_url, preview_url")
          .in("id", ids);

        // Delete from content_items
        ({ error } = await service
          .from("content_items")
          .delete()
          .in("id", ids));

        // Clean up storage files and media_assets (non-blocking)
        if (!error && itemsToDelete) {
          const mediaUrls = itemsToDelete
            .map((item: any) => item.media_url)
            .filter(Boolean);

          // Extract storage paths for deletion (media + generated previews)
          const storagePaths = itemsToDelete
            .flatMap((item: any) => [item.media_url, item.preview_url])
            .filter(Boolean)
            .map((url: string) => {
              if (!url.startsWith("http")) return url;
              const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
              return match ? match[1] : null;
            })
            .filter(Boolean) as string[];

          if (storagePaths.length > 0) {
            // Route each path to the bucket it lives in (private content-media
            // for new exclusive uploads, public portfolio for everything else)
            const privatePaths = storagePaths.filter((p) => isContentMediaPath(p));
            const publicPaths = storagePaths.filter((p) => !isContentMediaPath(p));
            if (privatePaths.length > 0) {
              await service.storage.from(CONTENT_MEDIA_BUCKET).remove(privatePaths);
            }
            if (publicPaths.length > 0) {
              await service.storage.from("portfolio").remove(publicPaths);
            }
          }

          // Clean up matching media_assets. Run the per-URL deletes in parallel
          // instead of awaiting each one — bulk is bounded to 50 items, and signed
          // URLs contain commas/quotes that break PostgREST's `or().in.()` quoting.
          if (mediaUrls.length > 0) {
            await Promise.all(
              mediaUrls.map((url: string) =>
                service
                  .from("media_assets")
                  .delete()
                  .eq("model_id", modelId)
                  .or(`url.eq.${url},photo_url.eq.${url},storage_path.eq.${url}`),
              ),
            );
          }
        }
        break;
      }
      case "add_tag": {
        if (!tag) {
          return NextResponse.json({ error: "tag is required for add_tag" }, { status: 400 });
        }
        const updatedAt = new Date().toISOString();
        const updates = items
          .filter((item: any) => !(item.tags || []).includes(tag))
          .map((item: any) =>
            service
              .from("content_items")
              .update({ tags: [...(item.tags || []), tag], updated_at: updatedAt })
              .eq("id", item.id),
          );
        const results = await Promise.all(updates);
        const failed = results.find((r: any) => r.error);
        if (failed?.error) error = failed.error;
        break;
      }
      case "remove_tag": {
        if (!tag) {
          return NextResponse.json({ error: "tag is required for remove_tag" }, { status: 400 });
        }
        const updatedAt = new Date().toISOString();
        const updates = items
          .filter((item: any) => (item.tags || []).includes(tag))
          .map((item: any) =>
            service
              .from("content_items")
              .update({
                tags: (item.tags || []).filter((t: string) => t !== tag),
                updated_at: updatedAt,
              })
              .eq("id", item.id),
          );
        const results = await Promise.all(updates);
        const failed = results.find((r: any) => r.error);
        if (failed?.error) error = failed.error;
        break;
      }
      case "set_set": {
        ({ error } = await service
          .from("content_items")
          .update({ set_id: set_id ?? null, updated_at: new Date().toISOString() })
          .in("id", ids));
        break;
      }
    }

    if (error) {
      logger.error("Bulk action error", error);
      return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
    }

    return NextResponse.json({ success: true, affected: ids.length });
  } catch (error) {
    logger.error("Bulk action error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
