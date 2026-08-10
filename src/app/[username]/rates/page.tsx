import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { modelSeoDescriptor, modelPublicName } from "@/lib/profile-seo";
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
  EyeOff,
  Handshake,
  Instagram,
  TrendingUp,
} from "lucide-react";
import { ClickableRateCard } from "@/components/bookings/ClickableRateCard";
import { BookModelButton } from "@/components/booking/BookModelButton";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: model } = await supabase
    .from("models")
    .select("username, display_name, bio, profile_photo_url, is_approved, city, state, show_location, focus_tags")
    .eq("username", username)
    .single() as { data: any };

  if (!model) {
    return { title: "Model Not Found | EXA" };
  }

  // For unapproved models, return generic metadata (only owner can see)
  if (!model.is_approved) {
    return { title: "Rates Preview | EXA Models" };
  }

  const displayName = modelPublicName(model);
  const descriptor = modelSeoDescriptor(model);
  const description = `Rates and booking for ${displayName} — ${descriptor} on EXA Models. Photoshoots, promo events, brand collaborations, and more.`;

  return {
    title: `@${displayName} — Rates & Booking`,
    description,
    alternates: {
      canonical: `https://www.examodels.com/${model.username}/rates`,
    },
    openGraph: {
      title: `${displayName} — Rates & Booking | EXA Models`,
      description,
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
    .select(`
      id, user_id, username, display_name, bio, profile_photo_url, is_approved, last_active_at,
      show_location, city, state, focus_tags,
      photoshoot_hourly_rate, photoshoot_half_day_rate, photoshoot_full_day_rate,
      promo_hourly_rate, brand_ambassador_daily_rate, private_event_hourly_rate,
      social_companion_hourly_rate, meet_greet_rate, travel_fee,
      open_to_collabs, instagram_collab_rate, tiktok_collab_rate,
      avg_instagram_impressions, avg_tiktok_views
    `)
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

  // Service client: content_items.media_url is not column-granted to client
  // roles (20260810) — portfolio assets are public-bucket, nothing leaks.
  const { data: rawPhotos } = await (createServiceRoleClient() as any)
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

  const displayName = modelPublicName(model);
  const descriptor = modelSeoDescriptor(model);

  // Booker-facing intro: a one-word fan bio ("hii") reads unprofessional next
  // to real-money rates, so short bios fall back to the descriptor line.
  const bioText: string = model.bio?.trim() || "";
  const introText =
    bioText.length >= 40 ? bioText : descriptor !== "Model" ? descriptor : bioText || null;

  // Tapping a rate opens the team-mediated booking inquiry (USD, no account
  // required) — see ClickableRateCard.
  const bookableModel = {
    id: model.id,
    username: model.username,
    profile_photo_url: model.profile_photo_url,
  };
  const defaultEmail = user?.email;

  // Structured data so rates pages can rank for "book <name>" queries.
  // Public fields only — never social handles or contact info (signup gate),
  // and location only via the show_location-gated descriptor.
  const structuredOffers = [
    { name: "Photoshoot — hourly", price: model.photoshoot_hourly_rate },
    { name: "Photoshoot — half day", price: model.photoshoot_half_day_rate },
    { name: "Photoshoot — full day", price: model.photoshoot_full_day_rate },
    { name: "Promotional modeling — hourly", price: model.promo_hourly_rate },
    { name: "Brand ambassador — daily", price: model.brand_ambassador_daily_rate },
    { name: "Private event — hourly", price: model.private_event_hourly_rate },
    { name: "Social companion — hourly", price: model.social_companion_hourly_rate },
    { name: "Meet & greet", price: model.meet_greet_rate },
  ].filter((o) => (o.price || 0) > 0);

  const jsonLd =
    model.is_approved && structuredOffers.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name: displayName,
          alternateName: `@${model.username}`,
          url: `https://www.examodels.com/${model.username}/rates`,
          ...(model.profile_photo_url ? { image: model.profile_photo_url } : {}),
          jobTitle: "Model",
          description: descriptor,
          makesOffer: structuredOffers.map((o) => ({
            "@type": "Offer",
            price: o.price,
            priceCurrency: "USD",
            itemOffered: { "@type": "Service", name: o.name },
          })),
        }
      : null;

  return (
    <div className="min-h-dvh relative">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
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

          {/* Intro */}
          {introText && (
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {introText}
            </p>
          )}

          {/* How booking works — bookings are team-mediated and async, so we
              show the process instead of live presence (which read "Currently
              offline" for nearly every model and undercut the page). Copy
              matches the inquiry confirmation email's 24-hour promise. */}
          {hasAnyRates && !isOwner && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6">
              <ol className="space-y-2.5">
                {[
                  "Tap a service and tell us your dates",
                  "The EXA team gets back to you within 24 hours",
                  "Confirm details and book securely through EXA",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 ring-1 ring-pink-500/40 text-[11px] font-bold text-pink-300">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-white/40 text-center">No account needed</p>
            </div>
          )}

          {/* Primary CTA: booking first — it needs no account, while chat
              dead-ends anon bookers at a sign-in wall. Messaging stays as a
              quiet secondary link. */}
          {!isOwner && (
            hasAnyRates ? (
              <>
                <BookModelButton
                  model={bookableModel}
                  source="rates"
                  variant="primary"
                  defaultEmail={defaultEmail}
                />
                <Link
                  href={user ? `/chats?new=${model.username}` : "/signin"}
                  className="mt-3 flex items-center justify-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Have a question? Message {displayName}
                </Link>
              </>
            ) : (
              <Link
                href={user ? `/chats?new=${model.username}` : "/signin"}
                className="group flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-white font-semibold transition-all hover:shadow-[0_0_18px_rgba(236,72,153,0.3)] w-full"
              >
                <MessageCircle className="h-5 w-5 group-hover:text-pink-300 transition-colors" />
                <span className="group-hover:text-pink-100 transition-colors">Send Message</span>
              </Link>
            )
          )}
        </div>

        {/* Portfolio strip — bookers decide with their eyes, so photos sit
            above the rates instead of buried at the bottom of the page. */}
        {photos.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Portfolio</h3>
              <Link
                href={`/${model.username}`}
                className="text-sm text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
              >
                View Full Profile
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
              {photos.map((photo: any) => (
                <Link
                  key={photo.id}
                  href={`/${model.username}`}
                  className="relative h-44 aspect-[3/4] flex-shrink-0 snap-start rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-pink-500/50 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
                >
                  <Image
                    src={photo.url}
                    alt={`${displayName} portfolio photo`}
                    fill
                    sizes="132px"
                    className="object-cover"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

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
                      model={bookableModel}
                      serviceType="photoshoot_hourly"
                      label="Hourly Rate"
                      description="Per hour of shooting"
                      rate={model.photoshoot_hourly_rate}
                      unit="/hr"
                      colorClass="text-pink-400"
                      defaultEmail={defaultEmail}
                    />
                  )}
                  {(model.photoshoot_half_day_rate || 0) > 0 && (
                    <ClickableRateCard
                      model={bookableModel}
                      serviceType="photoshoot_half_day"
                      label="Half-Day Rate"
                      description="4 hours of shooting"
                      rate={model.photoshoot_half_day_rate}
                      colorClass="text-pink-400"
                      defaultEmail={defaultEmail}
                    />
                  )}
                  {(model.photoshoot_full_day_rate || 0) > 0 && (
                    <ClickableRateCard
                      model={bookableModel}
                      serviceType="photoshoot_full_day"
                      label="Full-Day Rate"
                      description="8 hours of shooting"
                      rate={model.photoshoot_full_day_rate}
                      colorClass="text-pink-400"
                      defaultEmail={defaultEmail}
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
                      model={bookableModel}
                      serviceType="promo"
                      label="Promo Modeling"
                      description="Per hour for promotional work"
                      rate={model.promo_hourly_rate}
                      unit="/hr"
                      colorClass="text-blue-400"
                      defaultEmail={defaultEmail}
                    />
                  )}
                  {(model.brand_ambassador_daily_rate || 0) > 0 && (
                    <ClickableRateCard
                      model={bookableModel}
                      serviceType="brand_ambassador"
                      label="Brand Ambassador"
                      description="Daily rate for brand work"
                      rate={model.brand_ambassador_daily_rate}
                      unit="/day"
                      colorClass="text-blue-400"
                      defaultEmail={defaultEmail}
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
                      model={bookableModel}
                      serviceType="private_event"
                      label="Private Events"
                      description="Per hour for private events"
                      rate={model.private_event_hourly_rate}
                      unit="/hr"
                      colorClass="text-violet-400"
                      defaultEmail={defaultEmail}
                    />
                  )}
                  {(model.social_companion_hourly_rate || 0) > 0 && (
                    <ClickableRateCard
                      model={bookableModel}
                      serviceType="social_companion"
                      label="Social Companion"
                      description="Per hour for social events"
                      rate={model.social_companion_hourly_rate}
                      unit="/hr"
                      colorClass="text-violet-400"
                      defaultEmail={defaultEmail}
                    />
                  )}
                  {(model.meet_greet_rate || 0) > 0 && (
                    <ClickableRateCard
                      model={bookableModel}
                      serviceType="meet_greet"
                      label="Meet & Greet"
                      description="Flat fee for appearances"
                      rate={model.meet_greet_rate}
                      colorClass="text-violet-400"
                      defaultEmail={defaultEmail}
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
                  <p className="text-xl font-bold text-green-400">${model.travel_fee?.toLocaleString()}</p>
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

        {/* Bottom CTA — booking-first, mirroring the header */}
        {!isOwner && hasAnyRates && (
          <div className="mt-6 profile-card rounded-2xl p-5">
            <p className="text-center text-white/70 mb-4">
              Ready to work with <span className="text-white font-semibold">{displayName}</span>?
            </p>
            <BookModelButton
              model={bookableModel}
              source="rates"
              variant="primary"
              defaultEmail={defaultEmail}
              label={`Book ${displayName}`}
            />
            <Link
              href={user ? `/chats?new=${model.username}` : "/signin"}
              className="mt-3 flex items-center justify-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {user ? "Or send a message with any questions" : "Or sign in to send a message"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
