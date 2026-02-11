import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

export const revalidate = 300; // Cache for 5 minutes

export const metadata: Metadata = {
  title: "Workshops | EXA Models",
  description: "Join our professional model training workshops. Learn runway techniques, posing, and more from industry experts.",
  openGraph: {
    title: "Model Training Workshops | EXA Models",
    description: "Join our professional model training workshops. Learn runway techniques, posing, and more from industry experts.",
  },
};

interface Workshop {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  location_city: string | null;
  location_state: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  price_cents: number;
  original_price_cents: number | null;
  spots_available: number | null;
  spots_sold: number;
  status: string;
  is_featured: boolean;
  highlights: string[] | null;
}

export default async function WorkshopsPage() {
  const supabase = await createClient();

  // Get all upcoming workshops
  const { data: workshops } = await (supabase as any)
    .from("workshops")
    .select("*")
    .in("status", ["upcoming", "active"])
    .order("date", { ascending: true }) as { data: Workshop[] | null };

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
              src="https://www.youtube.com/embed/TnoZi5vL7Vk?autoplay=1&mute=1&loop=1&playlist=TnoZi5vL7Vk&start=121&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
              title="EXA Workshops"
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
                  Professional Training
                </Badge>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-lg">
                Model Workshops
              </h1>
            </div>
          </div>
        </div>

        <main className="container px-4 md:px-8 py-8">

          {/* Workshops Grid */}
          {workshops && workshops.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workshops.map((workshop) => {
                const workshopDate = new Date(workshop.date);
                const spotsLeft = workshop.spots_available
                  ? workshop.spots_available - workshop.spots_sold
                  : null;
                const isSoldOut = spotsLeft !== null && spotsLeft <= 0;
                const isLimitedSpots = spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0;

                return (
                  <Link key={workshop.id} href={`/workshops/${workshop.slug}`} className="group">
                    <Card className="overflow-hidden h-full transition-all group-hover:ring-2 group-hover:ring-pink-500/50 group-hover:shadow-lg group-hover:shadow-pink-500/10">
                      {/* Cover Image */}
                      <div className="aspect-video relative bg-gradient-to-br from-pink-500/30 via-violet-500/30 to-cyan-500/30">
                        {workshop.cover_image_url ? (
                          <Image
                            src={workshop.cover_image_url}
                            alt={workshop.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl">👠</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                          {workshop.is_featured && (
                            <Badge className="bg-pink-500/90 text-white border-0">
                              Featured
                            </Badge>
                          )}
                          {isSoldOut && (
                            <Badge className="bg-red-500/90 text-white border-0">
                              Sold Out
                            </Badge>
                          )}
                          {isLimitedSpots && (
                            <Badge className="bg-amber-500/90 text-white border-0 animate-pulse">
                              Only {spotsLeft} spots left!
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-5">
                        <h2 className="text-xl font-bold mb-1 group-hover:text-pink-500 transition-colors line-clamp-2">
                          {workshop.title}
                        </h2>
                        {workshop.subtitle && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                            {workshop.subtitle}
                          </p>
                        )}

                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{format(workshopDate, "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          {workshop.start_time && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span>
                                {format(new Date(`2000-01-01T${workshop.start_time}`), "h:mm a")}
                                {workshop.end_time && ` - ${format(new Date(`2000-01-01T${workshop.end_time}`), "h:mm a")}`}
                              </span>
                            </div>
                          )}
                          {(workshop.location_city || workshop.location_state) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span>
                                {workshop.location_city && workshop.location_state
                                  ? `${workshop.location_city}, ${workshop.location_state}`
                                  : workshop.location_city || workshop.location_state}
                              </span>
                            </div>
                          )}
                          {spotsLeft !== null && spotsLeft > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>{spotsLeft} spots remaining</span>
                            </div>
                          )}
                        </div>

                        {/* Price and CTA */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-pink-500">
                              ${(workshop.price_cents / 100).toFixed(0)}
                            </span>
                            {workshop.original_price_cents && workshop.original_price_cents > workshop.price_cents && (
                              <span className="text-sm text-muted-foreground line-through">
                                ${(workshop.original_price_cents / 100).toFixed(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-pink-500 font-medium text-sm group-hover:gap-2 transition-all">
                            <span>{isSoldOut ? "View Details" : "Register"}</span>
                            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">👠</div>
              <h2 className="text-xl font-semibold mb-2">No Upcoming Workshops</h2>
              <p className="text-muted-foreground text-lg mb-6">
                Check back soon for new workshop announcements!
              </p>
              <Button asChild variant="outline">
                <Link href="/shows">View Upcoming Shows</Link>
              </Button>
            </Card>
          )}

          {/* Why Attend Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Why Attend Our Workshops?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="font-semibold mb-2">Industry Experts</h3>
                <p className="text-sm text-muted-foreground">
                  Learn from professionals who have coached models for top fashion events worldwide.
                </p>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="font-semibold mb-2">90% Success Rate</h3>
                <p className="text-sm text-muted-foreground">
                  90% of our runway workshop attendees walk in our Miami Swim Week Shows.
                </p>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="font-semibold mb-2">Networking</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with designers, industry professionals, and fellow aspiring models.
                </p>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
