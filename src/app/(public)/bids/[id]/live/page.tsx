import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { LiveAuctionShell } from "./LiveAuctionShell";
import { enrichBidsWithBidderInfo } from "@/lib/auction-utils";
import type { AuctionWithDetails } from "@/types/auctions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auction } = await (supabase as any)
    .from("auctions")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: auction ? `🔴 Live · ${auction.title} | EXA Bids` : "Live Bid",
    robots: { index: false },
  };
}

export default async function LiveAuctionPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();
  let coinBalance = 0;
  let actorId: string | null = null;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorId = actor?.id || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      const { data } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single() as { data: { coin_balance: number } | null };
      coinBalance = data?.coin_balance ?? 0;
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("id", actor.id)
        .single() as { data: { coin_balance: number } | null };
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const { data: auction, error } = await (supabase as any)
    .from("auctions")
    .select(`
      *,
      model:models!auctions_model_id_fkey (
        id,
        first_name,
        last_name,
        profile_photo_url,
        username,
        user_id
      )
    `)
    .eq("id", id)
    .single();

  if (error || !auction) {
    notFound();
  }

  const { count: watchlistCount } = await (supabase as any)
    .from("auction_watchlist")
    .select("*", { count: "exact", head: true })
    .eq("auction_id", id);

  let isWatching = false;
  if (actorId) {
    const { data: watchEntry } = await (supabase as any)
      .from("auction_watchlist")
      .select("id")
      .eq("auction_id", id)
      .eq("actor_id", actorId)
      .single();
    isWatching = !!watchEntry;
  }

  const { data: bids } = await (adminClient as any)
    .from("auction_bids")
    .select(`
      *,
      bidder:actors (
        id,
        type
      )
    `)
    .eq("auction_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const enhancedBids = await enrichBidsWithBidderInfo(adminClient, bids || []);

  const auctionWithDetails: AuctionWithDetails = {
    ...auction,
    model: auction.model ? {
      id: auction.model.id,
      display_name: auction.model.first_name
        ? `${auction.model.first_name} ${auction.model.last_name || ""}`.trim()
        : null,
      profile_image_url: auction.model.profile_photo_url,
      slug: auction.model.username,
      user_id: auction.model.user_id,
    } : undefined,
    watchlist_count: watchlistCount || 0,
    is_watching: isWatching,
  };

  const isOwner = user && auction.model?.user_id === user.id;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <LiveAuctionShell
        auction={auctionWithDetails}
        bids={enhancedBids}
        isLoggedIn={!!user}
        isOwner={isOwner || false}
        currentUserId={actorId || undefined}
      />
    </CoinBalanceProvider>
  );
}
