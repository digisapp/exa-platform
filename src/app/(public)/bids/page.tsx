import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { AuctionCard } from "@/components/auctions/AuctionCard";
import { BidsCategoryFilter } from "@/components/auctions/BidsCategoryFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Gavel, Clock, Sparkles, Zap, Eye } from "lucide-react";
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

    // Get watched auctions
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

  // Format auctions
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

  // Filter auctions
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const endingSoon = formattedAuctions.filter(
    (a) => new Date(a.ends_at) <= oneHourFromNow
  );
  const newAuctions = formattedAuctions.filter(
    (a) => new Date(a.created_at) >= oneDayAgo
  );
  const withBuyNow = formattedAuctions.filter((a) => a.buy_now_price);
  const watchedAuctions = formattedAuctions.filter((a) =>
    watchedAuctionIds.includes(a.id)
  );

  const displayName =
    profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.display_name || profileData?.username || undefined;

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

        <main className="container px-8 md:px-16 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold">Bids</h1>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Bid on exclusive experiences and content from your favorite models
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="all" className="gap-1">
                <Gavel className="h-4 w-4" />
                All ({formattedAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="ending-soon" className="gap-1">
                <Clock className="h-4 w-4" />
                Ending Soon ({endingSoon.length})
              </TabsTrigger>
              <TabsTrigger value="new" className="gap-1">
                <Sparkles className="h-4 w-4" />
                New ({newAuctions.length})
              </TabsTrigger>
              <TabsTrigger value="buy-now" className="gap-1">
                <Zap className="h-4 w-4" />
                Buy Now ({withBuyNow.length})
              </TabsTrigger>
              {user && watchedAuctions.length > 0 && (
                <TabsTrigger value="watching" className="gap-1">
                  <Eye className="h-4 w-4" />
                  Watching ({watchedAuctions.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <BidsCategoryFilter
                auctions={formattedAuctions}
                watchedIds={watchedAuctionIds}
              />
            </TabsContent>

            <TabsContent value="ending-soon" className="space-y-6">
              <AuctionGrid
                auctions={endingSoon}
                watchedIds={watchedAuctionIds}
                emptyMessage="No bids ending soon."
              />
            </TabsContent>

            <TabsContent value="new" className="space-y-6">
              <AuctionGrid
                auctions={newAuctions}
                watchedIds={watchedAuctionIds}
                emptyMessage="No new bids in the last 24 hours."
              />
            </TabsContent>

            <TabsContent value="buy-now" className="space-y-6">
              <AuctionGrid
                auctions={withBuyNow}
                watchedIds={watchedAuctionIds}
                emptyMessage="No listings with Buy Now option available."
              />
            </TabsContent>

            {user && (
              <TabsContent value="watching" className="space-y-6">
                <AuctionGrid
                  auctions={watchedAuctions}
                  watchedIds={watchedAuctionIds}
                  emptyMessage="You're not watching any bids yet."
                />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </CoinBalanceProvider>
  );
}

interface AuctionGridProps {
  auctions: AuctionWithModel[];
  watchedIds: string[];
  emptyMessage: string;
}

function AuctionGrid({ auctions, watchedIds, emptyMessage }: AuctionGridProps) {
  if (auctions.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="p-4 bg-gradient-to-br from-pink-500/10 to-violet-500/10 rounded-2xl inline-block">
          <Gavel className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/models"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            <Eye className="h-4 w-4" />
            Browse Models
          </Link>
          <Link
            href="/coins"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Get Coins
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          isWatching={watchedIds.includes(auction.id)}
        />
      ))}
    </div>
  );
}
