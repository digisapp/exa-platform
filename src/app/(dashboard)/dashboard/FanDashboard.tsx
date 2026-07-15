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
  Ticket,
  MapPin,
  CalendarDays,
  Flame,
} from "lucide-react";
import { ModelCard } from "@/components/models/model-card";
import { ForYouFeed, type FeedItem } from "./ForYouFeed";
import { LiveWallServer } from "@/components/live-wall/LiveWallServer";
import { LiveBidsPanel } from "./LiveBidsPanel";
import {
  CONTENT_MEDIA_BUCKET,
  CONTENT_MEDIA_SIGNED_URL_TTL,
  isContentMediaPath,
} from "@/lib/content-media";

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
  // New exclusive uploads live in the private content-media bucket; legacy
  // paths live in the public portfolio bucket (src/lib/content-media.ts)
  const bucket = isContentMediaPath(path) ? CONTENT_MEDIA_BUCKET : "portfolio";
  const { data } = await service.storage
    .from(bucket)
    .createSignedUrl(path, CONTENT_MEDIA_SIGNED_URL_TTL);
  // Never emit a raw private path — it's useless to the client
  return data?.signedUrl ?? (isContentMediaPath(path) ? null : rawUrl);
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
    { data: freeContent },
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
        id, username, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .eq("is_approved", true)
      .is("deleted_at", null)
      // IS NOT TRUE also keeps legacy null rows visible
      .not("deactivated", "is", true)
      .not("profile_photo_url", "is", null)
      .not("profile_photo_url", "ilike", "%cdninstagram.com%")
      .not("profile_photo_url", "ilike", "%instagram%")
      // Recently-active models first — they're the ones who'll actually respond
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(100),
    (supabase.from("fans") as any)
      .select("coin_balance, email")
      .eq("id", actorId)
      .single(),
    // All currently live auctions with model info
    (supabase.from("auctions") as any)
      .select("id, title, category, cover_image_url, current_bid, starting_price, bid_count, ends_at, status, model:models!auctions_model_id_fkey(username, profile_photo_url, is_verified)")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true })
      .limit(10),
    // Fan's own active bids so we can mark winning/outbid
    (supabase.from("auction_bids") as any)
      .select("auction_id, amount, status")
      .eq("bidder_id", actorId)
      .in("status", ["winning", "active", "outbid"]),
    // Newest exclusive content for feed. No date window: exclusive paid content
    // is posted rarely, so a 30-day filter empties this pool and kills the feed's
    // fresh/followed arm. Latest-50 keeps it populated and still recency-ordered.
    (supabase as any).from("content_items")
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, like_count, created_at,
        model:models!content_items_model_id_fkey(id, username, profile_photo_url, is_verified, is_approved, deleted_at, deactivated)
      `)
      .eq("status", "exclusive")
      .gt("coin_price", 0)
      .order("created_at", { ascending: false })
      .limit(50),
    // Trending exclusive content (top unlocks, all time)
    (supabase as any).from("content_items")
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, like_count, created_at,
        model:models!content_items_model_id_fkey(id, username, profile_photo_url, is_verified, is_approved, deleted_at, deactivated)
      `)
      .eq("status", "exclusive")
      .gt("coin_price", 0)
      .gt("unlock_count", 0)
      .order("unlock_count", { ascending: false })
      .limit(30),
    // Free content pool — public portfolio + any free exclusive posts. This is the
    // bulk of the feed: there are thousands of free portfolio items vs ~130 paid
    // exclusives, so the feed leads with free discovery and treats paid as upsell.
    // Only content from approved, non-deleted models (inner-join filter).
    (supabase as any).from("content_items")
      .select(`
        id, title, description, media_type, preview_url, media_url,
        coin_price, unlock_count, like_count, created_at,
        model:models!content_items_model_id_fkey!inner(id, username, profile_photo_url, is_verified, is_approved, deleted_at, deactivated)
      `)
      .in("status", ["portfolio", "exclusive"])
      .eq("coin_price", 0)
      .eq("model.is_approved", true)
      .is("model.deleted_at", null)
      .not("model.deactivated", "is", true)
      .order("created_at", { ascending: false })
      .limit(400),
    // Fan's already-unlocked content
    (supabase as any).from("content_purchases")
      .select("item_id")
      .eq("buyer_id", actorId)
      .not("item_id", "is", null),
  ]);

  const coinBalance = fanData?.coin_balance ?? 0;
  const fanEmail = fanData?.email ?? null;

  // Fetch shows the fan has attended (by fan_id or email match)
  let fanShows: any[] = [];
  if (fanEmail) {
    const { data: purchases } = await (supabase.from("ticket_purchases") as any)
      .select(`
        id, quantity, total_price_cents, completed_at,
        events (
          id, name, slug, short_name, cover_image_url,
          start_date, location_city, location_state
        )
      `)
      .or(`fan_id.eq.${actorId},buyer_email.eq.${fanEmail}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20);

    // Deduplicate by event id (fan may have bought multiple tiers for same event)
    const seen = new Set<string>();
    fanShows = (purchases || []).filter((p: any) => {
      const eid = p.events?.id;
      if (!eid || seen.has(eid)) return false;
      seen.add(eid);
      return true;
    });
  }

  // Map auction_id → fan's bid info for quick lookup
  const myBidMap = new Map<string, { amount: number; status: string }>(
    (myBids || []).map((b: any) => [b.auction_id, { amount: b.amount, status: b.status }])
  );

  const followedUserIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];

  let favoriteModels: any[] = [];
  if (followedUserIds.length > 0) {
    const { data: followedModels } = await (supabase.from("models") as any)
      .select(`
        id, user_id, username, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true)
      .is("deleted_at", null);

    const modelsByUserId = new Map((followedModels || []).map((m: any) => [m.user_id, m]));
    favoriteModels = followedUserIds
      .map((userId: string) => modelsByUserId.get(userId))
      .filter(Boolean);
  }

  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const rotationPeriod = Math.floor(daysSinceEpoch / 3);
  const featuredModels = seededShuffle(allFeaturedModels || [], rotationPeriod).slice(0, 8);

  // Build the "For You" feed.
  // Strategy: lead with FREE content (public portfolio photos + any free posts) so
  // the feed reads as a discovery surface, not a paywall. There are thousands of
  // free items vs ~130 paid exclusives, so free dominates and paid is interspersed
  // as a minority upsell. Followed models come first; discovery fills the rest with
  // a per-model cap for variety and a daily shuffle so the ordering isn't frozen.
  const unlockedIds = new Set((myUnlocks || []).map((u: any) => u.item_id));
  const followedModelIds = new Set(favoriteModels.map((m: any) => m.id));
  const seenContentIds = new Set<string>();

  const FEED_CAP = 40;
  const PAID_EVERY = 4; // in discovery, drop one paid upsell after every N free items
  const MAX_PER_MODEL = 3; // followed cap
  const DISCOVER_PER_MODEL = 2; // tighter cap for discovery variety

  // deactivated !== true keeps legacy null rows visible (matches /models applyFilters)
  const modelOk = (c: any) =>
    c.model && c.model.is_approved !== false && !c.model.deleted_at && c.model.deactivated !== true;

  // Free content is always viewable. Portfolio media lives in media_url (its
  // preview_url is usually null), so surface media_url as the preview and mark it
  // unlocked — no blur, opens straight to full view. Paid keeps its blurred teaser.
  const toFeedItem = (content: any, isFollowed: boolean): FeedItem => {
    const isPaid = (content.coin_price ?? 0) > 0;
    const isUnlocked = isPaid ? unlockedIds.has(content.id) : true;
    return {
      type: "content",
      id: content.id,
      model: content.model,
      title: content.title,
      description: content.description,
      media_type: content.media_type,
      preview_url: isPaid ? content.preview_url : content.media_url,
      coin_price: content.coin_price ?? 0,
      unlock_count: content.unlock_count ?? 0,
      like_count: content.like_count ?? 0,
      created_at: content.created_at,
      isUnlocked,
      mediaUrl: isUnlocked ? content.media_url : null,
      isFollowed,
      isLiked: false, // hydrated below from content_likes
    };
  };

  // Followed models first — their free + paid content, newest first, capped per model.
  const followedItems: FeedItem[] = [];
  const followedPerModel = new Map<string, number>();
  const followedPool = [
    ...(freeContent || []),
    ...(recentContent || []),
    ...(trendingContent || []),
  ]
    .filter((c: any) => modelOk(c) && followedModelIds.has(c.model.id))
    .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
  for (const content of followedPool) {
    if (seenContentIds.has(content.id)) continue;
    const n = followedPerModel.get(content.model.id) || 0;
    if (n >= MAX_PER_MODEL) continue;
    seenContentIds.add(content.id);
    followedPerModel.set(content.model.id, n + 1);
    followedItems.push(toFeedItem(content, true));
  }

  // Discovery fill from non-followed models, capped per model for variety.
  const discoverPerModel = new Map<string, number>();
  const takeDiscover = (pool: any[]): FeedItem[] => {
    const out: FeedItem[] = [];
    for (const content of pool) {
      if (!modelOk(content) || seenContentIds.has(content.id)) continue;
      if (followedModelIds.has(content.model.id)) continue;
      const n = discoverPerModel.get(content.model.id) || 0;
      if (n >= DISCOVER_PER_MODEL) continue;
      seenContentIds.add(content.id);
      discoverPerModel.set(content.model.id, n + 1);
      out.push(toFeedItem(content, false));
    }
    return out;
  };

  // Fold the fan's actorId into the shuffle seed so each fan gets their own
  // discover ordering — still deterministic within the day (no Math.random).
  let fanHash = 0;
  for (let i = 0; i < actorId.length; i++) {
    fanHash = (fanHash * 31 + actorId.charCodeAt(i)) & 0x7fffffff;
  }
  const discoverSeed = (daysSinceEpoch + fanHash) & 0x7fffffff;

  const freeDiscover = takeDiscover(seededShuffle(freeContent || [], discoverSeed));
  const paidDiscover = takeDiscover(
    seededShuffle([...(trendingContent || []), ...(recentContent || [])], discoverSeed)
  );

  // Interleave: free-dominant, one paid upsell every PAID_EVERY free items.
  const discoverItems: FeedItem[] = [];
  let pi = 0;
  for (let i = 0; i < freeDiscover.length; i++) {
    discoverItems.push(freeDiscover[i]);
    if ((i + 1) % PAID_EVERY === 0 && pi < paidDiscover.length) {
      discoverItems.push(paidDiscover[pi++]);
    }
  }
  while (pi < paidDiscover.length) discoverItems.push(paidDiscover[pi++]);

  const sortedFeed: FeedItem[] = [...followedItems, ...discoverItems].slice(0, FEED_CAP);

  // Hydrate the fan's hearts (RLS: actors read their own likes)
  if (sortedFeed.length > 0) {
    const { data: myLikes } = await (supabase as any)
      .from("content_likes")
      .select("content_id")
      .eq("actor_id", actorId)
      .in("content_id", sortedFeed.map((i) => i.id));
    const likedIds = new Set((myLikes || []).map((l: any) => l.content_id));
    for (const item of sortedFeed) item.isLiked = likedIds.has(item.id);
  }

  // Re-sign any storage paths / expired signed URLs for feed content. Free items
  // reuse the same media_url for preview + full view, so sign it once.
  const service = createServiceRoleClient();
  await Promise.all(
    sortedFeed.map(async (item) => {
      if (item.type !== "content") return;
      const sameMedia = item.isUnlocked && item.mediaUrl === item.preview_url;
      const freshPreview = await toSignedUrl(item.preview_url, service);
      item.preview_url = freshPreview;
      if (item.isUnlocked) {
        item.mediaUrl = sameMedia ? freshPreview : await toSignedUrl(item.mediaUrl, service);
      }
    })
  );

  // Sidebar auctions: attach myBidStatus from the fan's bid map
  const sidebarAuctions = (liveAuctions || [])
    .filter((a: any) => a.model)
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      cover_image_url: a.cover_image_url,
      current_bid: a.current_bid,
      starting_price: a.starting_price,
      bid_count: a.bid_count || 0,
      ends_at: a.ends_at,
      model: a.model,
      myBidStatus: myBidMap.get(a.id)?.status || null,
    }));


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
          When empty: show "start following" nudge
         ────────────────────────────────────────── */}
      {favoriteModels.length === 0 && featuredModels.length > 0 && (
        <div className="p-5 rounded-2xl border border-pink-500/25 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-pink-400" />
                Follow models to personalise your feed
              </h3>
              <p className="text-xs text-white/50 mt-0.5">Tap a heart on any model to add them to your Favs</p>
            </div>
            <Link
              href="/models"
              className="shrink-0 text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
            >
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {featuredModels.slice(0, 10).map((model: any) => (
              <Link
                key={model.id}
                href={`/${model.username}`}
                className="flex-shrink-0 flex flex-col items-center gap-2 group"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-pink-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-14 h-14 rounded-full ring-2 ring-white/10 group-hover:ring-pink-500/60 transition-all overflow-hidden">
                    {model.profile_photo_url ? (
                      <Image
                        src={model.profile_photo_url}
                        alt={model.username}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold">
                        {(model.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-white/60 group-hover:text-white transition-colors truncate max-w-[64px] text-center">
                  {model.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
                        alt={model.username}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                        {(model.username || "?")[0].toUpperCase()}
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
                  {model.username}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Your Shows — events the fan has attended
         ────────────────────────────────────────────── */}
      {fanShows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-white">
              <Ticket className="h-5 w-5 text-violet-400" />
              Your Shows
              <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold ring-1 ring-violet-500/30">
                {fanShows.length}
              </span>
            </h3>
            <Link
              href="/shows"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
            >
              Browse shows <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {fanShows.map((p: any) => {
              const event = p.events;
              if (!event) return null;
              const coinsEarned = 10 * (p.quantity ?? 1);
              const date = event.start_date
                ? new Date(event.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : null;
              const location = [event.location_city, event.location_state].filter(Boolean).join(", ");
              return (
                <Link
                  key={p.id}
                  href={`/shows/${event.slug}`}
                  className="flex-shrink-0 w-44 group"
                >
                  <div className="relative rounded-xl overflow-hidden ring-1 ring-violet-500/30 group-hover:ring-violet-500/70 transition-all shadow-[0_0_16px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]">
                    {event.cover_image_url ? (
                      <Image
                        src={event.cover_image_url}
                        alt={event.name}
                        width={176}
                        height={100}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex items-center justify-center">
                        <Ticket className="h-8 w-8 text-violet-400/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-white text-xs font-bold leading-tight truncate">{event.short_name || event.name}</p>
                      {date && (
                        <p className="text-white/50 text-[10px] mt-0.5 flex items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {date}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between px-0.5">
                    {location ? (
                      <span className="text-[11px] text-white/50 flex items-center gap-1 truncate">
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                        {location}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-0.5 flex-shrink-0">
                      <Coins className="h-2.5 w-2.5" />
                      +{coinsEarned}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Two-column layout: feed left, sidebar right
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">

        {/* ── Left: For You Feed (65%) ── */}
        <ForYouFeed items={sortedFeed} coinBalance={coinBalance} />

        {/* ── Right: Live Wall + Discover Models (35%) ── */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-hide">

          {/* EXA Live Wall */}
          <LiveWallServer actorId={actorId} actorType="fan" />

          {/* EXA Spotlight — compact entry card */}
          <Link
            href="/spotlight"
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/15 via-pink-500/10 to-transparent hover:from-orange-500/25 hover:via-pink-500/15 hover:border-orange-500/60 shadow-[0_0_16px_rgba(249,115,22,0.15)] hover:shadow-[0_0_24px_rgba(249,115,22,0.3)] transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/25 to-pink-500/20 ring-1 ring-orange-500/40 shrink-0">
                <Flame className="h-5 w-5 text-orange-300" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white text-sm">EXA Spotlight</p>
                <p className="text-xs text-white/60 truncate">Swipe to discover models — likes build your feed</p>
              </div>
            </div>
            <span className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 group-hover:from-orange-400 group-hover:to-pink-400 text-xs font-bold text-white shadow-[0_0_14px_rgba(249,115,22,0.4)] transition-all">
              Play
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>

          {/* Live Bids */}
          <LiveBidsPanel auctions={sidebarAuctions} />

          {/* Discover Models — only once a fan has favorites. New fans get the
              featured-avatar nudge strip up top, so we avoid stacking two
              competing "browse models" blocks on the same screen. */}
          {favoriteModels.length > 0 && (
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
          )}

        </div>
      </div>
    </div>
  );
}
