import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest) {
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

    // Fetch all items for counts
    const { data: items, error: itemsError } = await service
      .from("content_items")
      .select("id, status, unlock_count, title, media_type, coin_price, publish_at")
      .eq("model_id", modelId);

    if (itemsError) {
      logger.error("Stats items query error", itemsError);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    const allItems = items || [];
    const now = new Date().toISOString();

    const totalItems = allItems.length;
    const portfolioCount = allItems.filter((i: any) => i.status === "portfolio").length;
    const exclusiveCount = allItems.filter((i: any) => i.status === "exclusive").length;
    const privateCount = allItems.filter((i: any) => i.status === "private").length;
    const totalUnlocks = allItems.reduce((sum: number, i: any) => sum + (i.unlock_count || 0), 0);
    const scheduledCount = allItems.filter((i: any) => i.publish_at && i.publish_at > now).length;

    // Top items by unlock_count
    const topItems = [...allItems]
      .sort((a: any, b: any) => (b.unlock_count || 0) - (a.unlock_count || 0))
      .slice(0, 5)
      .map((i: any) => ({
        id: i.id,
        title: i.title,
        media_type: i.media_type,
        coin_price: i.coin_price,
        unlock_count: i.unlock_count || 0,
      }));

    // Total revenue from purchases of this model's content
    const itemIds = allItems.map((i: any) => i.id);

    let totalRevenue = 0;

    if (itemIds.length > 0) {
      const { data: itemPurchases } = await service
        .from("content_purchases")
        .select("coins_spent")
        .in("item_id", itemIds);

      if (itemPurchases) {
        totalRevenue += itemPurchases.reduce((sum: number, p: any) => sum + (p.coins_spent || 0), 0);
      }
    }

    // Revenue from set purchases
    const { data: sets } = await service
      .from("content_sets")
      .select("id")
      .eq("model_id", modelId);

    const setIds = (sets || []).map((s: any) => s.id);

    if (setIds.length > 0) {
      const { data: setPurchases } = await service
        .from("content_purchases")
        .select("coins_spent")
        .in("set_id", setIds);

      if (setPurchases) {
        totalRevenue += setPurchases.reduce((sum: number, p: any) => sum + (p.coins_spent || 0), 0);
      }
    }

    return NextResponse.json({
      total_items: totalItems,
      portfolio_count: portfolioCount,
      exclusive_count: exclusiveCount,
      private_count: privateCount,
      total_unlocks: totalUnlocks,
      total_revenue: totalRevenue,
      top_items: topItems,
      sets_count: setIds.length,
      scheduled_count: scheduledCount,
    });
  } catch (error) {
    logger.error("Content stats error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
