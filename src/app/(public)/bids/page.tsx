import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { AuctionCard } from "@/components/auctions/AuctionCard";
import { BidsCategoryFilter } from "@/components/auctions/BidsCategoryFilter";
import { Gavel, Zap } from "lucide-react";
import type { AuctionWithModel } from "@/types/auctions";

export const metadata: Metadata = {
  title: "EXA Bids - Live Listings",
  description: "Bid on exclusive experiences and content from your favorite models",
  robots: { index: true, follow: true },
};

// Cache page for 1 minute - auctions are time-sensitive
export const revalidate = 60;

export default async function BidsPage() {
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let actorId: string | null = null;
  let watchedAuctionIds: string[] = [];

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;
    actorId = actor?.id || null;

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

    if (actorId) {
      const { data: watchlist } = await (supabase as any)
        .from("auction_watchlist")
        .select("auction_id")
        .eq("actor_id", actorId);
      watchedAuctionIds = (watchlist || []).map((w: any) => w.auction_id);
    }
  }

  // Get all active auctions with model info
  const { data: auctions } = await (supabase as any)
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
    .eq("status", "active")
    .order("ends_at", { ascending: true });

  const formattedAuctions: AuctionWithModel[] = (auctions || []).map((auction: any) => ({
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
  }));

  // Stats
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const endingThisHour = formattedAuctions.filter(
    (a) => new Date(a.ends_at) <= oneHourFromNow
  );
  const totalUsd = Math.round(
    formattedAuctions.reduce((sum, a) => sum + (a.current_bid || a.starting_price) * 0.15, 0)
  );

  const displayName =
    profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.display_name || profileData?.username || undefined;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-gradient-to-b from-[#0e0a14] via-[#0c0a11] to-zinc-950">
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

        {/* Urgency Stats Bar */}
        <div className="sticky top-16 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
          <div className="container px-8 md:px-16 py-2.5 flex items-center gap-3 flex-wrap text-sm">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="font-bold text-white tracking-wide">LIVE</span>
            </div>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">
              <span className="text-white font-semibold">{formattedAuctions.length}</span> active bids
            </span>
            {endingThisHour.length > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-semibold">{endingThisHour.length}</span>
                  <span>ending this hour</span>
                </span>
              </>
            )}
            {totalUsd > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">
                  <span className="text-white font-semibold">${totalUsd.toLocaleString()}</span> in play
                </span>
              </>
            )}
          </div>
        </div>

        <main className="container px-8 md:px-16 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold">Bids</h1>
            </div>
            <p className="text-muted-foreground">
              Bid on content, deliverables, services &amp; experiences from your favorite models
            </p>
          </div>

          {/* Ending This Hour Strip */}
          {endingThisHour.length > 0 && (
            <div className="hidden sm:block mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="relative flex h-2.5 w-2.5 flex-none">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <h2 className="font-bold text-white text-lg">Ending This Hour</h2>
                <span className="text-sm text-zinc-500">— bid before it&apos;s gone</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {endingThisHour.map((auction) => (
                  <div key={auction.id} className="flex-none w-44 snap-start">
                    <AuctionCard
                      auction={auction}
                      isWatching={watchedAuctionIds.includes(auction.id)}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-zinc-800/60" />
            </div>
          )}

          {/* All Bids with filter + sort */}
          <div className={endingThisHour.length > 0 ? "mt-6" : ""}>
            <BidsCategoryFilter
              auctions={formattedAuctions}
              watchedIds={watchedAuctionIds}
            />
          </div>
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
