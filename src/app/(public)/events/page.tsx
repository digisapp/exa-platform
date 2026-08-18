import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

// Events index (Phase 2b): every non-cancelled event, upcoming/active first,
// completed as a "past events" archive. Fully data-driven — new events appear
// here the moment their row is created, no code deploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events | EXA Models",
  description:
    "Fashion weeks, runway shows and events by EXA Models — casting calls, tickets, and brand partnerships.",
  alternates: {
    canonical: "https://www.examodels.com/events",
  },
};

interface EventCardRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  year: number;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  location_city: string | null;
  location_state: string | null;
}

function EventCard({ event }: { event: EventCardRow }) {
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const dateDisplay = startDate && endDate
    ? `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`
    : startDate
      ? format(startDate, "MMMM d, yyyy")
      : "Dates TBA";
  const location =
    event.location_city && event.location_state
      ? `${event.location_city}, ${event.location_state}`
      : event.location_city || event.location_state;
  const isPast = event.status === "completed";

  return (
    <Link href={`/events/${event.slug}`} className="group block">
      <div
        className={`relative rounded-2xl bg-gradient-to-r from-pink-500/15 via-violet-500/10 to-cyan-500/15 border border-white/10 overflow-hidden transition-all group-hover:border-pink-500/40 group-hover:shadow-xl group-hover:shadow-pink-500/10 group-hover:scale-[1.01] ${
          isPast ? "opacity-70 group-hover:opacity-100" : ""
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 p-6 md:p-8">
          {/* Date block */}
          <div className="flex-shrink-0 text-center md:w-24">
            {startDate ? (
              <>
                <p className="text-3xl md:text-4xl font-bold text-white">{format(startDate, "d")}</p>
                <p className="text-sm font-semibold text-pink-500 uppercase tracking-wider">
                  {format(startDate, "MMM yyyy")}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-muted-foreground">TBA</p>
            )}
          </div>

          <div className="hidden md:block w-px h-16 bg-white/10" />

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className="bg-white/10 text-white border-0 text-xs font-semibold px-2 py-0.5">
                {event.short_name} {event.year}
              </Badge>
              {event.status === "active" && (
                <Badge className="bg-green-500 text-white border-0 text-xs animate-pulse">Live Now</Badge>
              )}
              {isPast && (
                <Badge className="bg-white/10 text-white/60 border-0 text-xs">Wrapped</Badge>
              )}
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-pink-400 transition-colors mb-1.5">
              {event.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-pink-500" />
                  {location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                {dateDisplay}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-violet-500 transition-all">
              {isPast ? "View Recap" : "View Event"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function EventsIndexPage() {
  const supabase = await createClient();

  // No is_published flag exists on events — status is the visibility gate.
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, name, short_name, year, status, start_date, end_date, location_city, location_state")
    .in("status", ["upcoming", "active", "completed"])
    .order("start_date", { ascending: false }) as { data: EventCardRow[] | null };

  const upcoming = (events || [])
    .filter((e) => e.status !== "completed")
    .sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999"));
  const past = (events || []).filter((e) => e.status === "completed");

  // Navbar user context (standard public-page pattern)
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
      // Service client: self-read includes coin_balance, not column-granted to client roles (Phase B2)
      const { data: model } = await createServiceRoleClient()
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

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.username || undefined;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-dvh bg-background">
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

        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.1),transparent_55%)]" />
          <div className="relative container px-4 md:px-8 pt-14 md:pt-20 pb-8 md:pb-12">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(236,72,153,0.5)]">
                {upcoming.length > 0 ? `${upcoming.length} UPCOMING` : "COMING SOON"}
              </span>
            </div>
            <h1 className="text-3xl md:text-6xl font-bold text-white mb-3">
              <span className="exa-gradient-text">EXA Events</span>
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-xl">
              Fashion weeks, runway shows and events by EXA Models — apply to walk, grab tickets, or partner your brand with the show.
            </p>
          </div>
        </div>

        <main className="container px-4 md:px-8 pb-16">
          {/* Upcoming */}
          {upcoming.length > 0 ? (
            <div className="space-y-4 mb-12">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-12 text-center mb-12">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-2xl" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-1 ring-pink-500/40 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-pink-300" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">
                <span className="exa-gradient-text">No upcoming events</span>
              </h3>
              <p className="text-sm text-white/60">New events are announced here first — check back soon.</p>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-400" />
                Past Events
              </h2>
              <div className="space-y-4">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
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
