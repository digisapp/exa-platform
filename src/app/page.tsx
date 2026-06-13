import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { BrandInquiryDialog } from "@/components/auth/BrandInquiryDialog";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { MediaInquiryDialog } from "@/components/auth/MediaInquiryDialog";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Instagram,
  Gavel,
  Coins,
  Play,
  Calendar,
  MapPin,
  Home,
} from "lucide-react";
import { TopModelsCarousel } from "@/components/home/TopModelsCarousel";
import { DigisMarqueeBanner } from "@/components/shows/digis-links";
import { UpcomingEventsCarousel } from "@/components/home/UpcomingEventsCarousel";
import { LiveWall } from "@/components/live-wall/LiveWall";
import { enrichLiveWallAvatars } from "@/lib/live-wall-avatars";
import { formatCoins, coinsToFanUsd, formatUsd } from "@/lib/coin-config";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const metadata: Metadata = {
  title: "EXA Models – Global Model Community",
  description:
    "Book professional models for photoshoots, events, and brand collaborations. Connect directly with verified models worldwide. The premier model booking platform.",
  alternates: {
    canonical: "https://www.examodels.com",
  },
};

// 5-minute ISR window: homepage data (top models, gigs, auctions) doesn't need
// per-minute freshness, and the previous 60s value caused 6+ DB round-trips
// per origin miss to dominate p95 page latency.
export const revalidate = 300;

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Round a real count down to a clean "social proof" number (e.g. 1543 -> "1,500+").
// Always rounds DOWN so the figure is never overstated.
function roundDownNice(n: number): string {
  let step: number;
  if (n < 100) step = 10;
  else if (n < 500) step = 50;
  else if (n < 1000) step = 100;
  else if (n < 5000) step = 500;
  else step = 1000;
  const rounded = Math.floor(n / step) * step;
  return `${rounded.toLocaleString()}+`;
}

