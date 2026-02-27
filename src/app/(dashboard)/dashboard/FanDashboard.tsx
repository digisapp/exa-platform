import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Users,
  Heart,
  Gift,
  MessageCircle,
  Coins,
  Gavel,
  Crown,
} from "lucide-react";
import { CountdownTimer } from "@/components/auctions";
import { formatCoins, coinsToFanUsd, formatUsd } from "@/lib/coin-config";
import { ModelCard } from "@/components/models/model-card";

function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
    const j = currentSeed % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function FanDashboard({ actorId }: { actorId: string }) {
  const supabase = await createClient();

  // Query favorites, featured models, coin balance, live auctions, and fan's own bids in parallel
  const [{ data: follows }, { data: allFeaturedModels }, { data: fanData }, { data: liveAuctions }, { data: myBids }] = await Promise.all([
    (supabase.from("follows") as any)
      .select(`
        created_at,
        following_id,
        actors!follows_following_id_fkey (
          user_id
        )
      `)
      .eq("follower_id", actorId)
      .order("created_at", { ascending: false })
      .limit(20),
    (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null)
      .not("profile_photo_url", "ilike", "%cdninstagram.com%")
      .not("profile_photo_url", "ilike", "%instagram%")
      .limit(100),
    (supabase.from("fans") as any)
      .select("coin_balance, display_name")
      .eq("id", actorId)
      .single(),
    // All currently live auctions
    (supabase.from("auctions") as any)
      .select("id, title, ends_at, current_bid, starting_price, status")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true })
      .limit(10),
    // Fan's own active bids so we can mark winning/outbid
    (supabase.from("auction_bids") as any)
      .select("auction_id, amount, status")
      .eq("bidder_id", actorId)
      .in("status", ["winning", "active", "outbid"]),
  ]);

  const coinBalance = fanData?.coin_balance ?? 0;

  // Map auction_id → fan's bid info for quick lookup
  const myBidMap = new Map<string, { amount: number; status: string }>(
    (myBids || []).map((b: any) => [b.auction_id, { amount: b.amount, status: b.status }])
  );

  const followedUserIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];

  let favoriteModels: any[] = [];
  if (followedUserIds.length > 0) {
    const { data: followedModels } = await (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true);

    const modelsByUserId = new Map((followedModels || []).map((m: any) => [m.user_id, m]));
    favoriteModels = followedUserIds
      .map((userId: string) => modelsByUserId.get(userId))
      .filter(Boolean);
  }

  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const rotationPeriod = Math.floor(daysSinceEpoch / 3);
  const featuredModels = seededShuffle(allFeaturedModels || [], rotationPeriod).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Connect With Models + Live Bids row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What You Can Do - Feature Cards */}
        <Card className="lg:col-span-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-violet-500/5 to-cyan-500/5 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              Connect With Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/50 dark:bg-muted/30 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-full bg-blue-500/10">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="font-semibold">Direct Chat</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Message models directly and get personal responses. Build real connections.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-muted/30 border border-violet-500/20 hover:border-violet-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-full bg-violet-500/10">
                    <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold">Video Calls</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Face-to-face conversations with models. Get styling tips, advice, or just hang out.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-muted/30 border border-pink-500/20 hover:border-pink-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-full bg-pink-500/10">
                    <Gift className="h-5 w-5 text-pink-500" />
                  </div>
                  <h3 className="font-semibold">Send Tips</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show appreciation and support your favorite models. They&apos;ll love you for it!
                </p>
              </div>
            </div>

            {coinBalance < 20 && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Coins className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="font-medium">Get coins to start connecting</p>
                    <p className="text-sm text-muted-foreground">Packages start at just $3.99</p>
                  </div>
                </div>
                <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-semibold">
                  <Link href="/coins">
                    <Coins className="mr-2 h-4 w-4" />
                    Get Coins
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Bids */}
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-pink-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-violet-500" />
              Live Bids
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bids" className="text-violet-400 hover:text-violet-300">
                Browse All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {liveAuctions && liveAuctions.length > 0 ? (
              <div className="space-y-3">
                {liveAuctions.map((auction: any) => {
                  const myBid = myBidMap.get(auction.id);
                  const hasBid = !!myBid;
                  const isWinning = myBid?.status === "winning";
                  const isOutbid = hasBid && !isWinning;
                  const price = auction.current_bid || auction.starting_price;
                  return (
                    <Link
                      key={auction.id}
                      href={`/bids/${auction.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/70 transition-colors group"
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isWinning ? "bg-amber-500/20" : isOutbid ? "bg-red-500/20" : "bg-zinc-700/50"}`}>
                        {isWinning
                          ? <Crown className="h-4 w-4 text-amber-400" />
                          : <Gavel className={`h-4 w-4 ${isOutbid ? "text-red-400" : "text-zinc-400"}`} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{auction.title}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <Coins className="h-3 w-3 text-amber-400" />
                          <span>{formatCoins(price)} ({formatUsd(coinsToFanUsd(price))})</span>
                          {isWinning && <span className="text-amber-400 font-medium">· Winning</span>}
                          {isOutbid && <span className="text-red-400 font-medium">· Outbid</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <CountdownTimer endsAt={auction.ends_at} compact className="text-xs" />
                      </div>
                    </Link>
                  );
                })}
                <div className="pt-1">
                  <Button asChild variant="outline" size="sm" className="w-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                    <Link href="/bids">
                      <Gavel className="h-3.5 w-3.5 mr-2" />
                      Browse All Live Bids
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground text-sm">No live bids right now.</p>
                <Button asChild className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600">
                  <Link href="/bids">
                    <Gavel className="h-4 w-4 mr-2" />
                    Check Back Soon
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Favorites */}
      {favoriteModels.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
            Your Favorites
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {favoriteModels.map((model: any) => (
              <Link
                key={model.id}
                href={`/${model.username}`}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full ring-2 ring-pink-500/50 group-hover:ring-pink-500 transition-all overflow-hidden">
                    <Image
                      src={model.profile_photo_url}
                      alt={model.first_name || model.username}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {model.is_verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[80px] text-center">
                  {model.first_name || model.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Featured Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-500" />
            Discover Models
          </CardTitle>
          <Button asChild size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
            <Link href="/models">
              Browse All Models
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {featuredModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredModels.map((model: any) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No models yet</p>
              <Button asChild size="sm" className="mt-3 bg-gradient-to-r from-pink-500 to-violet-500">
                <Link href="/models">
                  Browse Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-violet-500/20">
        <CardHeader>
          <CardTitle className="text-center">How EXA Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-pink-500">1</span>
              </div>
              <h4 className="font-semibold mb-1">Browse & Follow</h4>
              <p className="text-sm text-muted-foreground">
                Discover models and follow your favorites to stay updated
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-violet-500">2</span>
              </div>
              <h4 className="font-semibold mb-1">Get Coins</h4>
              <p className="text-sm text-muted-foreground">
                Purchase coins to unlock messaging, video calls, and more
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-cyan-500">3</span>
              </div>
              <h4 className="font-semibold mb-1">Connect</h4>
              <p className="text-sm text-muted-foreground">
                Chat, video call, and support models you love
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
