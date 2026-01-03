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
} from "lucide-react";
import { BookingRequestModal } from "@/components/bookings/BookingRequestModal";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
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

  // Get portfolio photos
  const { data: photos } = await supabase
    .from("media_assets")
    .select("*")
    .eq("model_id", model.id)
    .eq("asset_type", "portfolio")
    .order("created_at", { ascending: false })
    .limit(6) as { data: any[] | null };

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = Boolean(user && model.user_id === user.id);

  const displayName = model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username;

  return (
    <div className="min-h-screen relative">
      <FloatingOrbs />

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
                  unoptimized={model.profile_photo_url.includes("cdninstagram.com")}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              )}
              {model.availability_status === "available" && (
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
            </div>
          </div>

          {/* Availability Status */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
            {model.availability_status === "available" ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-white font-medium">Available for Booking</span>
              </>
            ) : model.availability_status === "busy" ? (
              <>
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-white font-medium">Limited Availability</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-red-500" />
                <span className="text-white font-medium">Currently Unavailable</span>
              </>
            )}
          </div>

          {/* Bio */}
          {model.bio && (
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {model.bio}
            </p>
          )}

          {/* Quick Actions */}
          {!isOwner && (
            <div className="flex gap-3">
              {user ? (
                <BookingRequestModal
                  modelId={model.id}
                  modelName={displayName}
                  modelRates={{
                    photoshoot_hourly_rate: model.photoshoot_hourly_rate,
                    photoshoot_half_day_rate: model.photoshoot_half_day_rate,
                    photoshoot_full_day_rate: model.photoshoot_full_day_rate,
                    promo_hourly_rate: model.promo_hourly_rate,
                    brand_ambassador_daily_rate: model.brand_ambassador_daily_rate,
                    private_event_hourly_rate: model.private_event_hourly_rate,
                    social_companion_hourly_rate: model.social_companion_hourly_rate,
                    meet_greet_rate: model.meet_greet_rate,
                  }}
                  trigger={
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold transition-all hover:scale-[1.02]">
                      <Calendar className="h-5 w-5" />
                      Request Booking
                    </button>
                  }
                />
              ) : (
                <Link
                  href="/signin"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold transition-all hover:scale-[1.02]"
                >
                  <Calendar className="h-5 w-5" />
                  Sign In to Book
                </Link>
              )}
              <Link
                href={user ? `/chats?new=${model.username}` : "/signin"}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>

        {/* Rates Cards */}
        {!hasAnyRates ? (
          <div className="profile-card rounded-3xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
              <Calendar className="h-8 w-8 text-white/50" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Rates Set</h2>
            <p className="text-white/60">
              {isOwner
                ? "Add your booking rates in Settings to start accepting bookings."
                : "This model hasn't set their booking rates yet."}
            </p>
            {isOwner && (
              <Link
                href="/profile?tab=rates"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-medium transition-colors"
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
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Hourly Rate</p>
                        <p className="text-sm text-white/50">Per hour of shooting</p>
                      </div>
                      <p className="text-xl font-bold text-pink-400">{model.photoshoot_hourly_rate?.toLocaleString()} coins</p>
                    </div>
                  )}
                  {(model.photoshoot_half_day_rate || 0) > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Half-Day Rate</p>
                        <p className="text-sm text-white/50">4 hours of shooting</p>
                      </div>
                      <p className="text-xl font-bold text-pink-400">{model.photoshoot_half_day_rate?.toLocaleString()} coins</p>
                    </div>
                  )}
                  {(model.photoshoot_full_day_rate || 0) > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Full-Day Rate</p>
                        <p className="text-sm text-white/50">8 hours of shooting</p>
                      </div>
                      <p className="text-xl font-bold text-pink-400">{model.photoshoot_full_day_rate?.toLocaleString()} coins</p>
                    </div>
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
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Promo Modeling</p>
                        <p className="text-sm text-white/50">Per hour for promotional work</p>
                      </div>
                      <p className="text-xl font-bold text-blue-400">{model.promo_hourly_rate?.toLocaleString()} coins</p>
                    </div>
                  )}
                  {(model.brand_ambassador_daily_rate || 0) > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Brand Ambassador</p>
                        <p className="text-sm text-white/50">Daily rate for brand work</p>
                      </div>
                      <p className="text-xl font-bold text-blue-400">{model.brand_ambassador_daily_rate?.toLocaleString()} coins</p>
                    </div>
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
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Private Events</p>
                        <p className="text-sm text-white/50">Per hour for private events</p>
                      </div>
                      <p className="text-xl font-bold text-violet-400">{model.private_event_hourly_rate?.toLocaleString()} coins</p>
                    </div>
                  )}
                  {(model.social_companion_hourly_rate || 0) > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Social Companion</p>
                        <p className="text-sm text-white/50">Per hour for social events</p>
                      </div>
                      <p className="text-xl font-bold text-violet-400">{model.social_companion_hourly_rate?.toLocaleString()} coins</p>
                    </div>
                  )}
                  {(model.meet_greet_rate || 0) > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-white font-medium">Meet & Greet</p>
                        <p className="text-sm text-white/50">Flat fee for appearances</p>
                      </div>
                      <p className="text-xl font-bold text-violet-400">{model.meet_greet_rate?.toLocaleString()} coins</p>
                    </div>
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

        {/* Portfolio Preview */}
        {photos && photos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Portfolio</h3>
              <Link
                href={`/${model.username}`}
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
              >
                View Full Profile
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo: any) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden">
                  <Image
                    src={photo.url}
                    alt="Portfolio"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        {!isOwner && hasAnyRates && (
          <div className="mt-6 profile-card rounded-2xl p-5">
            <p className="text-center text-white/70 mb-4">
              Ready to book {displayName}? Send a booking request to get started.
            </p>
            {user ? (
              <BookingRequestModal
                modelId={model.id}
                modelName={displayName}
                modelRates={{
                  photoshoot_hourly_rate: model.photoshoot_hourly_rate,
                  photoshoot_half_day_rate: model.photoshoot_half_day_rate,
                  photoshoot_full_day_rate: model.photoshoot_full_day_rate,
                  promo_hourly_rate: model.promo_hourly_rate,
                  brand_ambassador_daily_rate: model.brand_ambassador_daily_rate,
                  private_event_hourly_rate: model.private_event_hourly_rate,
                  social_companion_hourly_rate: model.social_companion_hourly_rate,
                  meet_greet_rate: model.meet_greet_rate,
                }}
                trigger={
                  <button className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold transition-all hover:scale-[1.02]">
                    <Calendar className="h-5 w-5" />
                    Request Booking
                  </button>
                }
              />
            ) : (
              <Link
                href="/signin"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold transition-all hover:scale-[1.02]"
              >
                <Calendar className="h-5 w-5" />
                Sign In to Book
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
