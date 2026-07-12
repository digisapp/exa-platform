export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { EventCountdown } from "@/app/(public)/shows/[slug]/event-countdown";
import { ShareButton } from "@/components/ui/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageCheckoutButton } from "@/components/events/package-checkout-button";
import {
  MapPin,
  Calendar,
  Ticket,
  Sparkles,
  ArrowRight,
  Users,
  CheckCircle2,
  Tv,
  Handshake,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

// Dynamic, fully data-driven event landing page (Events Phase 2b).
// Everything renders from the event row's capability columns and linked data —
// zero slug-conditional logic, so a new show (NYFW, Art Week, MSW 2027…)
// launches as an events row + event_packages rows, no code deploy.
//
// Note on visibility: events has no is_published column — status is the only
// gate. Cancelled events 404; upcoming/active/completed all render (completed
// as a recap).

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ checkout?: string }>;
}

interface EventRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  year: number;
  description: string | null;
  cover_image_url: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  meta_title: string | null;
  meta_description: string | null;
  ticket_url: string | null;
  tickets_enabled: boolean | null;
  use_external_ticketing: boolean | null;
  has_casting_call: boolean | null;
  countdown_at: string | null;
}

interface CastingGig {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  start_at: string | null;
  application_deadline: string | null;
  spots: number | null;
  spots_filled: number | null;
  compensation_type: string | null;
  compensation_description: string | null;
}

interface EventPackage {
  id: string;
  key: string;
  category: string;
  name: string;
  description: string | null;
  full_price_cents: number;
  installment_price_cents: number;
  installments_available: boolean;
  sort_order: number;
}

const PACKAGE_CATEGORY_LABELS: Record<string, string> = {
  runway: "Runway Shows",
  showroom: "Private Showrooms",
  retail: "Retail & Pop-Ups",
  shoot: "Content & Shoots",
  party: "Party Sponsorships",
  other: "More Opportunities",
};
const PACKAGE_CATEGORY_ORDER = ["runway", "showroom", "retail", "shoot", "party", "other"];

function fmtUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

function dateRangeDisplay(event: Pick<EventRow, "start_date" | "end_date">): string {
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;
  if (startDate && endDate) return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
  if (startDate) return format(startDate, "MMMM d, yyyy");
  return "Dates TBA";
}

