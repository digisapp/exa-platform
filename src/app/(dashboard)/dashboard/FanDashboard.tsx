import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Users,
  Heart,
  Coins,
  Sparkles,
  Plus,
} from "lucide-react";
import { ModelCard } from "@/components/models/model-card";
import { ForYouFeed, type FeedItem } from "./ForYouFeed";
import { LiveWallServer } from "@/components/live-wall/LiveWallServer";

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
      .limit(50),
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
      .select("coin_balance")
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
    // Recent exclusive content (last 30 days) for feed
    (supabase as any).from("content_items")
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, created_at,
        model:models!content_items_model_id_fkey(id, username, first_name, last_name, profile_photo_url, is_verified)
      `)
      .eq("status", "exclusive")
      .gt("coin_price", 0)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50),
    // Trending exclusive content (top unlocks, all time)
    (supabase as any).from("content_items")
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, created_at,
        model:models!content_items_model_id_fkey(id, username, first_name, last_name, profile_photo_url, is_verified)
      `)
      .eq("status", "exclusive")
      .gt("coin_price", 0)
      .gt("unlock_count", 0)
      .order("unlock_count", { ascending: false })
      .limit(30),
    // Fan's already-unlocked content
    (supabase as any).from("content_purchases")
      .select("item_id")
      .eq("buyer_id", actorId)
      .not("item_id", "is", null),
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
  const unlockedIds = new Set((myUnlocks || []).map((u: any) => u.item_id));
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
    if (feedItems.length >= 40) break;
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
      {/* ──────────────────────────────────────────────
          Low Coin CTA — full width
         ────────────────────────────────────────────── */}
      {coinBalance < 20 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40">
              <Coins className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="font-semibold text-white">Get coins to start connecting</p>
              <p className="text-xs text-white/60">Packages start at just $3.99</p>
            </div>
          </div>
          <Link
            href="/coins"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-sm font-bold text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
          >
            <Plus className="h-4 w-4" />
            Get Coins
          </Link>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Favorites strip — full width
         ────────────────────────────────────────────── */}
      {favoriteModels.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold mb-3 text-white">
            <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
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
                  <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full ring-2 ring-pink-500/50 group-hover:ring-pink-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all overflow-hidden">
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
                    <div className="absolute -bottom-0.5 -right-0.5 bg-cyan-500 rounded-full p-0.5 ring-2 ring-background shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/60 group-hover:text-white transition-colors truncate max-w-[80px] text-center">
                  {model.first_name || model.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Two-column layout: feed left, sidebar right
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── Left: For You Feed (65%) ── */}
        <ForYouFeed items={sortedFeed} coinBalance={coinBalance} />

        {/* ── Right: Live Wall + Discover Models (35%) ── */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-hide">

          {/* EXA Live Wall */}
          <LiveWallServer actorId={actorId} actorType="fan" />

          {/* Discover Models */}
          <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Discover Models</h2>
              </div>
              <Link
                href="/models"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                Browse all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </header>
            <div className="p-4">
              {featuredModels.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {featuredModels.slice(0, 6).map((model: any) => (
                    <ModelCard key={model.id} model={model} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 ring-1 ring-white/10 mb-3">
                    <Users className="h-5 w-5 text-white/40" />
                  </div>
                  <p className="text-sm text-white/60 mb-4">No models yet</p>
                  <Link
                    href="/models"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-xs font-semibold text-white shadow-[0_0_18px_rgba(236,72,153,0.4)] transition-all"
                  >
                    Browse Models
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
