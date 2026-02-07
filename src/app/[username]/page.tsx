import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import {
  MapPin,
  Instagram,
  Calendar,
  EyeOff,
  Youtube,
  Twitch,
} from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";
import { SnapchatIcon } from "@/components/ui/snapchat-icon";
import { XIcon } from "@/components/ui/x-icon";
import type { Metadata } from "next";
import { ShareButton } from "@/components/ui/share-button";
import { AddToCampaignButton } from "@/components/ui/add-to-campaign-button";
import { ModelNotesDialog } from "@/components/brands/ModelNotesDialog";
import { BackButton } from "@/components/ui/back-button";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileContentTabs } from "@/components/profile/ProfileContentTabs";
import { ViewTracker } from "@/components/profile/ViewTracker";

// Use ISR - revalidate every 60 seconds for fresh content without regenerating on every request
// This dramatically improves performance while keeping data reasonably fresh
export const revalidate = 60;

// Reserved paths that should NOT be treated as usernames
const RESERVED_PATHS = [
  'signin', 'signup', 'models', 'gigs', 'dashboard', 'profile', 'messages',
  'leaderboard', 'admin', 'onboarding', 'brands', 'designers', 'media',
  'api', 'auth', '_next', 'favicon.ico', 'wallet', 'content', 'coins',
  'earnings', 'fan', 'opportunities', 'settings', 'notifications', 'search',
  'explore', 'trending', 'popular', 'new', 'hot', 'top', 'best', 'featured',
  'favorites', 'chats', 'claim', 'forgot-password', 'rates', 'book', 'booking',
  'events',
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
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, slug, name, short_name, year, badge_image_url")
      .in("id", eventIds) as { data: any[] | null };

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

  // Get portfolio photos - filter out hidden ones (is_visible = false)
  const { data: allPhotos } = await supabase
    .from("media_assets")
    .select("*")
    .eq("model_id", model.id)
    .eq("asset_type", "portfolio")
    .order("created_at", { ascending: false })
    .limit(50) as { data: any[] | null };

  // Filter out hidden photos (is_visible column added via migration)
  const photos = (allPhotos || []).filter((p: any) => p.is_visible !== false);

  // Get videos - filter out hidden ones
  const { data: allVideos } = await supabase
    .from("media_assets")
    .select("*")
    .eq("model_id", model.id)
    .eq("asset_type", "video")
    .order("created_at", { ascending: false })
    .limit(24) as { data: any[] | null };

  // Filter out hidden videos
  const videos = (allVideos || []).filter((v: any) => v.is_visible !== false);

  // Get PPV content count (only paid content)
  const { count: premiumContentCount } = await supabase
    .from("premium_content")
    .select("*", { count: "exact", head: true })
    .eq("model_id", model.id)
    .eq("is_active", true)
    .gt("coin_price", 0);

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

  // Get model's actor ID
  const { data: modelActor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", model.user_id)
    .single() as { data: { id: string } | null };

  const modelActorId = modelActor?.id || null;

  // Display name - show first_name + last_name, or fallback to username
  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  // Social media links
  const socialLinks = [
    { platform: "instagram", username: model.instagram_name, url: model.instagram_url || `https://instagram.com/${model.instagram_name}` },
    { platform: "tiktok", username: model.tiktok_username, url: `https://tiktok.com/@${model.tiktok_username}` },
    { platform: "snapchat", username: model.snapchat_username, url: `https://snapchat.com/add/${model.snapchat_username}` },
    { platform: "x", username: model.x_username, url: `https://x.com/${model.x_username}` },
    { platform: "youtube", username: model.youtube_username, url: `https://youtube.com/@${model.youtube_username}` },
    { platform: "twitch", username: model.twitch_username, url: `https://twitch.tv/${model.twitch_username}` },
  ].filter(link => link.username);

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: `https://www.examodels.com/${model.username}`,
    image: model.profile_photo_url || undefined,
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

      <div className="relative z-10 container max-w-lg md:max-w-2xl mx-auto py-6 px-4">
        {/* Main Profile Card */}
        <div className="profile-card rounded-3xl p-6 text-center relative">
          {/* Header Row: Back/Logo and Share */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {user && <BackButton />}
              <Link href={user ? "/dashboard" : "/"}>
                <Image
                  src="/exa-logo-white.png"
                  alt="EXA"
                  width={60}
                  height={24}
                  className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity"
                />
              </Link>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Profile Image */}
          <div className="flex justify-center mb-4">
            <div className="relative group">
              {/* Event badge wrapper - makes profile pic clickable if has event badge */}
              {eventBadges && eventBadges.length > 0 ? (
                <Link
                  href={`/events/${eventBadges[0].badges.events.slug}?ref=${model.affiliate_code}`}
                  className="block relative"
                  title={`Confirmed ${eventBadges[0].badges.events.name} Model`}
                >
                  <div className={`w-40 h-40 rounded-full overflow-hidden ring-[4px] ring-amber-400 ${isOwner ? 'profile-pic-breathing' : ''}`}>
                    {model.profile_photo_url ? (
                      <Image
                        src={model.profile_photo_url}
                        alt={displayName}
                        width={160}
                        height={160}
                        className="w-full h-full object-cover"
                        priority
                        unoptimized={model.profile_photo_url.includes("cdninstagram.com")}
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
                <div className={`w-40 h-40 rounded-full overflow-hidden ${isOwner ? 'profile-pic-breathing' : 'ring-2 ring-white/30 shadow-[0_0_30px_rgba(255,105,180,0.3),0_0_60px_rgba(0,191,255,0.2)]'}`}>
                  {model.profile_photo_url ? (
                    <Image
                      src={model.profile_photo_url}
                      alt={displayName}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                      priority
                      unoptimized={model.profile_photo_url.includes("cdninstagram.com")}
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
          <h1 className="text-2xl font-bold text-white mb-1">
            {displayName}
          </h1>

          {/* Status Pill */}
          {model.availability_status === 'available' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-green-400 text-sm font-medium">Online</span>
            </div>
          )}


          {/* Bio - under name */}
          {model.bio && (
            <p className="text-white/70 text-sm leading-relaxed text-center mb-3 max-w-sm mx-auto">
              {model.bio}
            </p>
          )}

          {/* Location */}
          {model.show_location && (model.city || model.state) && (
            <div className="flex items-center justify-center gap-1 text-sm text-white/60 mb-4">
              <MapPin className="h-3.5 w-3.5" />
              <span>{model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}</span>
            </div>
          )}

          {/* Social Media Icons - Consistent Design */}
          {model.show_social_media && socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-2 mb-5">
              {socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  title={`@${link.username}`}
                >
                  {link.platform === "instagram" && <Instagram className="h-4 w-4 text-white" />}
                  {link.platform === "tiktok" && <TikTokIcon className="h-4 w-4 text-white" />}
                  {link.platform === "snapchat" && <SnapchatIcon className="h-4 w-4 text-white" />}
                  {link.platform === "x" && <XIcon className="h-4 w-4 text-white" />}
                  {link.platform === "youtube" && <Youtube className="h-4 w-4 text-white" />}
                  {link.platform === "twitch" && <Twitch className="h-4 w-4 text-white" />}
                </a>
              ))}
            </div>
          )}

          {/* Action Buttons */}
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

          {/* Affiliate Links - Linktree Style */}
          {model.affiliate_links && model.affiliate_links.length > 0 && (
            <div className="mb-6 space-y-3">
              {model.affiliate_links.map((link: { title: string; url: string }, index: number) => {
                if (!link.title || !link.url) return null;
                let domain = '';
                try {
                  domain = new URL(link.url).hostname;
                } catch {
                  domain = '';
                }
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center justify-center w-full px-5 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.97] active:opacity-90 hover:shadow-lg hover:shadow-pink-500/10"
                  >
                    {domain && (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                        alt=""
                        className="absolute left-4 w-6 h-6 rounded"
                      />
                    )}
                    <span className="font-medium text-white">{link.title}</span>
                  </a>
                );
              })}
            </div>
          )}

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
                <div className="mb-6">
                  <Link
                    href={`/${model.username}/rates`}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/25"
                  >
                    <Calendar className="h-5 w-5" />
                    View Rates & Book
                  </Link>
                </div>
              );
            })()
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
        </div>
      </div>
      </div>
    </>
  );
}
