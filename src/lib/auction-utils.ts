import type { BidWithBidder } from "@/types/auctions";

/**
 * Batch-enrich bids with bidder info (model/fan name + avatar).
 * Replaces N+1 individual queries with 2 batch queries.
 */
export async function enrichBidsWithBidderInfo(
  supabase: any,
  bids: any[]
): Promise<BidWithBidder[]> {
  if (!bids?.length) return [];

  // Separate bidder IDs by type
  const modelIds: string[] = [];
  const fanIds: string[] = [];

  for (const bid of bids) {
    const bidderId = bid.bidder?.id || bid.bidder_id;
    if (!bidderId) continue;

    if (bid.bidder?.type === "model") {
      modelIds.push(bidderId);
    } else if (bid.bidder?.type === "fan") {
      fanIds.push(bidderId);
    }
  }

  // Batch fetch model and fan info in parallel
  const uniqueModelIds = [...new Set(modelIds)];
  const uniqueFanIds = [...new Set(fanIds)];

  const [modelsResult, fansResult] = await Promise.all([
    uniqueModelIds.length > 0
      ? supabase
          .from("models")
          .select("id, first_name, last_name, profile_photo_url")
          .in("id", uniqueModelIds)
      : { data: [] },
    uniqueFanIds.length > 0
      ? supabase
          .from("fans")
          .select("id, display_name, username, profile_photo_url")
          .in("id", uniqueFanIds)
      : { data: [] },
  ]);

  // Create lookup maps
  const modelMap = new Map<string, any>(
    (modelsResult.data || []).map((m: any) => [m.id, m])
  );
  const fanMap = new Map<string, any>(
    (fansResult.data || []).map((f: any) => [f.id, f])
  );

  // Enrich bids
  return bids.map((bid: any) => {
    let bidderInfo = null;
    const bidderId = bid.bidder?.id || bid.bidder_id;

    if (bid.bidder?.type === "model") {
      const model = modelMap.get(bidderId);
      if (model) {
        bidderInfo = {
          id: bidderId,
          display_name: model.first_name
            ? `${model.first_name} ${model.last_name || ""}`.trim()
            : null,
          profile_image_url: model.profile_photo_url,
          type: "model",
        };
      }
    } else if (bid.bidder?.type === "fan") {
      const fan = fanMap.get(bidderId);
      if (fan) {
        bidderInfo = {
          id: bidderId,
          display_name: fan.display_name || fan.username || "Anonymous",
          profile_image_url: fan.profile_photo_url,
          type: "fan",
        };
      }
    }

    return {
      ...bid,
      bidder: bidderInfo,
    };
  });
}