function locationDisplay(event: Pick<EventRow, "location_name" | "location_city" | "location_state">): string | null {
  const cityState =
    event.location_city && event.location_state
      ? `${event.location_city}, ${event.location_state}`
      : event.location_city || event.location_state;
  if (event.location_name && cityState) return `${event.location_name} · ${cityState}`;
  return event.location_name || cityState || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("name, description, meta_title, meta_description, cover_image_url, status, start_date, end_date, location_city, location_state")
    .eq("slug", slug)
    .single() as { data: any };

  if (!data || data.status === "cancelled") {
    return { title: "Event Not Found | EXA" };
  }

  const title = data.meta_title || `${data.name} | EXA Models`;
  const description =
    data.meta_description ||
    data.description ||
    `${data.name} — presented by EXA Models. Casting, tickets, and brand partnerships.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.examodels.com/events/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.examodels.com/events/${slug}`,
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

export default async function EventLandingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single() as { data: EventRow | null };

  if (!event || event.status === "cancelled") {
    notFound();
  }

  const isCompleted = event.status === "completed";
  const isActive = event.status === "active";
  const isUpcoming = !isCompleted && !isActive;

  // ---- Conditional data: casting gigs + B2B packages (public-safe fields only)
  const [{ data: castingGigs }, { data: packages }] = await Promise.all([
    event.has_casting_call && !isCompleted
      ? (supabase
          .from("gigs")
          .select("id, slug, title, description, type, start_at, application_deadline, spots, spots_filled, compensation_type, compensation_description")
          .eq("event_id", event.id)
          .eq("status", "open")
          .eq("visibility", "public")
          .order("start_at", { ascending: true }) as any)
      : Promise.resolve({ data: [] }),
    // RLS only exposes is_active packages to anon; filter explicitly anyway.
    (supabase as any)
      .from("event_packages")
      .select("id, key, category, name, description, full_price_cents, installment_price_cents, installments_available, sort_order")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]) as [{ data: CastingGig[] | null }, { data: EventPackage[] | null }];

  const gigs = castingGigs || [];
  const activePackages = packages || [];
  const showCasting = !!event.has_casting_call && !isCompleted && gigs.length > 0;
  const showPackages = !isCompleted && activePackages.length > 0;

  // Tickets block: external ticketing links straight out to the provider URL
  // (same destination the profile ticket ticker ultimately drives to); events
  // on EXA's internal ticket flow link to their /shows page checkout.
  const externalTicketUrl = event.use_external_ticketing && event.ticket_url ? event.ticket_url : null;
  const internalTicketsHref = !event.use_external_ticketing && event.tickets_enabled ? `/shows/${event.slug}` : null;
  const showTickets = !isCompleted && (!!externalTicketUrl || !!internalTicketsHref);

  // Packages grouped by category, in a stable marketing order.
  const packagesByCategory = PACKAGE_CATEGORY_ORDER.map((category) => ({
    category,
    label: PACKAGE_CATEGORY_LABELS[category] || PACKAGE_CATEGORY_LABELS.other,
    items: activePackages.filter((p) => (PACKAGE_CATEGORY_ORDER.includes(p.category) ? p.category : "other") === category),
  })).filter((g) => g.items.length > 0);

  // ---- Navbar user context (standard public-page pattern)
  const { data: { user } } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

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
        .select("id, username, profile_photo_url, coin_balance")
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
  }

  const displayName = profileData?.display_name || profileData?.username || undefined;

  const dateDisplay = dateRangeDisplay(event);
  const location = locationDisplay(event);

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    description: event.description || `${event.name} — presented by EXA Models.`,
    url: `https://www.examodels.com/events/${event.slug}`,
    ...(event.cover_image_url && { image: event.cover_image_url }),
    ...(event.start_date && { startDate: event.start_date }),
    ...(event.end_date && { endDate: event.end_date }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(location && {
      location: {
        "@type": "Place",
        name: event.location_name || location,
        address: {
          "@type": "PostalAddress",
          ...(event.location_city && { addressLocality: event.location_city }),
          ...(event.location_state && { addressRegion: event.location_state }),
          addressCountry: event.location_country || "US",
        },
      },
    }),
    organizer: {
      "@type": "Organization",
      name: "EXA Models",
      url: "https://www.examodels.com",
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

        {/* ---------------- Hero ---------------- */}
        <div className="relative overflow-hidden">
          {event.cover_image_url ? (
            <div className="absolute inset-0">
              <Image
                src={event.cover_image_url}
                alt={event.name}
                fill
                priority
                className="object-cover opacity-40"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.12),transparent_55%)]" />
          )}

          <div className="relative container px-4 md:px-8 pt-12 md:pt-20 pb-10 md:pb-14">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-white/10 text-white border-0 text-xs font-semibold px-2.5 py-0.5">
                  {event.short_name} {event.year}
                </Badge>
                {isActive && (
                  <Badge className="bg-green-500 text-white border-0 text-xs animate-pulse">
                    Live Now
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="bg-white/10 text-white/70 border-0 text-xs">
                    Event Wrapped
                  </Badge>
                )}
              </div>
              <ShareButton title={event.name} url={`https://www.examodels.com/events/${event.slug}`} />
            </div>

            <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/90 font-bold mb-2">
              {isCompleted ? "Presented by EXA Models" : isActive ? "Happening Now" : "Upcoming Event"}
            </p>
            <h1 className="text-3xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              <span className="exa-gradient-text">{event.name}</span>
            </h1>

            <div className="flex flex-wrap gap-2 md:gap-3">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-sm text-white/90">{dateDisplay}</span>
              </div>
              {location && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  <span className="font-semibold text-sm text-white/90">{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="container px-4 md:px-8 pb-16">
          {/* Package checkout success banner (Stripe returns here) */}
          {checkout === "success" && (
            <div className="mb-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-[0_0_18px_rgba(52,211,153,0.2)]">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-200">Payment received — welcome aboard!</p>
                  <p className="text-sm text-white/70 mt-0.5">
                    Our team will reach out shortly to start planning your {event.name} experience.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isActive && (
            <div className="mb-8 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <p className="text-emerald-300 font-bold text-sm">Happening Now 🎉</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* -------- Main column -------- */}
            <div className="lg:col-span-2 space-y-8">
              {/* About / recap */}
              <div className="glass-card rounded-2xl p-6 md:p-8">
                {isCompleted && (
                  <p className="text-lg md:text-xl font-medium text-white/90 mb-4">
                    That&apos;s a wrap on {event.name} — thank you to every model, designer, and partner who made it happen.
                  </p>
                )}
                {event.description ? (
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg">
                    {event.description}
                  </p>
                ) : (
                  !isCompleted && (
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      Full details coming soon — check back for the lineup, schedule, and tickets.
                    </p>
                  )
                )}
                {isCompleted && (
                  <Link
                    href="/tv"
                    className="group mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10 border border-white/10 hover:border-pink-500/40 p-4 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]"
                  >
                    <div className="p-2 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30 group-hover:shadow-[0_0_12px_rgba(236,72,153,0.4)] transition-all">
                      <Tv className="h-4 w-4 text-pink-300" />
                    </div>
                    <span className="text-sm font-semibold text-white">Relive past shows on EXA TV</span>
                    <ArrowRight className="h-4 w-4 text-white/40 ml-auto transition-all group-hover:text-pink-300 group-hover:translate-x-1" />
                  </Link>
                )}
              </div>

              {/* -------- Casting call -------- */}
              {showCasting && (
                <div id="casting" className="rounded-2xl border border-pink-500/25 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30">
                      <Sparkles className="h-5 w-5 text-pink-300" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold">Model Casting Call</p>
                      <h2 className="text-xl md:text-2xl font-bold text-white">
                        <span className="exa-gradient-text">Walk in {event.short_name} {event.year}</span>
                      </h2>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 mb-6">
                    Applications are open — apply on EXA and our casting team will review your profile.
                  </p>

                  <div className="space-y-4">
                    {gigs.map((gig) => {
                      const spotsLeft =
                        gig.spots != null ? Math.max(0, gig.spots - (gig.spots_filled ?? 0)) : null;
                      return (
                        <div
                          key={gig.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-pink-500/40 transition-all"
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-white mb-1">{gig.title}</h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                                {gig.start_at && (
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                                    {format(new Date(gig.start_at), "MMM d, yyyy")}
                                  </span>
                                )}
                                {gig.application_deadline && (
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-pink-400" />
                                    Apply by {format(new Date(gig.application_deadline), "MMM d, yyyy")}
                                  </span>
                                )}
                                {spotsLeft !== null && spotsLeft > 0 && (
                                  <span className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-violet-400" />
                                    {spotsLeft} spots left
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              asChild
                              className="shrink-0 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold rounded-xl shadow-[0_0_16px_rgba(236,72,153,0.25)]"
                            >
                              <Link href={`/gigs/${gig.slug}`}>
                                Apply Now
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------- B2B packages -------- */}
              {showPackages && (
                <div id="packages" className="rounded-2xl border border-violet-500/25 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30">
                      <Handshake className="h-5 w-5 text-violet-300" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold">Designers &amp; Sponsors</p>
                      <h2 className="text-xl md:text-2xl font-bold text-white">
                        <span className="exa-gradient-text">Partner with us</span>
                      </h2>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 mb-6">
                    Put your brand on the runway — show your collection, host a showroom, or sponsor the week.
                  </p>

                  <div className="space-y-8">
                    {packagesByCategory.map((group) => (
                      <div key={group.category}>
                        <h3 className="text-xs uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">
                          {group.label}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {group.items.map((pkg) => (
                            <div
                              key={pkg.id}
                              className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-violet-500/40 transition-all"
                            >
                              <h4 className="font-bold text-white leading-snug mb-1.5">{pkg.name}</h4>
                              {pkg.description && (
                                <p className="text-xs text-white/60 leading-relaxed mb-4">{pkg.description}</p>
                              )}
                              <div className="mt-auto">
                                <div className="flex items-baseline gap-2 mb-3">
                                  <span className="text-2xl font-bold exa-gradient-text">
                                    ${fmtUsd(pkg.full_price_cents)}
                                  </span>
                                  {pkg.installments_available && (
                                    <span className="text-xs text-white/50">
                                      or 3 × ${fmtUsd(pkg.installment_price_cents)}/mo
                                    </span>
                                  )}
                                </div>
                                <PackageCheckoutButton
                                  eventSlug={event.slug}
                                  packageKey={pkg.key}
                                  installmentsAvailable={pkg.installments_available}
                                  installmentPriceCents={pkg.installment_price_cents}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* -------- Sidebar -------- */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {isUpcoming && (event.countdown_at || event.start_date) && (
                  <EventCountdown startsAt={event.countdown_at ?? event.start_date!} />
                )}

                {/* Tickets */}
                {showTickets && (
                  <div id="tickets" className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5">
                    <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">Tickets</h3>
                    {externalTicketUrl ? (
                      <Button
                        asChild
                        size="lg"
                        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-base py-5 rounded-xl shadow-lg shadow-pink-500/25"
                      >
                        <a href={externalTicketUrl} target="_blank" rel="noopener noreferrer">
                          <Ticket className="h-5 w-5 mr-2" />
                          Get Tickets
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="lg"
                        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-base py-5 rounded-xl shadow-lg shadow-pink-500/25"
                      >
                        <Link href={internalTicketsHref!}>
                          <Ticket className="h-5 w-5 mr-2" />
                          Get Tickets
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

                {/* Quick links into the page sections */}
                {(showCasting || showPackages) && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold px-1">Join the Show</p>
                    {showCasting && (
                      <a
                        href="#casting"
                        className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/40 hover:border-pink-500/70 text-pink-200 font-semibold transition-all hover:shadow-[0_0_16px_rgba(236,72,153,0.3)]"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Models — Apply to Walk
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-80" />
                      </a>
                    )}
                    {showPackages && (
                      <a
                        href="#packages"
                        className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 hover:border-violet-500/70 text-violet-200 font-semibold transition-all hover:shadow-[0_0_16px_rgba(167,139,250,0.3)]"
                      >
                        <span className="flex items-center gap-2">
                          <Handshake className="h-4 w-4" />
                          Brands — Partner With Us
                        </span>
                        <ArrowRight className="h-4 w-4 opacity-80" />
                      </a>
                    )}
                  </div>
                )}

                {/* All events link */}
                <Link
                  href="/events"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/40 text-white/70 hover:text-white text-sm font-semibold transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                    All EXA Events
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative mt-8 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
          </p>
        </footer>
      </div>
    </CoinBalanceProvider>
  );
}
