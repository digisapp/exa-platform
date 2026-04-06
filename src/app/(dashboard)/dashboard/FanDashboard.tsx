import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Users,
  Heart,
  Coins,
} from "lucide-react";
import { ModelCard } from "@/components/models/model-card";
import { ForYouFeed, type FeedItem } from "./ForYouFeed";

// Re-sign a storage path or expired signed URL to get a fresh 1-hour signed URL
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url; // already a storage path
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

async function toSignedUrl(rawUrl: string | null | undefined, service: ReturnType<typeof createServiceRoleClient>): Promise<string | null> {
  if (!rawUrl) return null;
  const path = extractStoragePath(rawUrl);
  if (!path) return rawUrl; // not a storage path, return as-is (e.g. public URL)
  const { data } = await service.storage.from("portfolio").createSignedUrl(path, 3600);
  return data?.signedUrl ?? rawUrl;
}

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

  // Query favorites, featured models, coin balance, live auctions, bids, and feed content in parallel
  const [
    { data: follows },
    { data: allFeaturedModels },
    { data: fanData },
    { data: liveAuctions },
    { data: myBids },
    { data: recentContent },
    { data: trendingContent },
    { data: myUnlocks },
  ] = await Promise.all([
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
    // All currently live auctions with model info
    (supabase.from("auctions") as any)
      .select("id, title, category, cover_image_url, current_bid, starting_price, bid_count, ends_at, status, model:models!auctions_model_id_fkey(first_name, last_name, username, profile_photo_url, is_verified)")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true })
      .limit(10),
    // Fan's own active bids so we can mark winning/outbid
    (supabase.from("auction_bids") as any)
      .select("auction_id, amount, status")
      .eq("bidder_id", actorId)
      .in("status", ["winning", "active", "outbid"]),
    // Recent premium content (last 30 days) for feed
    (supabase.from("premium_content") as any)
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, created_at,
        model:models!premium_content_model_id_fkey(id, username, first_name, last_name, profile_photo_url, is_verified)
      `)
      .eq("is_active", true)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    // Trending premium content (top unlocks, all time)
    (supabase.from("premium_content") as any)
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, created_at,
        model:models!premium_content_model_id_fkey(id, username, first_name, last_name, profile_photo_url, is_verified)
      `)
      .eq("is_active", true)
      .gt("unlock_count", 0)
      .order("unlock_count", { ascending: false })
      .limit(20),
    // Fan's already-unlocked content
    (supabase.from("content_unlocks") as any)
      .select("content_id")
      .eq("buyer_id", actorId),
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

  // Build the "For You" feed
  const unlockedIds = new Set((myUnlocks || []).map((u: any) => u.content_id));
  const followedModelIds = new Set(favoriteModels.map((m: any) => m.id));
  const seenContentIds = new Set<string>();

  const feedItems: FeedItem[] = [];

  // Add content from followed models first (prioritized)
  for (const content of (recentContent || [])) {
    if (!content.model || seenContentIds.has(content.id)) continue;
    if (!followedModelIds.has(content.model.id)) continue;
    seenContentIds.add(content.id);
    const isUnlocked = unlockedIds.has(content.id);
    feedItems.push({
      type: "content",
      id: content.id,
      model: content.model,
      title: content.title,
      description: content.description,
      media_type: content.media_type,
      preview_url: content.preview_url,
      coin_price: content.coin_price,
      unlock_count: content.unlock_count,
      created_at: content.created_at,
      isUnlocked,
      mediaUrl: isUnlocked ? content.media_url : null,
      isFollowed: true,
    });
  }

  // Mix in live auctions
  for (const auction of (liveAuctions || []).slice(0, 4)) {
    if (!auction.model) continue;
    const myBid = myBidMap.get(auction.id);
    feedItems.push({
      type: "auction",
      id: auction.id,
      model: { ...auction.model, is_verified: auction.model.is_verified ?? false },
      title: auction.title,
      category: auction.category,
      cover_image_url: auction.cover_image_url,
      current_bid: auction.current_bid,
      starting_price: auction.starting_price,
      bid_count: auction.bid_count || 0,
      ends_at: auction.ends_at,
      myBidStatus: myBid?.status || null,
    });
  }

  // Fill with trending/recent content from non-followed models
  const allNonFollowed = [
    ...(trendingContent || []),
    ...(recentContent || []),
  ];
  for (const content of allNonFollowed) {
    if (feedItems.length >= 20) break;
    if (!content.model || seenContentIds.has(content.id)) continue;
    if (followedModelIds.has(content.model.id)) continue; // already added above
    seenContentIds.add(content.id);
    const isUnlocked = unlockedIds.has(content.id);
    feedItems.push({
      type: "content",
      id: content.id,
      model: content.model,
      title: content.title,
      description: content.description,
      media_type: content.media_type,
      preview_url: content.preview_url,
      coin_price: content.coin_price,
      unlock_count: content.unlock_count,
      created_at: content.created_at,
      isUnlocked,
      mediaUrl: isUnlocked ? content.media_url : null,
      isFollowed: false,
    });
  }

  // Re-sign any storage paths / expired signed URLs for feed content
  const service = createServiceRoleClient();
  await Promise.all(
    feedItems.map(async (item) => {
      if (item.type === "content") {
        const [freshPreview, freshMedia] = await Promise.all([
          toSignedUrl(item.preview_url, service),
          item.isUnlocked ? toSignedUrl(item.mediaUrl, service) : Promise.resolve(null),
        ]);
        item.preview_url = freshPreview;
        if (item.isUnlocked) item.mediaUrl = freshMedia;
      }
    })
  );

  // Interleave: followed content first, then alternate auction/trending
  // Sort followed content by date, keep auctions interspersed
  const followedItems = feedItems.filter(i => i.type === "content" && i.isFollowed);
  const auctionItems = feedItems.filter(i => i.type === "auction");
  const discoverItems = feedItems.filter(i => i.type === "content" && !i.isFollowed);

  const sortedFeed: FeedItem[] = [];
  // Start with followed content
  sortedFeed.push(...followedItems);
  // Insert auctions after every 2 followed items, or at the start if no followed content
  let insertIdx = Math.min(2, sortedFeed.length);
  for (const auction of auctionItems) {
    sortedFeed.splice(insertIdx, 0, auction);
    insertIdx += 3;
  }
  // Append discover content at the end
  sortedFeed.push(...discoverItems);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Low Coin CTA */}
      {coinBalance < 20 && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
          </CardContent>
        </Card>
      )}

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
                    {model.profile_photo_url ? (
                      <Image
                        src={model.profile_photo_url}
                        alt={model.first_name || model.username}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                        {(model.first_name || model.username || "?")[0].toUpperCase()}
                      </div>
                    )}
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

      {/* For You Feed */}
      <ForYouFeed items={sortedFeed} coinBalance={coinBalance} />

      {/* Discover Models */}
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

    </div>
  );
}
