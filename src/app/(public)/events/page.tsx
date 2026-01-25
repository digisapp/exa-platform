import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  ArrowRight,
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

  // Get confirmed model counts for each event
  const eventCounts: Record<string, number> = {};
  if (events && events.length > 0) {
    for (const event of events) {
      const { count } = await supabase
        .from("gig_applications")
        .select("model_id, gigs!inner(event_id)", { count: "exact", head: true })
        .eq("status", "accepted")
        .eq("gigs.event_id", event.id);
      eventCounts[event.id] = count || 0;
    }
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

      <main className="container px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Upcoming Events</h1>
          <p className="text-muted-foreground text-lg">
            Discover fashion events featuring EXA models
          </p>
        </div>

        {/* Events Grid */}
        {events && events.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const startDate = event.start_date ? new Date(event.start_date) : null;
              const endDate = event.end_date ? new Date(event.end_date) : null;
              const dateDisplay = startDate && endDate
                ? `${format(startDate, "MMM d")} - ${format(endDate, "d, yyyy")}`
                : startDate
                  ? format(startDate, "MMMM d, yyyy")
                  : "TBA";

              return (
                <Link key={event.id} href={`/events/${event.slug}`} className="group">
                  <Card className="overflow-hidden h-full transition-all group-hover:ring-2 group-hover:ring-pink-500/50 group-hover:shadow-lg group-hover:shadow-pink-500/10">
                    {/* Cover Image */}
                    <div className="aspect-video relative bg-gradient-to-br from-pink-500/30 via-violet-500/30 to-cyan-500/30">
                      {event.cover_image_url ? (
                        <img
                          src={event.cover_image_url}
                          alt={event.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-6xl">
                            {event.short_name === "MSW" ? "🏖️" :
                             event.short_name === "NYFW" ? "🗽" :
                             event.short_name === "MAW" ? "🎨" : "✨"}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-pink-500/80 text-white border-0">
                          {event.short_name} {event.year}
                        </Badge>
                      </div>
                      {event.status === "active" && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-green-500/80 text-white border-0 animate-pulse">
                            Happening Now
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-5">
                      <h2 className="text-xl font-bold mb-2 group-hover:text-pink-500 transition-colors">
                        {event.name}
                      </h2>

                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        {(event.location_city || event.location_state) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {event.location_city && event.location_state
                                ? `${event.location_city}, ${event.location_state}`
                                : event.location_city || event.location_state}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{dateDisplay}</span>
                        </div>
                        {eventCounts[event.id] > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{eventCounts[event.id]} models confirmed</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center text-pink-500 font-medium text-sm group-hover:gap-2 transition-all">
                        <span>View Event</span>
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
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
  );
}
