import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Instagram,
  MessageCircle,
  Heart,
  Share2,
  Trophy,
  Sparkles,
  Ruler,
  Users,
  Video,
  Eye,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { PremiumContentGrid } from "@/components/content/PremiumContentGrid";
import { FollowButton } from "@/components/social/follow-button";

// Reserved paths that should NOT be treated as usernames
const RESERVED_PATHS = [
  'signin',
  'signup',
  'models',
  'gigs',
  'dashboard',
  'profile',
  'messages',
  'leaderboard',
  'admin',
  'onboarding',
  'brands',
  'designers',
  'media',
  'api',
  'auth',
  '_next',
  'favicon.ico',
  'wallet',
  'content',
];

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  // Check if this is a reserved path
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
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | EXA Models`,
      description: model.bio || `View ${displayName}'s profile on EXA Models`,
      images: model.profile_photo_url ? [model.profile_photo_url] : [],
    },
  };
}

export default async function ModelProfilePage({ params }: Props) {
  const { username } = await params;

  // Check if this is a reserved path - let Next.js handle it
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

  // Get completed opportunities
  const { data: completedShows } = await supabase
    .from("opportunity_applications")
    .select("*, opportunity:opportunities(*)")
    .eq("model_id", model.id)
    .eq("status", "accepted")
    .limit(5) as { data: any[] | null };

  // Get badges
  const { data: badges } = await supabase
    .from("model_badges")
    .select("*, badge:badges(*)")
    .eq("model_id", model.id) as { data: any[] | null };

  // Get premium content count
  const { count: premiumContentCount } = await supabase
    .from("premium_content")
    .select("*", { count: "exact", head: true })
    .eq("model_id", model.id)
    .eq("is_active", true);

  // Get current user info for premium content
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

      // Get coin balance
      if (actor.type === "fan") {
        // Fans use actor.id as their id
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        coinBalance = fan?.coin_balance || 0;
      } else {
        // Models are linked via user_id, not actor.id
        const { data: modelData } = await supabase
          .from("models")
          .select("coin_balance")
          .eq("user_id", user.id)
          .single() as { data: { coin_balance: number } | null };
        coinBalance = modelData?.coin_balance || 0;
      }
    }
  }

  // Check if current user owns this profile (compare user_id)
  const isOwner = Boolean(user && model.user_id === user.id);

  // Get model's actor ID for follows (actors table links to auth.users via user_id)
  const { data: modelActor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", model.user_id)
    .single() as { data: { id: string } | null };

  const modelActorId = modelActor?.id || null;

  // Get follower count and check if current user is following
  let followerCount = 0;
  let isFollowing = false;

  if (modelActorId) {
    // Get follower count
    const { count } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", modelActorId);
    followerCount = count || 0;

    // Check if current user follows this model
    if (currentActorId && currentActorId !== modelActorId) {
      const { data: followRecord } = await (supabase
        .from("follows") as any)
        .select("follower_id")
        .eq("follower_id", currentActorId)
        .eq("following_id", modelActorId)
        .single();
      isFollowing = !!followRecord;
    }
  }

  // Display name
  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  // Determine level based on verification status
  const getLevel = () => {
    if (model.is_verified) return { icon: "✓", label: "Verified", class: "level-verified" };
    if (model.is_featured) return { icon: "⭐", label: "Featured", class: "level-pro" };
    return { icon: "⭐", label: "Rising", class: "level-rising" };
  };
  const level = getLevel();

  return (
    <div className="min-h-screen relative">
      {/* Floating Orbs Background */}
      <FloatingOrbs />

      {/* Content */}
      <div className="relative z-10 container max-w-2xl mx-auto py-8 px-4">
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/models"
            className="inline-flex items-center gap-2 text-[#00BFFF] hover:text-[#FF69B4] transition-colors"
          >
            ← Back to Models
          </Link>
          <Link href="/">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={80}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>

        {/* Main Profile Card */}
        <div className="glass-card rounded-3xl p-8 text-center">
          {/* Profile Image */}
          <div className="flex justify-center mb-6">
            <div className="profile-image-container">
              {model.profile_photo_url ? (
                <img
                  src={model.profile_photo_url}
                  alt={displayName}
                  className="w-48 h-48 object-cover"
                />
              ) : (
                <div className="w-48 h-48 bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                  <span className="text-6xl">👤</span>
                </div>
              )}
            </div>
          </div>

          {/* Online Indicator */}
          {model.availability_status === 'available' && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="online-indicator" />
              <span className="text-sm text-[#00ff00]">Available</span>
            </div>
          )}

          {/* Name with Glow */}
          <h1 className="text-3xl font-bold exa-glow-text mb-2 tracking-wider uppercase">
            {displayName}
          </h1>

          {/* Username */}
          <p className="text-[#00BFFF] mb-4">@{model.username}</p>

          {/* Level Badge */}
          <div className="flex justify-center mb-6">
            <span className={cn(
              "px-4 py-2 rounded-full font-semibold text-sm inline-flex items-center gap-2",
              level.class
            )}>
              <span>{level.icon}</span>
              {level.label}
            </span>
          </div>

          {/* Location */}
          {model.show_location && (model.city || model.state) && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
              <MapPin className="h-4 w-4 text-[#FF69B4]" />
              <span>{model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <Button className="exa-gradient-button h-12 text-base font-semibold rounded-full">
              <MessageCircle className="mr-2 h-5 w-5" />
              Message
            </Button>
            <Button className="exa-gradient-button h-12 text-base font-semibold rounded-full">
              <Video className="mr-2 h-5 w-5" />
              Video Call
            </Button>
            {modelActorId && !isOwner ? (
              <FollowButton
                targetActorId={modelActorId}
                initialIsFollowing={isFollowing}
                initialFollowerCount={followerCount}
                isLoggedIn={!!user}
              />
            ) : (
              <Button variant="outline" className="h-12 rounded-full border-[#FF69B4]/50" disabled>
                <Heart className="mr-2 h-5 w-5 text-[#FF69B4]" />
                {isOwner ? "Your Profile" : "Follow"}
              </Button>
            )}
            <Button variant="outline" className="h-12 rounded-full border-[#00BFFF]/50 hover:border-[#00BFFF] hover:bg-[#00BFFF]/10">
              <Share2 className="mr-2 h-5 w-5 text-[#00BFFF]" />
              Share
            </Button>
          </div>

          {/* Bio */}
          {model.bio && (
            <div className="mb-8 text-left">
              <h2 className="text-lg font-semibold mb-2 exa-gradient-text">About</h2>
              <p className="text-muted-foreground leading-relaxed">{model.bio}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="stat-card">
              <Eye className="h-6 w-6 mx-auto mb-2 text-[#FFED4E]" />
              <p className="text-2xl font-bold">{model.profile_views || 0}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="stat-card">
              <Users className="h-6 w-6 mx-auto mb-2 text-[#FF69B4]" />
              <p className="text-2xl font-bold">{followerCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="stat-card">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-[#00BFFF]" />
              <p className="text-2xl font-bold">{completedShows?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Shows</p>
            </div>
          </div>

          {/* Measurements */}
          {model.show_measurements && (model.height || model.bust || model.waist || model.hips || model.dress_size || model.shoe_size || model.hair_color || model.eye_color) && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text flex items-center justify-center gap-2">
                <Ruler className="h-5 w-5" />
                Measurements
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {model.height && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Height</p>
                    <p className="font-semibold">{model.height}</p>
                  </div>
                )}
                {model.bust && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Bust</p>
                    <p className="font-semibold">{model.bust}</p>
                  </div>
                )}
                {model.waist && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Waist</p>
                    <p className="font-semibold">{model.waist}</p>
                  </div>
                )}
                {model.hips && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Hips</p>
                    <p className="font-semibold">{model.hips}</p>
                  </div>
                )}
                {model.dress_size && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Dress</p>
                    <p className="font-semibold">{model.dress_size}</p>
                  </div>
                )}
                {model.shoe_size && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Shoe</p>
                    <p className="font-semibold">{model.shoe_size}</p>
                  </div>
                )}
                {model.hair_color && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Hair</p>
                    <p className="font-semibold capitalize">{model.hair_color}</p>
                  </div>
                )}
                {model.eye_color && (
                  <div className="stat-card">
                    <p className="text-xs text-muted-foreground mb-1">Eyes</p>
                    <p className="font-semibold capitalize">{model.eye_color}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {model.show_social_media && (model.instagram_name || model.tiktok_username || model.snapchat_username || model.x_username || model.youtube_username || model.twitch_username || model.digis_username) && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text">Social Media</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {model.instagram_name && (
                  <a
                    href={model.instagram_url || `https://instagram.com/${model.instagram_name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:scale-105 transition-transform"
                  >
                    <Instagram className="h-5 w-5" />
                    @{model.instagram_name}
                  </a>
                )}
                {model.tiktok_username && (
                  <a
                    href={`https://tiktok.com/@${model.tiktok_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white border border-white/20 hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">♪</span>
                    @{model.tiktok_username}
                  </a>
                )}
                {model.snapchat_username && (
                  <a
                    href={`https://snapchat.com/add/${model.snapchat_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFFC00] text-black hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">👻</span>
                    @{model.snapchat_username}
                  </a>
                )}
                {model.x_username && (
                  <a
                    href={`https://x.com/${model.x_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white border border-white/20 hover:scale-105 transition-transform"
                  >
                    <span className="font-bold">𝕏</span>
                    @{model.x_username}
                  </a>
                )}
                {model.youtube_username && (
                  <a
                    href={`https://youtube.com/@${model.youtube_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF0000] text-white hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">▶</span>
                    @{model.youtube_username}
                  </a>
                )}
                {model.twitch_username && (
                  <a
                    href={`https://twitch.tv/${model.twitch_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#9146FF] text-white hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">📺</span>
                    @{model.twitch_username}
                  </a>
                )}
                {model.digis_username && (
                  <a
                    href={`https://digis.cc/${model.digis_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">✨</span>
                    @{model.digis_username}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Affiliate Links */}
          {model.affiliate_links && model.affiliate_links.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text">Shop & Deals</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {model.affiliate_links.map((link: { title: string; url: string }, index: number) => (
                  link.title && link.url && (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-full glass-card hover:scale-105 transition-transform"
                    >
                      <span className="text-lg">🔗</span>
                      {link.title}
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {badges && badges.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5" />
                Badges
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {badges.map((mb: any) => (
                  <div
                    key={mb.badge_id || mb.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-full glass-card"
                  >
                    <span className="text-2xl">{mb.badge?.icon || '🏆'}</span>
                    <span className="font-medium">{mb.badge?.name || 'Badge'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shows & Experiences */}
          {completedShows && completedShows.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                Shows & Experiences
              </h2>
              <div className="space-y-3">
                {completedShows.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex items-center gap-4 p-4 rounded-xl glass-card text-left"
                  >
                    <div className="text-3xl">✨</div>
                    <div>
                      <p className="font-semibold">{app.opportunity?.title || 'Show'}</p>
                      {app.opportunity?.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {app.opportunity.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Premium Content */}
          {(premiumContentCount || 0) > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text flex items-center justify-center gap-2">
                <Lock className="h-5 w-5" />
                Premium Content
              </h2>
              <PremiumContentGrid
                modelId={model.id}
                initialCoinBalance={coinBalance}
                isOwner={isOwner}
              />
            </div>
          )}

          {/* Photo Gallery */}
          {photos && photos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 exa-gradient-text">Portfolio</h2>
              <div className="photo-gallery">
                {photos.map((photo: any) => (
                  <div key={photo.id} className="photo-gallery-item">
                    <img src={photo.photo_url || photo.url} alt="" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Portfolio State */}
          {(!photos || photos.length === 0) && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-muted-foreground">No photos yet</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
