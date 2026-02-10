import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";

// Cache page for 5 minutes - events don't change frequently
export const revalidate = 300;
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Sparkles,
  Ticket,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Events | EXA Models",
  description: "Discover fashion events featuring EXA models - Miami Swim Week, New York Fashion Week, Miami Art Week and more.",
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
            src="https://www.youtube.com/embed/Iu68o0MCuvw?autoplay=1&mute=1&loop=1&playlist=Iu68o0MCuvw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="EXA Events"
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
              <Sparkles className="h-5 w-5 text-pink-500" />
              <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-3 py-1">
                {events && events.length > 0 ? `${events.length} Upcoming` : "Coming Soon"}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-lg">
              EXA Events
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl drop-shadow">
              Fashion shows, runway experiences, and brand campaigns featuring the hottest EXA models
            </p>
          </div>
        </div>
      </div>

      <main className="container px-4 md:px-8 py-10">
        {/* Events Grid */}
        {events && events.length > 0 ? (
          <div className="space-y-6">
            {events.map((event, index) => {
              const startDate = event.start_date ? new Date(event.start_date) : null;
              const endDate = event.end_date ? new Date(event.end_date) : null;
              const dateDisplay = startDate && endDate
                ? `${format(startDate, "MMM d")} - ${format(endDate, "d, yyyy")}`
                : startDate
                  ? format(startDate, "MMMM d, yyyy")
                  : "TBA";
              const isFirst = index === 0;

              return (
                <Link key={event.id} href={`/events/${event.slug}`} className="group block">
                  <div className={`relative rounded-2xl overflow-hidden transition-all group-hover:ring-2 group-hover:ring-pink-500/50 group-hover:shadow-xl group-hover:shadow-pink-500/10 ${isFirst ? '' : ''}`}>
                    <div className={`flex flex-col ${isFirst ? 'md:flex-row' : 'md:flex-row'}`}>
                      {/* Image */}
                      <div className={`relative bg-gradient-to-br from-pink-500/30 via-violet-500/30 to-cyan-500/30 overflow-hidden ${isFirst ? 'aspect-video md:aspect-auto md:w-2/3' : 'aspect-video md:aspect-auto md:w-1/3'}`}>
                        {event.cover_image_url ? (
                          <Image
                            src={event.cover_image_url}
                            alt={event.name}
                            fill
                            sizes={isFirst ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                            <span className="text-6xl">
                              {event.short_name === "MSW" ? "🏖️" :
                               event.short_name === "NYFW" ? "🗽" :
                               event.short_name === "MAW" ? "🎨" : "✨"}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/30" />
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-3 py-1 text-sm font-semibold shadow-lg">
                            {event.short_name} {event.year}
                          </Badge>
                          {event.status === "active" && (
                            <Badge className="bg-green-500 text-white border-0 animate-pulse shadow-lg">
                              Live Now
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className={`bg-card border border-white/10 ${isFirst ? 'md:w-1/3' : 'md:w-2/3'} p-6 md:p-8 flex flex-col justify-center`}>
                        <h2 className={`font-bold mb-3 group-hover:text-pink-500 transition-colors ${isFirst ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'}`}>
                          {event.name}
                        </h2>

                        {event.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                            {event.description}
                          </p>
                        )}

                        <div className="space-y-2.5 text-sm text-muted-foreground mb-5">
                          {(event.location_city || event.location_state) && (
                            <div className="flex items-center gap-2.5">
                              <MapPin className="h-4 w-4 text-pink-500" />
                              <span>
                                {event.location_city && event.location_state
                                  ? `${event.location_city}, ${event.location_state}`
                                  : event.location_city || event.location_state}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2.5">
                            <Calendar className="h-4 w-4 text-cyan-500" />
                            <span>{dateDisplay}</span>
                          </div>
                          {eventCounts[event.id] > 0 && (
                            <div className="flex items-center gap-2.5">
                              <Users className="h-4 w-4 text-violet-500" />
                              <span className="font-medium">{eventCounts[event.id]} models confirmed</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold group-hover:from-pink-600 group-hover:to-violet-600 transition-colors shadow-lg shadow-pink-500/20">
                            <Ticket className="h-4 w-4" />
                            View Event
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              No upcoming events at the moment. Check back soon!
            </p>
          </Card>
        )}
      </main>
    </div>
    </CoinBalanceProvider>
  );
}
