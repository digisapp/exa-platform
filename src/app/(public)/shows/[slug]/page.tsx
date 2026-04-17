export const revalidate = 60; // Revalidate every 60 seconds

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { ModelsGrid } from "@/components/models/models-grid";
import { EventCountdown } from "./event-countdown";
import { ShareButton } from "@/components/ui/share-button";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Users,
  Ticket,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Instagram,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";
import { TicketCheckout } from "./ticket-checkout";
import { HotelFloorPlan } from "@/components/shows/hotel-floor-plan";
import { MSW_2026_SCHEDULE } from "@/lib/msw-schedule";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("name, description, meta_title, meta_description, cover_image_url")
    .eq("slug", slug)
    .single() as { data: any };

  if (!data) {
    return { title: "Show Not Found | EXA" };
  }

  const title = data.meta_title || `${data.name} | EXA Models`;
  const description = data.meta_description || data.description || `Join us at ${data.name}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.examodels.com/shows/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.examodels.com/shows/${slug}`,
      type: "website",
      siteName: "EXA Models",
      images: data.cover_image_url ? [{ url: data.cover_image_url, width: 1200, height: 630, alt: data.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref: rawRef } = await searchParams;
  // Sanitize ref to prevent XSS - affiliate codes should only be alphanumeric with underscores/hyphens
  const ref = rawRef?.replace(/[^a-zA-Z0-9_-]/g, '') || undefined;
  const supabase = await createClient();

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single() as { data: any };

  if (!event) {
    notFound();
  }

  // Fetch ticket tiers if internal tickets are enabled
  let ticketTiers: any[] = [];
  if (event.tickets_enabled) {
    const now = new Date();
    const { data: tiers } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    ticketTiers = (tiers || []).map((tier: any) => {
      const available = tier.quantity_available === null
        ? null
        : Math.max(0, tier.quantity_available - tier.quantity_sold);

      const isSaleActive =
        (!tier.sale_starts_at || new Date(tier.sale_starts_at) <= now) &&
        (!tier.sale_ends_at || new Date(tier.sale_ends_at) >= now);

      return {
        ...tier,
        available,
        isSoldOut: available === 0,
        isSaleActive,
      };
    });
  }

  const hasInternalTickets = event.tickets_enabled && ticketTiers.length > 0;

  // Get confirmed models via event badge
  // Each event has a linked badge - models with that badge are confirmed
  const { data: eventBadge } = await supabase
    .from("badges")
    .select("id")
    .eq("event_id", event.id)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .single() as { data: { id: string } | null };

  let eventModels: any[] = [];
  if (eventBadge) {
    const { data: badgeHolders } = await supabase
      .from("model_badges")
      .select("model_id")
      .eq("badge_id", eventBadge.id) as { data: { model_id: string }[] | null };

    const modelIds = badgeHolders?.map((b) => b.model_id) || [];

    if (modelIds.length > 0) {
      const { data: fullModels } = await supabase
        .from("models")
        .select("*")
        .in("id", modelIds)
        .not("profile_photo_url", "is", null);
      eventModels = fullModels || [];
    }
  }

  // If there's a referral code (ref), track the affiliate click
  let referringModel = null;
  if (ref) {
    const { data: model } = await supabase
      .from("models")
      .select("id, username, first_name, last_name")
      .eq("affiliate_code", ref)
      .single() as { data: any };

    if (model) {
      referringModel = model;
    }
  }

  // Get current user info for navbar
  const { data: { user } } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let favoriteModelIds: string[] = [];

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      const { data: model } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = model;
      coinBalance = model?.coin_balance ?? 0;
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }

    // Get favorites for logged-in user
    if (actor) {
      const { data: favorites } = await (supabase
        .from("follows") as any)
        .select("following_id, actor:actors!follows_following_id_fkey(user_id)")
        .eq("follower_id", actor.id) as { data: { following_id: string; actor: { user_id: string } | null }[] | null };

      if (favorites && favorites.length > 0) {
        const userIds = favorites
          .map((f) => f.actor?.user_id)
          .filter(Boolean) as string[];

        if (userIds.length > 0) {
          const { data: favModels } = await supabase
            .from("models")
            .select("id")
            .in("user_id", userIds);

          favoriteModelIds = favModels?.map((m: any) => m.id) || [];
        }
      }
    }
  }

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  // Format dates
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const dateDisplay = startDate && endDate
    ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
    : startDate
      ? format(startDate, "MMMM d, yyyy")
      : "TBA";

  // Build ticket URL with affiliate tracking
  const ticketUrl = event.ticket_url
    ? ref
      ? `${event.ticket_url}${event.ticket_url.includes("?") ? "&" : "?"}ref=${ref}`
      : event.ticket_url
    : null;

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.description || `Join us at ${event.name} — presented by EXA Models.`,
    url: `https://www.examodels.com/shows/${event.slug}`,
    ...(event.cover_image_url && { image: event.cover_image_url }),
    ...(event.start_date && { startDate: event.start_date }),
    ...(event.end_date && { endDate: event.end_date }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.location_name || `${event.location_city || "Miami Beach"}, ${event.location_state || "FL"}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.location_city || "Miami Beach",
        addressRegion: event.location_state || "FL",
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "EXA Models",
      url: "https://www.examodels.com",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.examodels.com/shows/${event.slug}`,
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
    },
  };

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <Navbar
        user={user ? {
          id: user.id,
          email: user.email || "",
          avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || undefined,
          name: displayName,
          username: profileData?.username || undefined,
        } : undefined}
        actorType={actorType}
      />

      <main className="container px-4 md:px-8 py-8">
        {/* Hero Section with YouTube Video */}
        <div className="relative rounded-3xl overflow-hidden mb-8">
          <div className="aspect-video relative">
            <iframe
              src="https://www.youtube.com/embed/Iu68o0MCuvw?autoplay=1&mute=1&loop=1&playlist=Iu68o0MCuvw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
              title={event.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Share button — top right of video */}
          <div className="absolute top-4 right-4 z-10 pointer-events-auto">
            <ShareButton title={event.name} url={`https://www.examodels.com/shows/${event.slug}`} />
          </div>

          {/* Event Info Overlay — desktop only */}
          <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
            <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/90 font-bold mb-2 drop-shadow-lg">
              Live Runway Show
            </p>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              {event.name}
            </h1>
            <div className="flex flex-wrap gap-3 text-white/90">
              {(event.location_city || event.location_state) && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  <span className="font-semibold text-sm">
                    {event.location_city && event.location_state
                      ? `${event.location_city}, ${event.location_state}`
                      : event.location_city || event.location_state}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-sm">{dateDisplay}</span>
              </div>
              {eventModels.length > 0 && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-violet-500/30 px-4 py-2 rounded-full shadow-[0_0_12px_rgba(167,139,250,0.2)]">
                  <Users className="h-4 w-4 text-violet-300" />
                  <span className="font-semibold text-sm">{eventModels.length} Confirmed</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile event info — shown only on mobile since overlay is desktop-only */}
        <div className="md:hidden mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/90 font-bold mb-1.5">
            Live Runway Show
          </p>
          <h1 className="text-2xl font-bold text-white mb-3">{event.name}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold text-white">{dateDisplay}</span>
            </div>
            {(event.location_city || event.location_state) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <MapPin className="h-3.5 w-3.5 text-pink-400" />
                <span className="font-semibold text-white">
                  {event.location_city && event.location_state
                    ? `${event.location_city}, ${event.location_state}`
                    : event.location_city || event.location_state}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Referral Banner */}
        {referringModel && (
          <div className="mb-8 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-transparent p-4 shadow-[0_0_18px_rgba(236,72,153,0.15)]">
            <p className="text-center text-sm text-white/80">
              <span className="text-[10px] uppercase tracking-wider text-pink-300 font-bold mr-2">Referred by</span>
              <Link href={`/${referringModel.username}`} className="font-semibold text-pink-300 hover:text-pink-200 transition-colors">
                {referringModel.first_name
                  ? `${referringModel.first_name} ${referringModel.last_name || ""}`.trim()
                  : referringModel.username}
              </Link>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Description - always first */}
          <div className="lg:col-span-2 order-1">
            <div className="glass-card rounded-2xl p-6 md:p-8">
              <p className="text-lg md:text-xl font-medium text-white/90 mb-6">
                The Premier Shows during Swim Week featuring 30+ Global Designers and 150+ World&apos;s Top Models!
              </p>

              {/* Ticket Button with Popup */}
              <div className="mb-6" id="tickets">
                {hasInternalTickets ? (
                  <TicketCheckout
                    tiers={ticketTiers}
                    eventName={event.name}
                    eventDate={dateDisplay}
                    eventLocation={
                      event.location_city && event.location_state
                        ? `${event.location_city}, ${event.location_state}`
                        : event.location_city || event.location_state || undefined
                    }
                    referringModelName={
                      referringModel
                        ? referringModel.first_name || referringModel.username
                        : undefined
                    }
                  />
                ) : ticketUrl ? (
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg py-6 rounded-xl shadow-lg shadow-pink-500/25"
                  >
                    <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                      <Ticket className="h-6 w-6 mr-2" />
                      Get Tickets
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    disabled
                    size="lg"
                    className="w-full text-lg py-6 rounded-xl"
                  >
                    <Ticket className="h-6 w-6 mr-2" />
                    Tickets Coming Soon
                  </Button>
                )}
              </div>

              {event.description && (
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg mb-6">
                  {event.description}
                </p>
              )}

            </div>
          </div>

          {/* Sidebar - second on mobile, right column on desktop spanning both rows */}
          <div className="lg:col-span-1 order-2 lg:row-span-2">
            <div className="sticky top-24 space-y-4">
              {/* Countdown Timer */}
              {event.start_date && (
                <EventCountdown startsAt={event.start_date} />
              )}
              {event.start_date && new Date(event.start_date) <= new Date() && event.end_date && new Date(event.end_date) >= new Date() && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-emerald-300 font-bold text-sm">Happening Now 🎉</p>
                </div>
              )}

              {/* Sign Up Buttons */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold px-1">Join the Show</p>
                <Link href="/designers/miami-swim-week" className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 hover:border-violet-500/70 text-violet-200 font-semibold transition-all hover:shadow-[0_0_16px_rgba(167,139,250,0.3)]">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Designers — Show Collection
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </Link>
                <Link href="/sponsors/miami-swim-week" className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 hover:border-cyan-500/70 text-cyan-200 font-semibold transition-all hover:shadow-[0_0_16px_rgba(34,211,238,0.3)]">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Sponsors — Partner With Us
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </Link>
              </div>

              {/* Sponsor Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5">
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">Sponsored By</h3>
                <a
                  href="https://digis.cc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-white/10 hover:border-pink-500/40 transition-all hover:shadow-[0_0_16px_rgba(236,72,153,0.25)]"
                >
                  <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0 p-1.5 ring-1 ring-white/10">
                    <Image src="/digis-logo-white.png" alt="Digis" width={40} height={40} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Digis</p>
                    <p className="text-xs text-white/50">digis.cc</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-white/40 group-hover:text-pink-300 ml-auto transition-colors" />
                </a>
              </div>
            </div>
          </div>

          {/* Venue Map */}
          {event.slug === "miami-swim-week-2026" && (
            <div className="lg:col-span-2 order-3">
              <HotelFloorPlan />
            </div>
          )}

          {/* Full Week Schedule (MSW-only) */}
          {event.slug === "miami-swim-week-2026" && (
            <div className="lg:col-span-2 order-4" id="schedule">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30">
                    <Calendar className="h-5 w-5 text-pink-300" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    <span className="exa-gradient-text">EXA Shows Schedule</span>
                  </h2>
                </div>

                <div className="space-y-2">
                  {MSW_2026_SCHEDULE.map((s) => (
                    <a
                      key={s.id}
                      href="#tickets"
                      className={`flex items-start gap-4 p-3.5 rounded-xl transition-all cursor-pointer group ${
                        s.highlight
                          ? "border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent shadow-[0_0_14px_rgba(236,72,153,0.12)] hover:border-pink-400/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                          : "bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5"
                      }`}
                    >
                      <div className="text-center flex-shrink-0 w-14">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.dayShort}</p>
                        <p className={`text-xl font-bold leading-none ${s.highlight ? "text-pink-300" : "text-white"}`}>
                          {s.dateNum}
                        </p>
                      </div>
                      <div className="h-10 w-px bg-white/10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white group-hover:text-pink-200 transition-colors mb-0.5">{s.title}</p>
                        <p className="text-xs text-white/55 leading-relaxed">{s.description}</p>
                      </div>
                      <Ticket className="h-4 w-4 text-white/20 group-hover:text-pink-300 flex-shrink-0 mt-1 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Confirmed Models - third on mobile (after sidebar), left column on desktop */}
          {eventModels.length > 0 && (
            <div className="lg:col-span-2 order-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-pink-500/40 blur-lg opacity-50" />
                  <div className="relative p-2 rounded-xl bg-gradient-to-br from-pink-500/25 to-violet-500/25 ring-1 ring-pink-500/40">
                    <Sparkles className="h-6 w-6 text-pink-300" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold">The Lineup</p>
                  <h2 className="text-2xl font-bold text-white">
                    <span className="exa-gradient-text">Confirmed Models</span>
                  </h2>
                  <p className="text-sm text-white/60">{eventModels.length} models walking the runway</p>
                </div>
              </div>
              <ModelsGrid
                models={eventModels}
                isLoggedIn={!!user}
                favoriteModelIds={favoriteModelIds}
                actorType={actorType}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <div className="container px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/exa-logo-white.png" alt="EXA" width={80} height={32} className="h-8 w-auto" />
            <span className="text-sm text-white/50">One Platform. Models Worldwide.</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/examodels"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-white/60 hover:text-pink-300 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-6">
          &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
        </p>
      </footer>

      {/* Affiliate Tracking Script - ref is sanitized at top of component to alphanumeric/underscore/hyphen only */}
      {ref && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                fetch('/api/affiliate/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin',
                  body: JSON.stringify({
                    affiliateCode: ${JSON.stringify(ref)},
                    eventId: ${JSON.stringify(event.id)},
                    source: 'event_page'
                  })
                });
              })();
            `,
          }}
        />
      )}
    </div>
    </CoinBalanceProvider>
  );
}
