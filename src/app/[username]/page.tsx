import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import {
  MapPin,
  Instagram,
  Calendar,
} from "lucide-react";
import { TikTokIcon } from "@/components/ui/tiktok-icon";
import { SnapchatIcon } from "@/components/ui/snapchat-icon";
import type { Metadata } from "next";
import { ShareButton } from "@/components/ui/share-button";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileContentTabs } from "@/components/profile/ProfileContentTabs";

// Reserved paths that should NOT be treated as usernames
const RESERVED_PATHS = [
  'signin', 'signup', 'models', 'gigs', 'dashboard', 'profile', 'messages',
  'leaderboard', 'admin', 'onboarding', 'brands', 'designers', 'media',
  'api', 'auth', '_next', 'favicon.ico', 'wallet', 'content', 'coins',
  'earnings', 'fan', 'opportunities', 'settings', 'notifications', 'search',
  'explore', 'trending', 'popular', 'new', 'hot', 'top', 'best', 'featured',
  'favorites', 'chats', 'claim', 'forgot-password', 'rates', 'book', 'booking',
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

  const { data: model } = await supabase
    .from("models")
    .select("first_name, last_name, username, bio, profile_photo_url")
    .eq("username", username)
    .eq("is_approved", true)
    .single() as { data: any };

  if (!model) {
    return { title: "Model Not Found | EXA" };
  }

  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  return {
    title: `${displayName} | EXA Models`,
    description: model.bio || `View ${displayName}'s profile on EXA Models`,
    openGraph: {
      title: `${displayName} | EXA Models`,
      description: model.bio || `View ${displayName}'s profile on EXA Models`,
      images: model.profile_photo_url ? [model.profile_photo_url] : [],
      url: `https://examodels.com/${model.username}`,
    },
  };
}

export default async function ModelProfilePage({ params }: Props) {
  const { username } = await params;

  if (RESERVED_PATHS.includes(username.toLowerCase())) {
    notFound();
  }

  const supabase = await createClient();

  // Get model
  const { data: model } = await supabase
    .from("models")
    .select("*")
    .eq("username", username)
    .eq("is_approved", true)
    .single() as { data: any };

  if (!model) {
    notFound();
  }

  // Get portfolio photos
  const { data: photos } = await supabase
    .from("media_assets")
    .select("*")
    .eq("model_id", model.id)
    .eq("asset_type", "portfolio")
    .order("created_at", { ascending: false })
    .limit(12) as { data: any[] | null };

  // Get videos
  const { data: videos } = await supabase
    .from("media_assets")
    .select("*")
    .eq("model_id", model.id)
    .eq("asset_type", "video")
    .order("created_at", { ascending: false })
    .limit(12) as { data: any[] | null };

  // Get PPV content count (only paid content)
  const { count: premiumContentCount } = await supabase
    .from("premium_content")
    .select("*", { count: "exact", head: true })
    .eq("model_id", model.id)
    .eq("is_active", true)
    .gt("coin_price", 0);

  // Get current user info
  const { data: { user } } = await supabase.auth.getUser();
  let currentActorId: string | null = null;
  let coinBalance = 0;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (actor) {
      currentActorId = actor.id;

      if (actor.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        coinBalance = fan?.coin_balance || 0;
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

  const isOwner = Boolean(user && model.user_id === user.id);

  // Get model's actor ID
  const { data: modelActor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", model.user_id)
    .single() as { data: { id: string } | null };

  const modelActorId = modelActor?.id || null;

  // Check if current user has favorited this model
  let isFavorited = false;
  let favoriteCount = 0;

  if (modelActorId) {
    // Get favorite count
    const { count } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", modelActorId);
    favoriteCount = count || 0;

    // Check if current user favorited
    if (currentActorId) {
      const { data: favorite } = await (supabase
        .from("follows") as any)
        .select("follower_id")
        .eq("follower_id", currentActorId)
        .eq("following_id", modelActorId)
        .single();
      isFavorited = !!favorite;
    }
  }

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

  return (
    <div className="min-h-screen relative">
      <FloatingOrbs />

      <div className="relative z-10 container max-w-lg mx-auto py-6 px-4">
        {/* Main Profile Card */}
        <div className="profile-card rounded-3xl p-6 text-center relative">
          {/* Header Row: Logo and Share */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={60}
                height={24}
                className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity"
              />
            </Link>
            <div className="flex items-center gap-2">
              <FavoriteButton
                modelId={model.id}
                modelUsername={model.username}
                isLoggedIn={!!user}
                isOwner={isOwner}
                initialFavorited={isFavorited}
                count={favoriteCount}
              />
              <ShareButton title={displayName} />
            </div>
          </div>

          {/* Profile Image */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className={`w-40 h-40 rounded-full overflow-hidden ${isOwner ? 'profile-pic-breathing' : 'ring-2 ring-white/30 shadow-[0_0_30px_rgba(255,105,180,0.3),0_0_60px_rgba(0,191,255,0.2)]'}`}>
                {model.profile_photo_url ? (
                  <img
                    src={model.profile_photo_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                    <span className="text-5xl">👤</span>
                  </div>
                )}
              </div>
              {/* Online Indicator */}
              {model.availability_status === 'available' && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a0033]" />
              )}
            </div>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-white mb-3">
            {displayName}
          </h1>

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
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110"
                  title={`@${link.username}`}
                >
                  {link.platform === "instagram" && <Instagram className="h-4 w-4 text-white" />}
                  {link.platform === "tiktok" && <TikTokIcon className="h-4 w-4 text-white" />}
                  {link.platform === "snapchat" && <SnapchatIcon className="h-4 w-4 text-white" />}
                  {link.platform === "x" && <span className="text-white text-sm font-bold">𝕏</span>}
                  {link.platform === "youtube" && <span className="text-white text-sm">▶</span>}
                  {link.platform === "twitch" && <span className="text-white text-sm">📺</span>}
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
            messageRate={model.message_rate || 0}
            videoCallRate={model.video_call_rate || 0}
            voiceCallRate={model.voice_call_rate || 0}
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
                    className="group relative flex items-center justify-center w-full px-5 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/10"
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
  );
}