export default async function HomePage() {
  const supabase = await createClient();

  // Check if user is logged in (for Live Wall + nav)
  const { data: { user } } = await supabase.auth.getUser();
  let currentActor: { id: string; type: string; coinBalance: number } | null = null;
  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };
    if (actor) {
      let coinBalance = 0;
      if (actor.type === "model") {
        const { data } = await supabase.from("models").select("coin_balance").eq("user_id", user.id).maybeSingle();
        coinBalance = data?.coin_balance ?? 0;
      } else if (actor.type === "fan") {
        const { data } = await supabase.from("fans").select("coin_balance").eq("user_id", user.id).maybeSingle();
        coinBalance = data?.coin_balance ?? 0;
      } else if (actor.type === "brand") {
        const { data } = await supabase.from("brands").select("coin_balance").eq("user_id", user.id).maybeSingle();
        coinBalance = data?.coin_balance ?? 0;
      }
      currentActor = { ...actor, coinBalance };
    }
  }

  // Fetch top 50 models with 4-5 star admin rating (signed-in models with self-uploaded photos)
  // Requires: user_id (signed in) AND avatars bucket (self-uploaded, not Instagram imports)
  const { data: topModelsData } = await (supabase
    .from("models") as any)
    .select(`
      id, username, first_name, profile_photo_url, state, profile_views, admin_rating,
      photoshoot_hourly_rate, photoshoot_half_day_rate, photoshoot_full_day_rate,
      promo_hourly_rate, brand_ambassador_daily_rate, private_event_hourly_rate,
      social_companion_hourly_rate, meet_greet_rate
    `)
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null)
    .not("user_id", "is", null)
    .ilike("profile_photo_url", "%/avatars/%")
    .gte("admin_rating", 4)
    .limit(50);

  // Randomize the order
  const topModels = shuffleArray(topModelsData || []) as any[];

  // Fetch upcoming + currently-running events/gigs.
  // Multi-day events (e.g. Miami Swim Week) should keep showing on the homepage
  // while they're in progress, not vanish once start_at passes — so we include
  // anything whose end_at is still in the future, in addition to future starts.
  const nowIso = new Date().toISOString();
  const { data: upcomingEvents } = await (supabase
    .from("gigs") as any)
    .select("id, slug, title, type, location_city, location_state, start_at, end_at, cover_image_url, spots, spots_filled")
    .eq("status", "open")
    .or(`start_at.gte.${nowIso},end_at.gte.${nowIso}`)
    .neq("title", "EXA Models Creator House - Trip 3")
    .order("start_at", { ascending: true })
    .limit(20);

  // Fetch active auctions for EXA Bids preview
  const { data: activeAuctions } = await (supabase as any)
    .from("auctions")
    .select(`
      id, title, current_bid, starting_price, bid_count, ends_at, cover_image_url,
      model:models!auctions_model_id_fkey (
        first_name, profile_photo_url, username
      )
    `)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: true })
    .limit(4);

  // Fetch upcoming workshop for flyer banner
  const { data: upcomingWorkshop } = await (supabase as any)
    .from("workshops")
    .select("slug, title, subtitle, cover_image_url, date, location_city, location_state, price_cents, spots_available, spots_sold")
    .eq("status", "upcoming")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(1)
    .single();

  // Fetch the 50 most recent messages (newest-first from the DB), then reverse
  // so the wall renders oldest-first / newest-last.
  const { data: rawLiveWallMessagesDesc } = await (supabase as any)
    .from("live_wall_messages")
    .select("id, actor_id, actor_type, display_name, avatar_url, profile_slug, content, message_type, reactions, image_url, image_type, is_pinned, tip_total, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);
  const rawLiveWallMessages = (rawLiveWallMessagesDesc || []).slice().reverse();

  // Re-resolve avatars from current profile data — the column on
  // live_wall_messages is captured at insert time and goes stale
  // when a user uploads/changes their photo after posting.
  const liveWallMessages = (await enrichLiveWallAvatars(
    supabase as any,
    rawLiveWallMessages || []
  )) as any[];

  // The Live Wall only earns its homepage slot when it looks alive. Show it
  // only if there are enough recent messages; otherwise a quiet wall reads as a
  // dead platform to visitors.
  const LIVE_WALL_FRESH_WINDOW_MS = 72 * 60 * 60 * 1000;
  const LIVE_WALL_MIN_RECENT_MESSAGES = 3;
  const liveWallIsFresh =
    liveWallMessages.filter(
      (m) =>
        Date.now() - new Date(m.created_at).getTime() < LIVE_WALL_FRESH_WINDOW_MS
    ).length >= LIVE_WALL_MIN_RECENT_MESSAGES;

  // Upcoming Shows only shows when there's an active/upcoming event (the query
  // already filters to open gigs whose start or end is still in the future).
  const hasUpcomingEvents = (upcomingEvents?.length || 0) > 0;

  // Layout for the shared row: render the whole section only if at least one of
  // the two blocks qualifies, and use two columns only when both do.
  const showEventsWallSection = hasUpcomingEvents || liveWallIsFresh;
  const eventsWallTwoColumn = hasUpcomingEvents && liveWallIsFresh;

  // Live liquidity counts for the hero social-proof strip. Each stat only shows
  // once it clears a floor (so a brand-new, tiny number never reads as weak),
  // and the strip itself only renders when at least two stats qualify.
  const [modelCountRes, showCountRes, brandCountRes] = await Promise.all([
    (supabase.from("models") as any).select("id", { count: "exact", head: true }).eq("is_approved", true),
    (supabase.from("gigs") as any).select("id", { count: "exact", head: true }),
    (supabase.from("brands") as any).select("id", { count: "exact", head: true }),
  ]);
  const proofStats = [
    { count: modelCountRes.count ?? 0, floor: 50, label: "Models" },
    { count: showCountRes.count ?? 0, floor: 10, label: "Castings" },
    { count: brandCountRes.count ?? 0, floor: 5, label: "Brands" },
  ]
    .filter((s) => s.count >= s.floor)
    .map((s) => ({ value: roundDownNice(s.count), label: s.label }));
  const showProofStrip = proofStats.length >= 2;

  return (
    <div className="min-h-screen relative">
      {/* Floating Orbs Background */}
      <FloatingOrbs />

      {/* Content */}
      <div className="relative z-10">
        {/* Scrolling Digis Banner */}
        <DigisMarqueeBanner />

        {/* Navigation */}
        <nav className="container px-8 md:px-16 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="transition-opacity hover:opacity-90">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={100}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/tv"
                className="group/tv inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 rounded-full bg-gradient-to-r from-violet-600/20 via-pink-600/20 to-cyan-600/20 hover:from-violet-600/40 hover:via-pink-600/40 hover:to-cyan-600/40 border border-violet-500/30 hover:border-pink-500/60 text-white/90 hover:text-white text-xs md:text-sm font-semibold transition-all shadow-[0_0_0_0_rgba(236,72,153,0)] hover:shadow-[0_0_16px_rgba(236,72,153,0.4)]"
              >
                <Play className="h-3.5 w-3.5 md:h-4 md:w-4 text-pink-300 group-hover/tv:text-white transition-colors" fill="currentColor" />
                <span className="hidden sm:inline">Watch EXA TV</span>
                <span className="sm:hidden">EXA TV</span>
              </Link>
              {user ? (
                <Link
                  href={currentActor?.type === "admin" ? "/admin" : "/dashboard"}
                  aria-label="Go to dashboard"
                  className="relative flex items-center justify-center h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-white/60 hover:text-pink-300 shadow-[0_0_0_0_rgba(236,72,153,0)] hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
                >
                  <Home className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  href="/signin"
                  className="px-3 md:px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-white/80 hover:text-white text-xs md:text-sm font-semibold transition-all shadow-[0_0_0_0_rgba(236,72,153,0)] hover:shadow-[0_0_16px_rgba(236,72,153,0.35)]"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Split Hero Section */}
        <section id="signup" className="container px-8 md:px-16 py-6 md:py-10 scroll-mt-20">
          {/* Headline + live social-proof strip — frames the audience grid below */}
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Where Models Get{" "}
              <span className="exa-gradient-text">Booked, Discovered &amp; Paid</span>
            </h1>
            <p className="mt-4 md:mt-5 text-base md:text-lg text-white/60 max-w-2xl mx-auto">
              The marketplace connecting fashion models, fans, and brands — runway shows,
              bookings, and direct connections, all in one place.
            </p>

            {showProofStrip && (
              <div className="mt-7 md:mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-14">
                {proofStats.map((s) => (
                  <div key={s.label} className="flex flex-col items-center">
                    <span className="text-2xl md:text-3xl font-bold exa-gradient-text">
                      {s.value}
                    </span>
                    <span className="mt-0.5 text-[11px] md:text-xs uppercase tracking-wider text-white/40">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {/* Models Side — full width on mobile */}
            <div className="col-span-2 lg:col-span-1 relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent border border-pink-500/20 hover:border-pink-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                  Fashion Shows. Bookings.
                  <br />
                  <span className="exa-gradient-text">Get Discovered.</span>
                </h2>

                <ModelSignupDialog>
                  <Button size="lg" className="exa-gradient-button text-base px-8 h-12 rounded-full">
                    Models Sign Up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </ModelSignupDialog>
              </div>
            </div>

            {/* Fans Side */}
            <div className="relative p-4 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <h2 className="text-lg md:text-3xl lg:text-4xl font-bold tracking-tight mb-3 md:mb-4">
                  Chat, Call
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Connect with Models.</span>
                </h2>

                <FanSignupDialog>
                  <Button className="w-full md:w-auto text-sm md:text-base px-4 md:px-8 h-9 md:h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    Fan Sign Up
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4" />
                  </Button>
                </FanSignupDialog>
              </div>
            </div>

            {/* Brands Side */}
            <div className="relative p-4 md:p-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <h2 className="text-lg md:text-3xl lg:text-4xl font-bold tracking-tight mb-3 md:mb-4">
                  Book Models.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Campaigns + more</span>
                </h2>

                <BrandInquiryDialog>
                  <Button className="w-full md:w-auto text-sm md:text-base px-4 md:px-8 h-9 md:h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                    Brand Sign Up
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4" />
                  </Button>
                </BrandInquiryDialog>
              </div>
            </div>

            {/* Media Side */}
            <div className="relative p-4 md:p-8 rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 hover:border-violet-500/40 transition-all group">
              <div className="absolute -top-20 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <h2 className="text-lg md:text-3xl lg:text-4xl font-bold tracking-tight mb-3 md:mb-4">
                  Press. Media.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">Photographers.</span>
                </h2>

                <MediaInquiryDialog>
                  <Button className="w-full md:w-auto text-sm md:text-base px-4 md:px-8 h-9 md:h-12 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white">
                    Media Inquiry
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 md:ml-2 md:h-4 md:w-4" />
                  </Button>
                </MediaInquiryDialog>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Shows + EXA Live Wall (side-by-side on desktop, stacked on
            mobile). Each block renders only when it has something to show:
            Upcoming Shows needs an active/upcoming event, the Live Wall needs
            recent activity. Two columns only when both qualify; the whole
            section is omitted when neither does. */}
        {showEventsWallSection && (
          <section className="container px-8 md:px-16 py-6">
            <div className={eventsWallTwoColumn ? "grid lg:grid-cols-2 gap-6 lg:items-start" : ""}>
              {/* Upcoming Shows — left on desktop, top on mobile */}
              {hasUpcomingEvents && (
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold exa-gradient-text mb-6">
                    Upcoming Shows
                  </h2>
                  <UpcomingEventsCarousel events={upcomingEvents || []} scrollPadding="px-0" />
                </div>
              )}

              {/* EXA Live Wall — right on desktop, below on mobile. Hidden when quiet. */}
              {liveWallIsFresh && (
                <div>
                  <LiveWall
                    initialMessages={liveWallMessages || []}
                    currentUser={
                      currentActor
                        ? { actorId: currentActor.id, actorType: currentActor.type, coinBalance: currentActor.coinBalance }
                        : null
                    }
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Book Top Models Section */}
        <section className="py-8">
          <div className="container px-8 md:px-16 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold exa-gradient-text">
              Book Top Models
            </h2>
          </div>
          <TopModelsCarousel models={topModels || []} showRank={false} showCategories={true} />
        </section>

        {/* Runway Workshop Flyer & EXA Bids */}
        <section className="container px-8 md:px-16 py-8">
          <div className={`grid gap-6 ${upcomingWorkshop?.cover_image_url ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            {/* Runway Workshop Flyer (left) */}
            {upcomingWorkshop?.cover_image_url && (
              <Link href={`/workshops/${upcomingWorkshop.slug}`} className="block group h-full">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 p-[2px] h-full">
                  <div className="relative rounded-3xl bg-black/90 backdrop-blur-xl p-6 md:p-8 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center">
                          <Calendar className="h-7 w-7 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-xl md:text-2xl font-bold text-white truncate">{upcomingWorkshop.title}</h3>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 shrink-0">
                            <span className="text-[10px] text-pink-300 font-bold tracking-wide">
                              WORKSHOP
                            </span>
                          </div>
                        </div>
                        <p className="text-white/60 text-xs md:text-sm truncate">
                          {upcomingWorkshop.subtitle || "Runway training with EXA"}
                        </p>
                      </div>
                    </div>

                    {/* Flyer image */}
                    <div className="relative flex-1 mb-5 rounded-2xl overflow-hidden border border-white/5 min-h-[180px]">
                      <Image
                        src={upcomingWorkshop.cover_image_url}
                        alt={upcomingWorkshop.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Details overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-white/90 text-sm">
                          <Calendar className="h-4 w-4 text-pink-300 shrink-0" />
                          <span className="font-medium">{format(new Date(upcomingWorkshop.date), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        {(upcomingWorkshop.location_city || upcomingWorkshop.location_state) && (
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <MapPin className="h-4 w-4 text-pink-300 shrink-0" />
                            <span>
                              {upcomingWorkshop.location_city && upcomingWorkshop.location_state
                                ? `${upcomingWorkshop.location_city}, ${upcomingWorkshop.location_state}`
                                : upcomingWorkshop.location_city || upcomingWorkshop.location_state}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between gap-3">
                      {upcomingWorkshop.spots_available ? (
                        <span className="text-xs text-white/40">
                          {upcomingWorkshop.spots_available - upcomingWorkshop.spots_sold} spots left
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-sm font-semibold group-hover:scale-105 transition-transform flex items-center gap-2">
                        Register — ${(upcomingWorkshop.price_cents / 100).toFixed(0)}
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* EXA Bids (right) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-violet-500 to-indigo-600 p-[2px] h-full">
              <div className="relative rounded-3xl bg-black/90 backdrop-blur-xl p-6 md:p-8 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-2xl blur-xl opacity-50" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                      <Gavel className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-xl md:text-2xl font-bold text-white">EXA Bids</h3>
                      {(activeAuctions?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-[10px] text-red-400 font-bold tracking-wide">
                            {activeAuctions!.length} LIVE
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-white/60 text-xs md:text-sm">
                      Bid on services & content from top models
                    </p>
                  </div>
                </div>

                {/* Active Auctions Preview */}
                <div className="flex-1 mb-5">
                  {(activeAuctions?.length ?? 0) > 0 ? (
                    <div className="space-y-2">
                      {(activeAuctions || []).map((auction: any) => (
                        <Link
                          key={auction.id}
                          href={`/bids/${auction.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group/row"
                        >
                          <Avatar className="h-9 w-9 border border-violet-500/30 shrink-0">
                            <AvatarImage src={auction.model?.profile_photo_url} />
                            <AvatarFallback className="bg-violet-500/20 text-violet-300 text-xs">
                              {auction.model?.first_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate group-hover/row:text-pink-300 transition-colors">
                              {auction.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                              <span>@{auction.model?.username || auction.model?.first_name}</span>
                              {auction.bid_count > 0 && (
                                <span>· {auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1.5 text-amber-400 justify-end">
                              <Coins className="h-4 w-4" />
                              <span className="text-base font-bold">
                                {formatCoins(auction.current_bid || auction.starting_price)}
                              </span>
                              <span className="text-sm text-white/50 font-medium">
                                ({formatUsd(coinsToFanUsd(auction.current_bid || auction.starting_price))})
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8 rounded-xl bg-white/5">
                      <p className="text-sm text-white/40">No active bids right now</p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link href="/bids" className="block">
                  <div className="flex justify-end">
                    <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold hover:scale-105 transition-transform flex items-center gap-2">
                      Place Bids
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm">
          {/* Decorative top-edge glow */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          <div className="container px-8 md:px-16 py-12">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-2">
                <Link href="/" className="inline-block mb-4">
                  <Image
                    src="/exa-logo-white.png"
                    alt="EXA"
                    width={100}
                    height={40}
                    className="h-10 w-auto"
                  />
                </Link>
                <p className="text-sm text-white/60 max-w-xs leading-relaxed">
                  One platform. Models worldwide.{" "}
                  <span className="exa-gradient-text font-semibold">Bookings, bids, content, community.</span>
                </p>
              </div>

              {/* Platform */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-3">
                  Platform
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/models" className="text-white/70 hover:text-pink-300 transition-colors">
                      Browse Models
                    </Link>
                  </li>
                  <li>
                    <Link href="/bids" className="text-white/70 hover:text-pink-300 transition-colors">
                      Live Bids
                    </Link>
                  </li>
                  <li>
                    <Link href="/boost" className="text-white/70 hover:text-pink-300 transition-colors">
                      EXA Boost
                    </Link>
                  </li>
                  <li>
                    <Link href="/tv" className="text-white/70 hover:text-pink-300 transition-colors">
                      EXA TV
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Join */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-3">
                  Join
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="#signup" className="text-white/70 hover:text-pink-300 transition-colors">
                      Models
                    </Link>
                  </li>
                  <li>
                    <Link href="#signup" className="text-white/70 hover:text-amber-300 transition-colors">
                      Fans
                    </Link>
                  </li>
                  <li>
                    <Link href="#signup" className="text-white/70 hover:text-cyan-300 transition-colors">
                      Brands
                    </Link>
                  </li>
                  <li>
                    <Link href="#signup" className="text-white/70 hover:text-violet-300 transition-colors">
                      Media & Press
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-3">
                  Company
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/shows" className="text-white/70 hover:text-pink-300 transition-colors">
                      Shows
                    </Link>
                  </li>
                  <li>
                    <Link href="/workshops" className="text-white/70 hover:text-pink-300 transition-colors">
                      Workshops
                    </Link>
                  </li>
                  <li>
                    <Link href="/for-models" className="text-white/70 hover:text-pink-300 transition-colors">
                      For Models
                    </Link>
                  </li>
                  <li>
                    <Link href="/signin" className="text-white/70 hover:text-pink-300 transition-colors">
                      Sign In
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
              <p className="text-xs text-white/40">
                &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://instagram.com/examodels"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="group flex items-center justify-center h-9 w-9 rounded-full bg-white/5 hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-white/60 hover:text-pink-300 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
