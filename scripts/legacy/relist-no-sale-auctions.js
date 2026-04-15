const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function relist() {
  const now = new Date().toISOString();

  // Find all expired auctions still marked active with no bids
  const { data: auctions, error } = await supabase
    .from("auctions")
    .select("id, title, created_at, original_end_at, bid_count, ends_at")
    .eq("status", "active")
    .eq("bid_count", 0)
    .lt("ends_at", now);

  if (error) {
    console.error("Failed to fetch auctions:", error);
    return;
  }

  if (!auctions?.length) {
    console.log("No expired zero-bid auctions found.");
    return;
  }

  console.log(`Found ${auctions.length} expired auction(s) with no bids to relist:\n`);

  let relisted = 0;
  for (const auction of auctions) {
    const originalDuration =
      new Date(auction.original_end_at).getTime() -
      new Date(auction.created_at).getTime();
    const duration = Math.min(
      Math.max(originalDuration, 60 * 60 * 1000),
      7 * 24 * 60 * 60 * 1000
    );
    const newEndsAt = new Date(Date.now() + duration).toISOString();

    const { error: updateError } = await supabase
      .from("auctions")
      .update({
        ends_at: newEndsAt,
        original_end_at: newEndsAt,
        current_bid: null,
        bid_count: 0,
        winner_id: null,
        updated_at: now,
      })
      .eq("id", auction.id);

    if (updateError) {
      console.error(`  ✗ Failed to relist "${auction.title}":`, updateError);
    } else {
      relisted++;
      console.log(`  ✓ Relisted "${auction.title}" (was expired since ${auction.ends_at}) — new end: ${newEndsAt}`);
    }
  }

  console.log(`\nDone: ${relisted}/${auctions.length} auctions relisted.`);
}

relist();
