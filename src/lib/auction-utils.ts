import type { BidWithBidder } from "@/types/auctions";

/**
 * Batch-enrich bids with bidder info (model/fan name + avatar).
 * Replaces N+1 individual queries with a small fixed set of batch queries.
 */
export async function enrichBidsWithBidderInfo(
  supabase: any,
  bids: any[]
): Promise<BidWithBidder[]> {
  if (!bids?.length) return [];

  // Collect bidder IDs and types from the joined actors data
  const modelIds: string[] = [];
  const fanIds: string[] = [];
  const unknownIds: string[] = [];

  for (const bid of bids) {
    const bidderId = bid.bidder?.id || bid.bidder_id;
    if (!bidderId) continue;

    const type = bid.bidder?.type;
    if (type === "model") {
      modelIds.push(bidderId);
    } else if (type === "fan") {
      fanIds.push(bidderId);
    } else {
      // Join may have returned null — fall back to actors lookup
      unknownIds.push(bidderId);
    }
  }

  // If any bidder types are unknown, look them up from actors table
  if (unknownIds.length > 0) {
    const { data: actors } = await supabase
      .from("actors")
      .select("id, type")
      .in("id", [...new Set(unknownIds)]);

    for (const actor of actors || []) {
      if (actor.type === "model") modelIds.push(actor.id);
      else if (actor.type === "fan") fanIds.push(actor.id);
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
          .select("id, display_name, username, avatar_url")
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

  // Build actor type map (from both join and fallback lookup)
  const actorTypeMap = new Map<string, string>();
  for (const bid of bids) {
    const bidderId = bid.bidder?.id || bid.bidder_id;
    if (bid.bidder?.type) actorTypeMap.set(bidderId, bid.bidder.type);
  }
  for (const id of uniqueModelIds) actorTypeMap.set(id, "model");
  for (const id of uniqueFanIds) actorTypeMap.set(id, "fan");

  // Enrich bids
  return bids.map((bid: any) => {
    const bidderId = bid.bidder?.id || bid.bidder_id;
    const type = actorTypeMap.get(bidderId);
    let bidderInfo = null;

    if (type === "model") {
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
    } else if (type === "fan") {
      const fan = fanMap.get(bidderId);
      if (fan) {
        bidderInfo = {
          id: bidderId,
          display_name: fan.display_name || fan.username || "Anonymous",
          profile_image_url: fan.avatar_url || null,
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
