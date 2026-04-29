import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { DigisWatchButton } from "@/components/shows/digis-links";

// Cache page for 5 minutes - events don't change frequently
export const revalidate = 300;
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  Ticket,
  Tv,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Shows | EXA Models",
  description: "Discover fashion shows featuring EXA models - EXA's Miami Swim Week, New York Fashion Week, Miami Art Week and more.",
};

export default async function EventsPage() {
  const supabase = await createClient();

  // Get all events
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("status", ["upcoming", "active"])
    .order("start_date", { ascending: true }) as { data: any[] | null };

  // Get confirmed model counts for all events in ONE query (fixes N+1 problem)
  const eventCounts: Record<string, number> = {};
  if (events && events.length > 0) {
    const eventIds = events.map(e => e.id);
    const { data: applications } = await supabase
      .from("gig_applications")
      .select("gigs!inner(event_id)")
      .eq("status", "accepted")
      .in("gigs.event_id", eventIds) as { data: { gigs: { event_id: string } }[] | null };

    // Count applications per event
    (applications || []).forEach(app => {
      const eventId = app.gigs?.event_id;
      if (eventId) {
        eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
      }
    });
  }

  // Get current user info for navbar
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
  }

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
    <div className="min-h-screen bg-background">
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

      {/* Hero Section with YouTube Video */}
      <div className="relative overflow-hidden">
        <div className="aspect-[21/9] md:aspect-[3/1] relative">
          <iframe
            src="https://www.youtube.com/embed/LRzzpEl7kiU?autoplay=1&mute=1&loop=1&playlist=LRzzpEl7kiU&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="EXA Shows"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent pointer-events-none" />
        </div>

        {/* Hero Text Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 pointer-events-none">
          <div className="container px-4 md:px-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(236,72,153,0.5)]">
                {events && events.length > 0 ? `${events.length} UPCOMING` : "COMING SOON"}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-semibold mb-2 drop-shadow">
              Live Runway
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-lg">
              <span className="exa-gradient-text">EXA Shows</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-xl drop-shadow">
              EXA&apos;s Miami Swim Week, NY Fashion Week, Art Week — discover shows featuring EXA models around the world.
            </p>
          </div>
        </div>
      </div>

      <main className="container px-4 md:px-8 py-10">
        {/* EXA TV Link */}
        <Link
          href="/tv"
          className="group mb-8 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10 border border-white/10 hover:border-pink-500/40 p-4 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]"
        >
          <div className="p-2 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30 group-hover:shadow-[0_0_12px_rgba(236,72,153,0.4)] transition-all">
            <Tv className="h-4 w-4 text-pink-300" />
          </div>
          <span className="text-sm font-semibold text-white">Watch Past Shows on EXA TV</span>
          <ArrowRight className="h-4 w-4 text-white/40 ml-auto transition-all group-hover:text-pink-300 group-hover:translate-x-1" />
        </Link>

        {/* Digis Live Shows Banner */}
        <div className="mb-8 relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.15),transparent_60%)]" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-5 p-6 md:p-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(236,72,153,0.4)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  Live on Digis
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1.5">
                Watch Live Shows &amp; Events
              </h2>
              <p className="text-sm text-white/60 max-w-lg">
                Live streams, exclusive shows, and ticketed events — happening now on Digis. EXA models go live every week.
              </p>
            </div>
            <div className="shrink-0">
              <DigisWatchButton />
            </div>
          </div>
        </div>

        {/* EXA Events heading */}
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Ticket className="h-4 w-4 text-pink-400" />
          EXA Runway Events
        </h2>

        {/* Events List */}
        {events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => {
              const startDate = event.start_date ? new Date(event.start_date) : null;
              const endDate = event.end_date ? new Date(event.end_date) : null;
              const dateDisplay = startDate && endDate
                ? `${format(startDate, "MMM d")} - ${format(endDate, "d, yyyy")}`
                : startDate
                  ? format(startDate, "MMMM d, yyyy")
                  : "TBA";

              const gradients: Record<string, string> = {
                MSW: "from-cyan-500/15 via-blue-500/10 to-violet-500/15",
                NYFW: "from-pink-500/15 via-rose-500/10 to-orange-500/15",
                MAW: "from-violet-500/15 via-purple-500/10 to-pink-500/15",
              };
              const gradient = gradients[event.short_name] || "from-pink-500/15 via-violet-500/10 to-cyan-500/15";

              return (
                <Link key={event.id} href={`/shows/${event.slug}`} className="group block">
                  <div className={`relative rounded-2xl bg-gradient-to-r ${gradient} border border-white/10 overflow-hidden transition-all group-hover:border-pink-500/40 group-hover:shadow-xl group-hover:shadow-pink-500/10 group-hover:scale-[1.01]`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 p-6 md:p-8">
                      {/* Date Block */}
                      <div className="flex-shrink-0 text-center md:w-24">
                        {startDate ? (
                          <>
                            <p className="text-3xl md:text-4xl font-bold text-white">{format(startDate, "d")}</p>
                            <p className="text-sm font-semibold text-pink-500 uppercase tracking-wider">{format(startDate, "MMM yyyy")}</p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-muted-foreground">TBA</p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="hidden md:block w-px h-16 bg-white/10" />

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="bg-white/10 text-white border-0 text-xs font-semibold px-2 py-0.5">
                            {event.short_name} {event.year}
                          </Badge>
                          {event.status === "active" && (
                            <Badge className="bg-green-500 text-white border-0 text-xs animate-pulse">
                              Live Now
                            </Badge>
                          )}
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-pink-400 transition-colors mb-1.5">
                          {event.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                          {(event.location_city || event.location_state) && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-pink-500" />
                              {event.location_city && event.location_state
                                ? `${event.location_city}, ${event.location_state}`
                                : event.location_city || event.location_state}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                            {dateDisplay}
                          </span>
                          {eventCounts[event.id] > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-violet-500" />
                              <span className="font-medium">{eventCounts[event.id]} models confirmed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-violet-500 transition-all">
                          <Ticket className="h-4 w-4" />
                          View Show
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-12 text-center">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-2xl" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-1 ring-pink-500/40 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-pink-300" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              <span className="exa-gradient-text">No upcoming shows</span>
            </h3>
            <p className="text-sm text-white/60">Check back soon for fresh runway dates.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
        </p>
      </footer>
    </div>
    </CoinBalanceProvider>
  );
}
