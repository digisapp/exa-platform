import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import {
  MapPin,
  Camera,
  Megaphone,
  PartyPopper,
  Plane,
  Calendar,
  ArrowLeft,
  MessageCircle,
  Clock,
  CheckCircle2,
  EyeOff,
  Handshake,
  Instagram,
  TrendingUp,
} from "lucide-react";
import { ClickableRateCard } from "@/components/bookings/ClickableRateCard";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: model } = await supabase
    .from("models")
    .select("first_name, last_name, username, bio, profile_photo_url, is_approved")
    .eq("username", username)
    .single() as { data: any };

  if (!model) {
    return { title: "Model Not Found | EXA" };
  }

  // For unapproved models, return generic metadata (only owner can see)
  if (!model.is_approved) {
    return { title: "Rates Preview | EXA Models" };
  }

  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  return {
    title: `${displayName} - Rates & Booking | EXA Models`,
    description: `View ${displayName}'s rates and book for photoshoots, events, and more.`,
    openGraph: {
      title: `${displayName} - Rates & Booking | EXA Models`,
      description: `View ${displayName}'s rates and book for photoshoots, events, and more.`,
      images: model.profile_photo_url ? [model.profile_photo_url] : [],
    },
  };
}

export default async function ModelRatesPage({ params }: Props) {
  const { username } = await params;
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

  // Check if model has any booking rates
  const hasPhotographyRates = (model.photoshoot_hourly_rate || 0) > 0 ||
    (model.photoshoot_half_day_rate || 0) > 0 ||
    (model.photoshoot_full_day_rate || 0) > 0;
  const hasPromoRates = (model.promo_hourly_rate || 0) > 0 ||
    (model.brand_ambassador_daily_rate || 0) > 0;
  const hasPrivateRates = (model.private_event_hourly_rate || 0) > 0 ||
    (model.social_companion_hourly_rate || 0) > 0 ||
    (model.meet_greet_rate || 0) > 0;
  const hasTravelFee = (model.travel_fee || 0) > 0;
  const hasAnyRates = hasPhotographyRates || hasPromoRates || hasPrivateRates;

  // Get portfolio photos from content_items (single source of truth)
  const resolveMediaUrl = (url: string) =>
    url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;

  const { data: rawPhotos } = await (supabase as any)
    .from("content_items")
    .select("id, media_url, title, created_at")
    .eq("model_id", model.id)
    .eq("status", "portfolio")
    .eq("media_type", "image")
    .order("created_at", { ascending: false })
    .limit(6) as { data: any[] | null };

  const photos = (rawPhotos || []).map((p: any) => ({
    id: p.id, photo_url: resolveMediaUrl(p.media_url), url: resolveMediaUrl(p.media_url), asset_type: "portfolio", title: p.title, created_at: p.created_at,
  }));

  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  return (
    <div className="min-h-screen relative">
      <FloatingOrbs />

      {/* Preview Banner for unapproved profiles (owner or admin viewing) */}
      {!model.is_approved && (isOwner || isAdmin) && (
        <div className="relative z-20 bg-amber-500/90 text-amber-950 py-3 px-4">
          <div className="container max-w-2xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <EyeOff className="h-4 w-4" />
            <span>{isAdmin ? "Admin View - This profile is hidden (not approved)" : "Rates Preview - Your profile is hidden until approved"}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 container max-w-2xl mx-auto py-6 px-4">
        {/* Back Button */}
        <Link
          href={`/${model.username}`}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Header Card */}
        <div className="profile-card rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {/* Profile Photo */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/30 flex-shrink-0">
              {model.profile_photo_url ? (
                <Image
                  src={model.profile_photo_url}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              )}
              {model.last_active_at && (Date.now() - new Date(model.last_active_at).getTime()) < 5 * 60 * 1000 && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-[#1a0033]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <p className="text-white/60">@{model.username}</p>
              {model.show_location && (model.city || model.state) && (
                <p className="text-sm text-white/50 flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                </p>
              )}
              {/* Focus Tags */}
              {model.focus_tags && model.focus_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {model.focus_tags.map((tag: string) => {
                    const labels: Record<string, string> = {
                      fashion: "Fashion", commercial: "Commercial", fitness: "Fitness", athlete: "Athlete",
                      swimwear: "Swimwear", beauty: "Beauty", editorial: "Editorial",
                      ecommerce: "E-Commerce", promo: "Promo/Event", luxury: "Luxury", lifestyle: "Lifestyle"
                    };
                    return (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-pink-300 border border-white/10"
                      >
                        {labels[tag] || tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Availability Status - based on real activity */}
          {model.last_active_at && (Date.now() - new Date(model.last_active_at).getTime()) < 5 * 60 * 1000 ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 shadow-[0_0_16px_rgba(52,211,153,0.2)] mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-emerald-300 font-semibold">Available for booking</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
              <Clock className="h-4 w-4 text-white/40" />
              <span className="text-white/50 font-medium text-sm">Currently offline</span>
            </div>
          )}

          {/* Bio */}
          {model.bio && (
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {model.bio}
            </p>
          )}

          {/* Message Button */}
          {!isOwner && (
            <Link
              href={user ? `/chats?new=${model.username}` : "/signin"}
              className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-white font-semibold transition-all hover:shadow-[0_0_18px_rgba(236,72,153,0.3)] w-full"
            >
              <MessageCircle className="h-5 w-5 group-hover:text-pink-300 transition-colors" />
              <span className="group-hover:text-pink-100 transition-colors">Send Message</span>
            </Link>
          )}
        </div>

        {/* Rates Cards */}
        {hasAnyRates && !isOwner && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-pink-500/40" />
            <p className="text-center text-white/60 text-xs uppercase tracking-[0.2em] font-semibold">
              Tap any service to book
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-pink-500/40" />
          </div>
        )}
        {!hasAnyRates ? (
          <div className="profile-card rounded-3xl p-8 text-center">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-2xl" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-1 ring-pink-500/40 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-pink-300" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              <span className="exa-gradient-text">No rates set yet</span>
            </h2>
            <p className="text-white/60 max-w-sm mx-auto">
              {isOwner
                ? "Add your booking rates in Settings to start accepting bookings."
                : "This model hasn't set their booking rates yet."}
            </p>
            {isOwner && (
              <Link
                href="/settings?tab=rates"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-semibold transition-all hover:scale-[1.02] shadow-[0_0_18px_rgba(236,72,153,0.4)] hover:shadow-[0_0_24px_rgba(236,72,153,0.6)]"
              >
                Set Your Rates
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Photography Rates */}
            {hasPhotographyRates && (
              <div className="profile-card rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-pink-400" />
                  Photography & Content
                </h3>
                <div className="space-y-3">
                  {(model.photoshoot_hourly_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="photoshoot_hourly"
                      label="Hourly Rate"
                      description="Per hour of shooting"
                      rate={model.photoshoot_hourly_rate}
                      colorClass="text-pink-400"
                      isLoggedIn={!!user}
                    />
                  )}
                  {(model.photoshoot_half_day_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="photoshoot_half_day"
                      label="Half-Day Rate"
                      description="4 hours of shooting"
                      rate={model.photoshoot_half_day_rate}
                      colorClass="text-pink-400"
                      isLoggedIn={!!user}
                    />
                  )}
                  {(model.photoshoot_full_day_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="photoshoot_full_day"
                      label="Full-Day Rate"
                      description="8 hours of shooting"
                      rate={model.photoshoot_full_day_rate}
                      colorClass="text-pink-400"
                      isLoggedIn={!!user}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Promotional Rates */}
            {hasPromoRates && (
              <div className="profile-card rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-blue-400" />
                  Promotional & Events
                </h3>
                <div className="space-y-3">
                  {(model.promo_hourly_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="promo"
                      label="Promo Modeling"
                      description="Per hour for promotional work"
                      rate={model.promo_hourly_rate}
                      colorClass="text-blue-400"
                      isLoggedIn={!!user}
                    />
                  )}
                  {(model.brand_ambassador_daily_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="brand_ambassador"
                      label="Brand Ambassador"
                      description="Daily rate for brand work"
                      rate={model.brand_ambassador_daily_rate}
                      colorClass="text-blue-400"
                      isLoggedIn={!!user}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Private & Social Rates */}
            {hasPrivateRates && (
              <div className="profile-card rounded-2xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <PartyPopper className="h-5 w-5 text-violet-400" />
                  Private & Social
                </h3>
                <div className="space-y-3">
                  {(model.private_event_hourly_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="private_event"
                      label="Private Events"
                      description="Per hour for private events"
                      rate={model.private_event_hourly_rate}
                      colorClass="text-violet-400"
                      isLoggedIn={!!user}
                    />
                  )}
                  {(model.social_companion_hourly_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="social_companion"
                      label="Social Companion"
                      description="Per hour for social events"
                      rate={model.social_companion_hourly_rate}
                      colorClass="text-violet-400"
                      isLoggedIn={!!user}
                    />
                  )}
                  {(model.meet_greet_rate || 0) > 0 && (
                    <ClickableRateCard
                      modelId={model.id}
                      modelName={displayName}
                      modelRates={model}
                      serviceType="meet_greet"
                      label="Meet & Greet"
                      description="Flat fee for appearances"
                      rate={model.meet_greet_rate}
                      colorClass="text-violet-400"
                      isLoggedIn={!!user}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Travel Fee */}
            {hasTravelFee && (
              <div className="profile-card rounded-2xl p-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Travel Fee</p>
                      <p className="text-sm text-white/50">For out-of-area bookings</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-400">{model.travel_fee?.toLocaleString()} coins</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brand Collab Rates */}
        {model.open_to_collabs && (model.instagram_collab_rate || model.tiktok_collab_rate) && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Handshake className="h-5 w-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Brand Collab Rates</h3>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium">Open to Collabs</span>
            </div>
            <div className="space-y-3">
              {model.instagram_collab_rate && (
                <div className="profile-card rounded-2xl p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-400" />
                      <div>
                        <p className="text-white font-medium">Instagram</p>
                        {model.avg_instagram_impressions && (
                          <p className="text-sm text-white/50">~{model.avg_instagram_impressions.toLocaleString()} avg impressions</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-pink-400">${model.instagram_collab_rate.toLocaleString()}</p>
                      <p className="text-xs text-white/50">per post</p>
                      {model.avg_instagram_impressions && model.instagram_collab_rate && (
                        <p className="text-xs text-white/40 mt-1">
                          CPM ${((model.instagram_collab_rate / model.avg_instagram_impressions) * 1000).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {model.tiktok_collab_rate && (
                <div className="profile-card rounded-2xl p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-violet-400" />
                      <div>
                        <p className="text-white font-medium">TikTok</p>
                        {model.avg_tiktok_views && (
                          <p className="text-sm text-white/50">~{model.avg_tiktok_views.toLocaleString()} avg views</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-violet-400">${model.tiktok_collab_rate.toLocaleString()}</p>
                      <p className="text-xs text-white/50">per post</p>
                      {model.avg_tiktok_views && model.tiktok_collab_rate && (
                        <p className="text-xs text-white/40 mt-1">
                          CPM ${((model.tiktok_collab_rate / model.avg_tiktok_views) * 1000).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Preview */}
        {photos && photos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Portfolio</h3>
              <Link
                href={`/${model.username}`}
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
              >
                View Full Profile
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo: any) => (
                <Link
                  key={photo.id}
                  href={`/${model.username}`}
                  className="group relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-pink-500/50 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
                >
                  <Image
                    src={photo.url}
                    alt="Portfolio"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        {!isOwner && hasAnyRates && (
          <div className="mt-6 profile-card rounded-2xl p-5">
            <p className="text-center text-white/70 mb-4">
              Have questions? Send <span className="text-white font-semibold">{displayName}</span> a message.
            </p>
            <Link
              href={user ? `/chats?new=${model.username}` : "/signin"}
              className="group flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-white font-semibold transition-all hover:shadow-[0_0_18px_rgba(236,72,153,0.3)]"
            >
              <MessageCircle className="h-5 w-5 group-hover:text-pink-300 transition-colors" />
              <span className="group-hover:text-pink-100 transition-colors">{user ? "Send Message" : "Sign In to Message"}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
