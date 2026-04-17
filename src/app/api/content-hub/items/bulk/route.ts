import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(["update_status", "update_price", "delete", "add_tag", "remove_tag", "set_set"]),
  status: z.enum(["private", "portfolio", "exclusive"]).optional(),
  coin_price: z.number().int().min(0).max(10000).optional(),
  tag: z.string().optional(),
  set_id: z.string().uuid().nullable().optional(),
});

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
      .select("id, model_id, tags")
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
        ({ error } = await service
          .from("content_items")
          .update({ status, updated_at: new Date().toISOString() })
          .in("id", ids));
        break;
      }
      case "update_price": {
        if (coin_price === undefined) {
          return NextResponse.json({ error: "coin_price is required for update_price" }, { status: 400 });
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
          .select("id, media_url")
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

          // Extract storage paths for deletion
          const storagePaths = mediaUrls
            .map((url: string) => {
              if (!url.startsWith("http")) return url;
              const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
              return match ? match[1] : null;
            })
            .filter(Boolean) as string[];

          if (storagePaths.length > 0) {
            await service.storage.from("portfolio").remove(storagePaths);
          }

          // Clean up matching media_assets records
          for (const url of mediaUrls) {
            await service
              .from("media_assets")
              .delete()
              .eq("model_id", modelId)
              .or(`url.eq.${url},photo_url.eq.${url},storage_path.eq.${url}`);
          }
        }
        break;
      }
      case "add_tag": {
        if (!tag) {
          return NextResponse.json({ error: "tag is required for add_tag" }, { status: 400 });
        }
        // Update each item's tags individually to append
        for (const item of items) {
          const currentTags: string[] = item.tags || [];
          if (!currentTags.includes(tag)) {
            await service
              .from("content_items")
              .update({ tags: [...currentTags, tag], updated_at: new Date().toISOString() })
              .eq("id", item.id);
          }
        }
        break;
      }
      case "remove_tag": {
        if (!tag) {
          return NextResponse.json({ error: "tag is required for remove_tag" }, { status: 400 });
        }
        for (const item of items) {
          const currentTags: string[] = item.tags || [];
          const newTags = currentTags.filter((t: string) => t !== tag);
          await service
            .from("content_items")
            .update({ tags: newTags, updated_at: new Date().toISOString() })
            .eq("id", item.id);
        }
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
