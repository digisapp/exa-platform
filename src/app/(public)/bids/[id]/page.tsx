import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { AuctionDetailClient } from "./AuctionDetailClient";
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
    .select("title, description")
    .eq("id", id)
    .single();

  if (!auction) {
    return { title: "Bid Not Found" };
  }

  return {
    title: `${auction.title} - Bids`,
    description: auction.description || `Bid on ${auction.title}`,
  };
}

export default async function AuctionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let actorId: string | null = null;

  if (user) {
    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;
    actorId = actor?.id || null;

    // Get profile info based on actor type
    if (actor?.type === "model" || actor?.type === "admin") {
      const { data } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  // Get auction with model info
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

  // Get watchlist count
  const { count: watchlistCount } = await (supabase as any)
    .from("auction_watchlist")
    .select("*", { count: "exact", head: true })
    .eq("auction_id", id);

  // Check if current user is watching
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

  // Get bid history
  const { data: bids } = await (supabase as any)
    .from("auction_bids")
    .select(`
      *,
      bidder:actors!auction_bids_bidder_id_fkey (
        id,
        type
      )
    `)
    .eq("auction_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Batch-enrich bids with bidder info (2 queries instead of N+1)
  const enhancedBids = await enrichBidsWithBidderInfo(supabase, bids || []);

  // Format auction with details
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

  const displayName =
    profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.display_name || profileData?.username || undefined;

  // Check if current user is the owner
  const isOwner = user && auction.model?.user_id === user.id;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
        <Navbar
          user={user ? {
            id: user.id,
            email: user.email || "",
            avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || undefined,
            name: displayName,
            username: profileData?.username || undefined,
          } : undefined}
          actorType={actorType}
        />

        <AuctionDetailClient
          auction={auctionWithDetails}
          bids={enhancedBids}
          isLoggedIn={!!user}
          isOwner={isOwner || false}
          currentUserId={actorId || undefined}
        />
      </div>
    </CoinBalanceProvider>
  );
}
