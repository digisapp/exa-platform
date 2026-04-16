import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import localFont from "next/font/local";

const glacialIndifference = localFont({
  src: "../../../public/fonts/GlacialIndifference-Regular.woff2",
  display: "swap",
  weight: "400",
});
import {
  MapPin,
  Instagram,
  Calendar,
  EyeOff,
  Youtube,
  Twitch,
  ExternalLink,
  Mail,
} from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";
import { SnapchatIcon } from "@/components/ui/snapchat-icon";
import { XIcon } from "@/components/ui/x-icon";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import type { Metadata } from "next";
import { ShareButton } from "@/components/ui/share-button";
import { AddToCampaignButton } from "@/components/ui/add-to-campaign-button";
import { BioExpand } from "@/components/model/BioExpand";
import { ModelNotesDialog } from "@/components/brands/ModelNotesDialog";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileContentTabs } from "@/components/profile/ProfileContentTabs";
import { ViewTracker } from "@/components/profile/ViewTracker";
import { getHeroPortrait } from "@/lib/hero-portrait";

// Use ISR - revalidate every 60 seconds for fresh content without regenerating on every request
// This dramatically improves performance while keeping data reasonably fresh
export const revalidate = 60;

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

// Reserved paths that should NOT be treated as usernames
const RESERVED_PATHS = [
  'signin', 'signup', 'models', 'gigs', 'dashboard', 'profile', 'messages',
  'leaderboard', 'admin', 'onboarding', 'brands', 'designers', 'media',
  'api', 'auth', '_next', 'favicon.ico', 'wallet', 'content', 'coins',
  'earnings', 'fan', 'opportunities', 'settings', 'notifications', 'search',
  'explore', 'trending', 'popular', 'new', 'hot', 'top', 'best', 'featured',
  'favorites', 'chats', 'claim', 'forgot-password', 'rates', 'book', 'booking',
  'events', 'shows',
];

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  if (RESERVED_PATHS.includes(username.toLowerCase())) {
    return { title: "EXA Models" };
  }

  const supabase = await createClient();

  // Get model without is_approved filter (the page handles access control)
  const { data: model } = await supabase
    .from("models")
    .select("first_name, last_name, username, bio, profile_photo_url, is_approved")
    .eq("username", username)
    .single() as { data: any };

  if (!model) {
    return { title: "Model Not Found | EXA" };
  }

  // For unapproved models, return generic metadata (only owner can see the page)
  if (!model.is_approved) {
    return { title: "Profile Preview | EXA Models" };
  }

  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;
  const profileUrl = `https://www.examodels.com/${model.username}`;
  const description = model.bio || `Book ${displayName} for photoshoots, events, and brand collaborations on EXA Models - the premier model booking platform.`;

  return {
    title: `${displayName} (@${model.username}) | EXA Models`,
    description,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      title: `${displayName} | EXA Models`,
      description,
      images: model.profile_photo_url ? [{ url: model.profile_photo_url, width: 800, height: 800, alt: displayName }] : [],
      url: profileUrl,
      type: "profile",
      siteName: "EXA Models",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} | EXA Models`,
      description,
      images: model.profile_photo_url ? [model.profile_photo_url] : [],
    },
  };
}

export default async function ModelProfilePage({ params }: Props) {
  const { username } = await params;

  if (RESERVED_PATHS.includes(username.toLowerCase())) {
    notFound();
  }

  const supabase = await createClient();

  // Get current user first to check ownership
  const { data: { user } } = await supabase.auth.getUser();

  // Get model (without is_approved filter - we check ownership below)
  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("username", username)
    .single() as { data: any };

  if (!model) {
    notFound();
  }

  // Check if current user is the owner of this profile
  const isOwner = Boolean(user && model.user_id === user.id);

  // Check if current user is an admin
  let isAdmin = false;
  if (user && !isOwner) {
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single() as { data: { type: string } | null };
    isAdmin = actor?.type === "admin";
  }

  // Hide deleted models from everyone except admins
  if (model.deleted_at && !isAdmin) {
    notFound();
  }

  // Only show 404 if model is not approved AND viewer is not the owner or admin
  if (!model.is_approved && !isOwner && !isAdmin) {
    notFound();
  }

  // Get model's event badges (using separate queries due to FK relationship issue)
  const { data: modelBadgesRaw } = await supabase
    .from("model_badges")
    .select(`
      earned_at,
      badge_id,
      badges!inner (
        id,
        slug,
        name,
        icon,
        badge_type,
        is_active,
        event_id
      )
    `)
    .eq("model_id", model.id)
    .eq("badges.badge_type", "event")
    .eq("badges.is_active", true) as { data: any[] | null };

  // Fetch event details for each badge
  let eventBadges: any[] | null = null;
  if (modelBadgesRaw && modelBadgesRaw.length > 0) {
    const eventIds = modelBadgesRaw.map(mb => mb.badges?.event_id).filter(Boolean);
    // Guard against empty array — .in("id", []) throws in Supabase-js
    const { data: eventsData } = eventIds.length > 0 ? await supabase
      .from("events")
      .select("id, slug, name, short_name, year, badge_image_url")
      .in("id", eventIds) as { data: any[] | null } : { data: [] };

    // Combine badge and event data
    const eventsMap = new Map(eventsData?.map(e => [e.id, e]) || []);
    eventBadges = modelBadgesRaw.map(mb => ({
      earned_at: mb.earned_at,
      badges: {
        ...mb.badges,
        events: eventsMap.get(mb.badges?.event_id) || null
      }
    })).filter(eb => eb.badges.events !== null);
  }

  // Resolve content_items media_url (can be storage path or full URL)
  const resolveMediaUrl = (url: string) =>
    url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;

  // Fetch photos, videos, auctions, and PPV count in parallel
  const [
    { data: rawPhotos },
    { data: rawVideos },
    { data: liveAuctions },
    { count: premiumContentCount },
  ] = await Promise.all([
    (supabase as any)
      .from("content_items")
      // NOTE: once migration 20260416000001 is applied, add `width, height`
      // to this select so the hero-portrait helper can pick the highest-res
      // portrait (currently it falls back to most-recent portfolio).
      .select("id, media_url, media_type, title, created_at")
      .eq("model_id", model.id)
      .eq("status", "portfolio")
      .eq("media_type", "image")
      .order("created_at", { ascending: false })
      .limit(50) as Promise<{ data: any[] | null }>,
    (supabase as any)
      .from("content_items")
      .select("id, media_url, media_type, title, created_at")
      .eq("model_id", model.id)
      .eq("status", "portfolio")
      .eq("media_type", "video")
      .order("created_at", { ascending: false })
      .limit(24) as Promise<{ data: any[] | null }>,
    (supabase as any)
      .from("auctions")
      .select("id, title, current_bid, starting_price, bid_count, ends_at, buy_now_price, category")
      .eq("model_id", model.id)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true })
      .limit(6) as Promise<{ data: any[] | null }>,
    supabase
      .from("premium_content")
      .select("*", { count: "exact", head: true })
      .eq("model_id", model.id)
      .eq("is_active", true)
      .gt("coin_price", 0) as unknown as Promise<{ count: number | null }>,
  ]);

  const photos = (rawPhotos || []).map((p: any) => ({
    id: p.id,
    photo_url: resolveMediaUrl(p.media_url),
    url: resolveMediaUrl(p.media_url),
    asset_type: "portfolio",
    title: p.title,
    created_at: p.created_at,
  }));

  // Fall back to first portfolio photo if no profile picture is set
  const profilePhotoUrl = model.profile_photo_url || (photos.length > 0 ? photos[0].photo_url : null);

  const videos = (rawVideos || []).map((v: any) => ({
    id: v.id,
    url: resolveMediaUrl(v.media_url),
    asset_type: "video",
    title: v.title,
    created_at: v.created_at,
  }));

  // Get current user's actor info
  let coinBalance = 0;
  let isBrand = false;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (actor) {
      isBrand = actor.type === "brand";

      if (actor.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        coinBalance = fan?.coin_balance || 0;
      } else if (actor.type === "brand") {
        const { data: brandData } = await (supabase
          .from("brands") as any)
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        coinBalance = brandData?.coin_balance || 0;
      } else {
        const { data: modelData } = await supabase
          .from("models")
          .select("coin_balance")
          .eq("user_id", user.id)
          .single() as { data: { coin_balance: number } | null };
        coinBalance = modelData?.coin_balance || 0;
      }
    }
  }

  // Get model's actor ID and follower count
  const { data: modelActor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", model.user_id)
    .single() as { data: { id: string } | null };

  const modelActorId = modelActor?.id || null;


  // Display name - show first_name + last_name, or fallback to username
  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  // PORTRAIT HERO EXPERIMENT — gated by username so we can A/B by hand
  // To enable for more models: add their username (lowercase) to this array.
  // To revert entirely: empty the array (one-line change).
  const PORTRAIT_HERO_USERNAMES = ["miriam"];
  const useHeroLayout = PORTRAIT_HERO_USERNAMES.includes(model.username.toLowerCase());
  const isOnline = !!model.last_active_at && (Date.now() - new Date(model.last_active_at).getTime()) < 5 * 60 * 1000;

  // Pick the best image source for the hero ONLY. The square `profile_photo_url`
  // continues to power every circle on the platform (chats, DMs, leaderboards,
  // dashboard, etc.) — those circles never see this value.
  // The helper prefers high-res sources and falls back gracefully.
  const heroSource = useHeroLayout
    ? getHeroPortrait({
        profilePhotoUrl: profilePhotoUrl,
        profilePhotoWidth: null, // not yet stored on models table
        profilePhotoHeight: null,
        portfolioPhotos: (rawPhotos || []).map((p: any) => ({
          url: resolveMediaUrl(p.media_url),
          width: p.width ?? null,
          height: p.height ?? null,
          createdAt: p.created_at,
        })),
      })
    : null;
  const heroPhotoUrl = heroSource?.url ?? profilePhotoUrl;

  // Social media links (with follower counts for brand discovery)
  const socialLinks = [
    { platform: "instagram", username: model.instagram_name, followers: model.instagram_followers as number | null, url: model.instagram_name ? `https://www.instagram.com/${model.instagram_name.replace(/^@/, '')}` : (model.instagram_url?.includes("instagram.com") ? model.instagram_url : null) },
    { platform: "tiktok", username: model.tiktok_username, followers: model.tiktok_followers as number | null, url: `https://tiktok.com/@${model.tiktok_username?.replace(/^@/, '')}` },
    { platform: "snapchat", username: model.snapchat_username, followers: model.snapchat_followers as number | null, url: `https://snapchat.com/add/${model.snapchat_username?.replace(/^@/, '')}` },
    { platform: "x", username: model.x_username, followers: model.x_followers as number | null, url: `https://x.com/${model.x_username?.replace(/^@/, '')}` },
    { platform: "youtube", username: model.youtube_username, followers: model.youtube_subscribers as number | null, url: `https://youtube.com/@${model.youtube_username?.replace(/^@/, '')}` },
    { platform: "twitch", username: model.twitch_username, followers: null as number | null, url: `https://twitch.tv/${model.twitch_username?.replace(/^@/, '')}` },
  ].filter(link => link.username);

  // Live bid helpers
  const AUCTION_EMOJI: Record<string, string> = {
    video_call: "📞", custom_content: "🎬", meet_greet: "🤝",
    shoutout: "📲", experience: "✨", other: "💫",
  };
  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: `https://www.examodels.com/${model.username}`,
    image: profilePhotoUrl || undefined,
    description: model.bio || `Professional model available for bookings on EXA Models`,
    jobTitle: "Model",
    ...(model.show_location && model.city && model.state && {
      address: {
        "@type": "PostalAddress",
        addressLocality: model.city,
        addressRegion: model.state,
      },
    }),
    sameAs: socialLinks.map(link => link.url),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen relative">
        <FloatingOrbs />

        {/* Track profile view */}
        <ViewTracker modelId={model.id} />

      {/* Preview Banner for unapproved profiles (owner or admin viewing) */}
      {!model.is_approved && (isOwner || isAdmin) && (
        <div className="relative z-20 bg-amber-500/90 text-amber-950 py-3 px-4">
          <div className="container max-w-lg mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <EyeOff className="h-4 w-4" />
            <span>{isAdmin ? "Admin View - This profile is hidden (not approved)" : "Profile Preview - Your profile is hidden until approved"}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 container max-w-lg md:max-w-3xl mx-auto py-6 px-4">
        {/* Main Profile Card */}
        <div className={`profile-card rounded-3xl relative ${useHeroLayout ? "overflow-hidden" : "p-6 text-center"}`}>
          {/* Header Row — only for circle layout. Hero variant moves wordmark/share into the hero overlay. */}
          {!useHeroLayout && (
          <div className="relative flex items-center justify-center mb-6 min-h-8">
            <Link
              href={user ? "/dashboard" : "/"}
              aria-label="exa models home"
              className={`${glacialIndifference.className} wordmark-glimmer text-3xl md:text-4xl leading-none tracking-[0.01em] lowercase hover:opacity-90 transition-opacity`}
            >
              exa models
            </Link>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isBrand && !isOwner && (
                <>
                  <ModelNotesDialog
                    modelId={model.id}
                    modelName={displayName}
                  />
                  <AddToCampaignButton
                    modelId={model.id}
                    modelName={displayName}
                  />
                </>
              )}
              <ShareButton title={displayName} />
            </div>
          </div>
          )}

          {/* Live Bids Strip — compact rows matching homepage EXA Bids style */}
          {liveAuctions && liveAuctions.length > 0 && (
            <div className={useHeroLayout ? "p-6 pb-3" : "mb-5"}>
              {/* Label */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">
                  Live Bids
                </span>
              </div>
              {/* Full-width compact rows */}
              <div className="space-y-1.5">
                {liveAuctions.map((auction: any) => {
                  const coins = auction.current_bid ?? auction.starting_price;
                  const emoji = AUCTION_EMOJI[auction.category] || "💫";
                  return (
                    <Link
                      key={auction.id}
                      href={`/bids/${auction.id}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-base leading-none shrink-0">{emoji}</span>
                      <p className="flex-1 text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">
                        {auction.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-amber-400">
                          ${Math.round(coins * 0.10).toLocaleString()}
                        </span>
                        {auction.bid_count > 0 && (
                          <span className="text-[10px] text-white/30">
                            · {auction.bid_count}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white shrink-0">
                        BID
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {useHeroLayout ? (
            /* ============================================
               MEGA-HERO (experimental, gated by username)
               4:5 portrait that BLEEDS to the parent card edges — one continuous
               frame, no card-in-card. Top corners are clipped by parent's
               rounded-3xl + overflow-hidden.
               - Top row overlay: online | wordmark (huge, no bubble) | share + brand actions
               - Bottom glass dock: name + location + compact socials + ProfileActionButtons
               - Below the hero: bio + affiliate + content tabs + rates CTA (own padding)
               ============================================ */
            <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69]">
                {heroPhotoUrl ? (
                  <Image
                    src={heroPhotoUrl}
                    alt={displayName}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    priority
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-7xl font-bold text-white/40">
                      {displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                )}

                {/* TOP FLOATING ROW: online (left) | wordmark (center) | actions (right) */}
                <div className="absolute top-0 inset-x-0 z-20 p-3 flex items-start justify-between gap-2 bg-gradient-to-b from-black/45 via-black/15 to-transparent">
                  {/* Left column: online chip */}
                  <div className="flex flex-col items-start gap-1.5 min-w-0">
                    {isOnline && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-emerald-400/50 shadow-[0_0_18px_rgba(52,211,153,0.45)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        <span className="text-emerald-300 text-[11px] font-semibold tracking-wide">Online</span>
                      </div>
                    )}
                  </div>

                  {/* Center: exa models wordmark — large text overlay (no bubble) */}
                  <Link
                    href={user ? "/dashboard" : "/"}
                    aria-label="exa models home"
                    className={`${glacialIndifference.className} wordmark-glimmer text-4xl md:text-6xl leading-none tracking-[0.01em] lowercase hover:opacity-90 transition-opacity drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] shrink-0`}
                  >
                    exa models
                  </Link>

                  {/* Right column: brand actions (if brand) + share + event badges stacked */}
                  <div className="flex flex-col items-end gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isBrand && !isOwner && (
                        <>
                          <div className="rounded-full bg-black/45 backdrop-blur-md border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                            <ModelNotesDialog modelId={model.id} modelName={displayName} />
                          </div>
                          <div className="rounded-full bg-black/45 backdrop-blur-md border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                            <AddToCampaignButton modelId={model.id} modelName={displayName} />
                          </div>
                        </>
                      )}
                      <div className="rounded-full bg-black/45 backdrop-blur-md border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                        <ShareButton title={displayName} />
                      </div>
                    </div>
                    {eventBadges && eventBadges.length > 0 && eventBadges.map((eb: any, idx: number) => (
                      <Link
                        key={idx}
                        href={`/shows/${eb.badges.events.slug}?ref=${model.affiliate_code}`}
                        title={`Confirmed ${eb.badges.events.name} Model`}
                        className="bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-amber-950 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.4)] border border-amber-200/60 hover:scale-105 transition-transform"
                      >
                        <span>💧</span>
                        <span>{eb.badges.events.short_name}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* BOTTOM GLASS DOCK: name, location, socials, action buttons all overlaid */}
                <div className="absolute inset-x-0 bottom-0 z-10 pt-20 pb-5 px-5 bg-gradient-to-t from-black/95 via-black/75 via-40% to-transparent text-left">
                  {/* Synthwave gradient accent — top edge of dock */}
                  <div className="absolute top-16 left-5 right-5 h-px bg-gradient-to-r from-transparent via-pink-400/70 to-transparent" />

                  {/* Name */}
                  <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] leading-[1.05]">
                    {displayName}
                  </h1>

                  {/* Location */}
                  {model.show_location && (model.city || model.state) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-white/85">
                      <MapPin className="h-3.5 w-3.5 text-pink-300 drop-shadow-[0_0_6px_rgba(236,72,153,0.6)]" />
                      <span className="text-sm font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                        {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                      </span>
                    </div>
                  )}

                  {/* Compact socials — icon-only glass chips with per-platform glow on hover */}
                  {model.show_social_media && (socialLinks.length > 0 || model.email) && (
                    <div className="flex items-center gap-1.5 mt-3 mb-3 flex-wrap">
                      {socialLinks.map((link) => {
                        const PLATFORM_GLOW: Record<string, string> = {
                          instagram: "hover:bg-pink-500/30 hover:border-pink-400/60 hover:shadow-[0_0_14px_rgba(236,72,153,0.55)] hover:[&_svg]:text-pink-200",
                          tiktok: "hover:bg-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_14px_rgba(34,211,238,0.55)] hover:[&_svg]:text-cyan-200",
                          snapchat: "hover:bg-amber-500/30 hover:border-amber-400/60 hover:shadow-[0_0_14px_rgba(245,158,11,0.55)] hover:[&_svg]:text-amber-200",
                          x: "hover:bg-white/25 hover:border-white/60 hover:shadow-[0_0_14px_rgba(255,255,255,0.45)]",
                          youtube: "hover:bg-rose-500/30 hover:border-rose-400/60 hover:shadow-[0_0_14px_rgba(244,63,94,0.55)] hover:[&_svg]:text-rose-200",
                          twitch: "hover:bg-violet-500/30 hover:border-violet-400/60 hover:shadow-[0_0_14px_rgba(167,139,250,0.55)] hover:[&_svg]:text-violet-200",
                        };
                        return (
                          <a
                            key={link.platform}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`@${link.username}${link.followers ? ` · ${formatFollowers(link.followers)}` : ""}`}
                            className={`w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${PLATFORM_GLOW[link.platform]}`}
                          >
                            {link.platform === "instagram" && <Instagram className="h-3.5 w-3.5 text-white" />}
                            {link.platform === "tiktok" && <TikTokIcon className="h-3.5 w-3.5 text-white" />}
                            {link.platform === "snapchat" && <SnapchatIcon className="h-3.5 w-3.5 text-white" />}
                            {link.platform === "x" && <XIcon className="h-3.5 w-3.5 text-white" />}
                            {link.platform === "youtube" && <Youtube className="h-3.5 w-3.5 text-white" />}
                            {link.platform === "twitch" && <Twitch className="h-3.5 w-3.5 text-white" />}
                          </a>
                        );
                      })}
                      {model.email && (
                        <a
                          href={`mailto:${model.email}`}
                          title={model.email}
                          className="w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:bg-emerald-500/30 hover:border-emerald-400/60 hover:shadow-[0_0_14px_rgba(52,211,153,0.55)] hover:[&_svg]:text-emerald-200"
                        >
                          <Mail className="h-3.5 w-3.5 text-white" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Action buttons (chat input + video/voice/tip grid) */}
                  <ProfileActionButtons
                    isLoggedIn={!!user}
                    isOwner={isOwner}
                    modelUsername={model.username}
                    modelActorId={modelActorId}
                    modelName={displayName}
                    coinBalance={coinBalance}
                    messageRate={model.message_rate || 0}
                    videoCallRate={model.video_call_rate || 0}
                    voiceCallRate={model.voice_call_rate || 0}
                    allowChat={model.allow_chat ?? true}
                    allowVideoCall={model.allow_video_call ?? true}
                    allowVoiceCall={model.allow_voice_call ?? true}
                    allowTips={model.allow_tips ?? true}
                  />
                </div>
              </div>
          ) : (
            <>
              {/* Profile Image (default circle layout) */}
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  {/* Event badge wrapper - makes profile pic clickable if has event badge */}
                  {eventBadges && eventBadges.length > 0 ? (
                    <Link
                      href={`/shows/${eventBadges[0].badges.events.slug}?ref=${model.affiliate_code}`}
                      className="block relative"
                      title={`Confirmed ${eventBadges[0].badges.events.name} Model`}
                    >
                      <div className={`w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden ring-[4px] ring-amber-400 ${isOwner ? 'profile-pic-breathing' : ''}`}>
                        {profilePhotoUrl ? (
                          <Image
                            src={profilePhotoUrl}
                            alt={displayName}
                            width={224}
                            height={224}
                            className="w-full h-full object-cover"
                            priority
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                            <span className="text-4xl font-bold text-white/60">
                              {displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Event badges on the ring - show all */}
                      <div className="absolute -top-2 right-0 flex flex-col gap-1 items-end">
                        {eventBadges.map((eb: any, idx: number) => (
                          <div key={idx} className="bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-amber-950 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border border-amber-500/50">
                            <span>{eb.badges.events.badge_image_url ? '' : '💧'}</span>
                            <span>{eb.badges.events.short_name}</span>
                          </div>
                        ))}
                      </div>
                      {/* Hover tooltip - above the badge */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                          {eventBadges.map((eb: any) => eb.badges.events.short_name).join(', ')} {eventBadges[0].badges.events.year} Model
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className={`w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden ${isOwner ? 'profile-pic-breathing' : 'ring-2 ring-white/30 shadow-[0_0_30px_rgba(255,105,180,0.3),0_0_60px_rgba(0,191,255,0.2)]'}`}>
                      {profilePhotoUrl ? (
                        <Image
                          src={profilePhotoUrl}
                          alt={displayName}
                          width={224}
                          height={224}
                          className="w-full h-full object-cover"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                          <span className="text-4xl font-bold text-white/60">
                            {displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
              </div>

              {/* Name */}
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                {displayName}
              </h1>

              {/* Status Pill - online if active within last 5 minutes */}
              {isOnline && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/50 shadow-[0_0_16px_rgba(52,211,153,0.35)] mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-emerald-300 text-sm font-semibold">Online now</span>
                </div>
              )}
            </>
          )}

          {/* After-hero content section. Hero variant gets its own padding here
              because the parent profile-card was rendered padless to let the
              photo bleed edge-to-edge. */}
          <div className={useHeroLayout ? "p-6 pt-5 text-center" : "contents"}>

          {/* Bio - under name (or under hero) */}
          {model.bio && <BioExpand bio={model.bio} />}

          {/* Location — only shown for circle layout (hero layout has it in the dock) */}
          {!useHeroLayout && model.show_location && (model.city || model.state) && (
            <div className="flex items-center justify-center gap-1 text-sm text-white/60 mb-4">
              <MapPin className="h-3.5 w-3.5" />
              <span>{model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}</span>
            </div>
          )}

          {/* Social Media Icons + Follower Counts — per-platform neon hover. Hero layout has these in the dock. */}
          {!useHeroLayout && model.show_social_media && (socialLinks.length > 0 || model.email) && (
            <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
              {socialLinks.map((link) => {
                // Per-platform color theming
                const PLATFORM_GLOW: Record<string, string> = {
                  instagram: "group-hover:bg-pink-500/20 group-hover:border-pink-500/50 group-hover:shadow-[0_0_16px_rgba(236,72,153,0.5)] group-hover:[&_svg]:text-pink-300",
                  tiktok: "group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_16px_rgba(34,211,238,0.5)] group-hover:[&_svg]:text-cyan-300",
                  snapchat: "group-hover:bg-amber-500/20 group-hover:border-amber-500/50 group-hover:shadow-[0_0_16px_rgba(245,158,11,0.5)] group-hover:[&_svg]:text-amber-300",
                  x: "group-hover:bg-white/20 group-hover:border-white/50 group-hover:shadow-[0_0_16px_rgba(255,255,255,0.4)]",
                  youtube: "group-hover:bg-rose-500/20 group-hover:border-rose-500/50 group-hover:shadow-[0_0_16px_rgba(244,63,94,0.5)] group-hover:[&_svg]:text-rose-300",
                  twitch: "group-hover:bg-violet-500/20 group-hover:border-violet-500/50 group-hover:shadow-[0_0_16px_rgba(167,139,250,0.5)] group-hover:[&_svg]:text-violet-300",
                };
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 group"
                    title={`@${link.username}`}
                  >
                    <div className={`w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center transition-all group-hover:scale-110 active:scale-95 ${PLATFORM_GLOW[link.platform]}`}>
                      {link.platform === "instagram" && <Instagram className="h-4 w-4 text-white transition-colors" />}
                      {link.platform === "tiktok" && <TikTokIcon className="h-4 w-4 text-white transition-colors" />}
                      {link.platform === "snapchat" && <SnapchatIcon className="h-4 w-4 text-white transition-colors" />}
                      {link.platform === "x" && <XIcon className="h-4 w-4 text-white transition-colors" />}
                      {link.platform === "youtube" && <Youtube className="h-4 w-4 text-white transition-colors" />}
                      {link.platform === "twitch" && <Twitch className="h-4 w-4 text-white transition-colors" />}
                    </div>
                    {link.followers && (
                      <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors leading-none font-medium">
                        {formatFollowers(link.followers)}
                      </span>
                    )}
                  </a>
                );
              })}
              {/* Email icon */}
              {model.email && (
                <a
                  href={`mailto:${model.email}`}
                  className="flex flex-col items-center gap-1 group"
                  title={model.email}
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center transition-all group-hover:scale-110 active:scale-95 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_16px_rgba(52,211,153,0.5)] group-hover:[&_svg]:text-emerald-300">
                    <Mail className="h-4 w-4 text-white transition-colors" />
                  </div>
                  <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors leading-none font-medium">
                    Email
                  </span>
                </a>
              )}
            </div>
          )}

          {/* Action Buttons — hero layout has these in the dock */}
          {!useHeroLayout && (
            <ProfileActionButtons
              isLoggedIn={!!user}
              isOwner={isOwner}
              modelUsername={model.username}
              modelActorId={modelActorId}
              modelName={displayName}
              coinBalance={coinBalance}
              messageRate={model.message_rate || 0}
              videoCallRate={model.video_call_rate || 0}
              voiceCallRate={model.voice_call_rate || 0}
              allowChat={model.allow_chat ?? true}
              allowVideoCall={model.allow_video_call ?? true}
              allowVoiceCall={model.allow_voice_call ?? true}
              allowTips={model.allow_tips ?? true}
            />
          )}

          {/* Affiliate Links - Linktree Style with neon hover glow */}
          {model.affiliate_links && model.affiliate_links.length > 0 && (
            <div className="mb-6 space-y-2.5">
              {model.affiliate_links.map((link: { title: string; url: string; icon?: string }, index: number) => {
                if (!link.title || !link.url) return null;
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-center w-full px-5 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-pink-500/40 transition-all hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_20px_rgba(236,72,153,0.25)] overflow-hidden"
                  >
                    {/* Hover gradient sweep */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-pink-500/5 via-violet-500/5 to-cyan-500/5" />
                    <span className="absolute left-4 w-6 h-6 flex items-center justify-center">
                      {link.icon ? (
                        <span className="text-lg leading-none transition-transform group-hover:scale-110">{link.icon}</span>
                      ) : (
                        <ExternalLink className="h-4 w-4 text-white/60 group-hover:text-pink-300 transition-colors" />
                      )}
                    </span>
                    <span className="relative font-semibold text-white group-hover:text-white">{link.title}</span>
                    <ExternalLink className="absolute right-4 h-3.5 w-3.5 text-white/30 opacity-0 group-hover:opacity-100 group-hover:text-pink-300 transition-all group-hover:translate-x-0.5" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Content Tabs (Photos/Videos/PPV) */}
          <ProfileContentTabs
            photos={photos || []}
            videos={videos || []}
            premiumContentCount={premiumContentCount || 0}
            modelId={model.id}
            coinBalance={coinBalance}
            isOwner={isOwner}
          />

          {/* View Rates & Book Button */}
          {model.show_booking_rates !== false && (
            (() => {
              const hasAnyRates =
                (model.photoshoot_hourly_rate || 0) > 0 ||
                (model.photoshoot_half_day_rate || 0) > 0 ||
                (model.photoshoot_full_day_rate || 0) > 0 ||
                (model.promo_hourly_rate || 0) > 0 ||
                (model.brand_ambassador_daily_rate || 0) > 0 ||
                (model.private_event_hourly_rate || 0) > 0 ||
                (model.social_companion_hourly_rate || 0) > 0 ||
                (model.meet_greet_rate || 0) > 0;

              if (!hasAnyRates) return null;

              return (
                <div className="mt-6">
                  <Link
                    href={`/${model.username}/rates`}
                    className="group relative flex items-center justify-center gap-2 w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_24px_rgba(236,72,153,0.4)] hover:shadow-[0_0_32px_rgba(236,72,153,0.6)] overflow-hidden"
                  >
                    <Calendar className="h-5 w-5" />
                    <span>View Rates &amp; Book</span>
                    {/* Animated shimmer */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </Link>
                </div>
              );
            })()
          )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
