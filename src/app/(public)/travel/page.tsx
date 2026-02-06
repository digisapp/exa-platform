import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Plane,
  Globe,
  Palmtree,
  Camera,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Model Travel Trips | Designer Swimwear Photoshoots in Paradise",
  description: "Exclusive travel trips for models. Designer swimwear photoshoots in exotic tropical locations. Shoot alongside top models in Dominican Republic, Miami, and more. 50+ photos, 10+ videos per trip.",
  robots: { index: true, follow: true },
};

// Cache page for 2 minutes
export const revalidate = 120;

export default async function TravelPage() {
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let modelId: string | null = null;
  let myApplications: any[] = [];

  if (user) {
    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;

    // Get profile info based on actor type
    if (actor?.type === "model" || actor?.type === "admin") {
      const { data } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = data;
      modelId = data?.id || null;
      coinBalance = data?.coin_balance ?? 0;

      // Get model's travel applications
      if (data?.id) {
        const { data: applications } = await (supabase
          .from("gig_applications") as any)
          .select(`
            id,
            status,
            gig_id
          `)
          .eq("model_id", data.id);
        myApplications = applications || [];
      }
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

  // Get all travel gigs (both open and upcoming)
  const { data: travelGigs } = await supabase
    .from("gigs")
    .select("*")
    .eq("type", "travel")
    .eq("visibility", "public")
    .in("status", ["open", "upcoming"])
    .order("start_at", { ascending: true }) as { data: any[] | null };

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  // Separate current/open trips from upcoming
  const now = new Date();
  const openTrips = travelGigs?.filter(g => g.status === "open") || [];
  const upcomingTrips = travelGigs?.filter(g => g.status === "upcoming") || [];

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

        {/* Hero Section with Full-Screen Video */}
        <main className="container px-8 md:px-16 py-8">
          <div className="relative rounded-3xl overflow-hidden mb-8">
            <div className="aspect-video relative">
              <iframe
                src="https://www.youtube.com/embed/LP5uPoIgGOA?autoplay=1&mute=1&loop=1&playlist=LP5uPoIgGOA&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
                title="EXA Travel"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
              <Badge className="mb-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-4 py-1.5 text-sm font-semibold">
                <Plane className="h-4 w-4 mr-2" />
                EXA Travel
              </Badge>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
                Shoot in Paradise
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-6 max-w-2xl">
                Designer swimwear photoshoots in the most exotic tropical locations. Shoot stunning content
                alongside other top models and gain massive exposure for your portfolio.
              </p>
              <div className="flex flex-wrap gap-4 md:gap-6 text-white/90">
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Camera className="h-5 w-5 text-pink-400" />
                  <span className="font-medium">Designer Swimwear Shoots</span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Globe className="h-5 w-5 text-cyan-400" />
                  <span className="font-medium">Exotic Locations</span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Users className="h-5 w-5 text-violet-400" />
                  <span className="font-medium">Top Model Network</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          {!user && (
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold px-8 shadow-lg shadow-pink-500/25" asChild>
                <Link href="/signin?redirect=/travel">Sign In to Apply</Link>
              </Button>
            </div>
          )}
        </main>

        {/* Trips Section */}
        <section id="trips" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-8 md:px-16">
            {/* Open Trips */}
            {openTrips.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Plane className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Upcoming Trips</h2>
                    <p className="text-muted-foreground text-sm">Apply now to secure your spot</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openTrips.map((trip) => (
                    <TravelCard
                      key={trip.id}
                      trip={trip}
                      hasApplied={myApplications.some(a => a.gig_id === trip.id)}
                      applicationStatus={myApplications.find(a => a.gig_id === trip.id)?.status}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Coming Soon</h2>
                    <p className="text-muted-foreground text-sm">Stay tuned for these upcoming adventures</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingTrips.map((trip) => (
                    <TravelCard key={trip.id} trip={trip} isUpcoming />
                  ))}
                </div>
              </div>
            )}

            {/* No Trips */}
            {(!travelGigs || travelGigs.length === 0) && (
              <div className="text-center py-16">
                <Globe className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
                <h3 className="text-2xl font-semibold mb-2">No trips scheduled yet</h3>
                <p className="text-muted-foreground mb-6">
                  Check back soon for exciting new travel opportunities!
                </p>
                <Button variant="outline" asChild>
                  <Link href="/gigs">Browse All Gigs</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* What's Included Section */}
        <section className="py-16 md:py-24">
          <div className="container px-8 md:px-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">What&apos;s Included</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to create viral content and level up your modeling career
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="glass-card border-pink-500/20 hover:border-pink-500/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center mb-4">
                    <Camera className="h-6 w-6 text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Designer Swimwear Shoots</h3>
                  <p className="text-muted-foreground text-sm">
                    50+ professional photos and 10+ video clips wearing designer swimwear from top brands
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card border-violet-500/20 hover:border-violet-500/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Shoot with Top Models</h3>
                  <p className="text-muted-foreground text-sm">
                    Create stunning group content with other top EXA models and expand your network
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Palmtree className="h-6 w-6 text-cyan-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Exotic Paradise Locations</h3>
                  <p className="text-muted-foreground text-sm">
                    Crystal clear waters, pristine beaches, and jaw-dropping backdrops for your content
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-violet-500/10" />
          <div className="container relative px-8 md:px-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Take Your Modeling Career Global?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join EXA Models and get exclusive access to international photoshoots, designer swimwear,
              and opportunities to shoot alongside top models in paradise.
            </p>
            {!user ? (
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600" asChild>
                  <Link href="/apply">Apply as a Model</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/signin?redirect=/travel">Sign In</Link>
                </Button>
              </div>
            ) : (
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600" asChild>
                <Link href="/gigs">View All Opportunities</Link>
              </Button>
            )}
          </div>
        </section>
      </div>
    </CoinBalanceProvider>
  );
}

function TravelCard({
  trip,
  isUpcoming = false,
  hasApplied = false,
  applicationStatus,
}: {
  trip: any;
  isUpcoming?: boolean;
  hasApplied?: boolean;
  applicationStatus?: string;
}) {
  const spotsLeft = trip.spots ? trip.spots - (trip.spots_filled || 0) : null;
  const isUrgent = spotsLeft !== null && spotsLeft <= 5 && !isUpcoming;

  return (
    <Link href={`/gigs/${trip.slug}`}>
      <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
        {/* Portrait Image with Overlay */}
        <div className="aspect-[3/4] relative bg-gradient-to-br from-violet-500/20 to-cyan-500/20 overflow-hidden">
          {trip.cover_image_url ? (
            <Image
              src={trip.cover_image_url}
              alt={trip.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Plane className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}

          {/* Status Badge */}
          {isUpcoming ? (
            <Badge className="absolute top-3 left-3 bg-violet-500/90 text-white border-0">
              <Calendar className="h-3 w-3 mr-1" />
              Coming Soon
            </Badge>
          ) : (
            <Badge className="absolute top-3 left-3 bg-green-500/90 text-white border-0">
              <Plane className="h-3 w-3 mr-1" />
              Now Booking
            </Badge>
          )}

          {/* Application Status Badge */}
          {hasApplied && (
            <Badge className={`absolute top-3 right-3 ${
              applicationStatus === "accepted" ? "bg-green-500 text-white" :
              applicationStatus === "rejected" ? "bg-gray-500 text-white" :
              "bg-amber-500 text-white"
            }`}>
              {applicationStatus === "accepted" ? "Accepted" :
               applicationStatus === "rejected" ? "Not Selected" :
               "Applied"}
            </Badge>
          )}

          {/* Urgency Badge */}
          {isUrgent && !hasApplied && (
            <Badge variant="destructive" className="absolute top-3 right-3">
              {spotsLeft} spots left!
            </Badge>
          )}

          {/* Bottom Title Bar - Always Visible */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
            <h3 className="font-semibold text-white text-lg line-clamp-2">{trip.title}</h3>
            {(trip.location_city || trip.location_state) && (
              <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-pink-400" />
                {trip.location_city && trip.location_state
                  ? `${trip.location_city}, ${trip.location_state}`
                  : trip.location_city || trip.location_state}
              </p>
            )}
          </div>

          {/* Hover Overlay with Full Details */}
          <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xl">{trip.title}</h3>

              {trip.description && (
                <p className="text-sm text-white/80 line-clamp-3">
                  {trip.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {(trip.location_city || trip.location_state) && (
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-4 w-4 text-pink-400" />
                    {trip.location_city && trip.location_state
                      ? `${trip.location_city}, ${trip.location_state}`
                      : trip.location_city || trip.location_state}
                  </div>
                )}

                {trip.start_at && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Calendar className="h-4 w-4 text-violet-400" />
                    {format(new Date(trip.start_at), "MMMM d, yyyy")}
                    {trip.end_at && ` - ${format(new Date(trip.end_at), "MMMM d, yyyy")}`}
                  </div>
                )}

                {trip.compensation_type && (
                  <div className="flex items-center gap-2 text-white/90">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    {trip.compensation_type === "paid" && trip.compensation_amount > 0 ? (
                      <span className="font-medium text-green-400">
                        ${(trip.compensation_amount / 100).toFixed(0)}
                      </span>
                    ) : (
                      <span className="capitalize">{trip.compensation_type}</span>
                    )}
                  </div>
                )}

                {spotsLeft !== null && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Users className="h-4 w-4 text-cyan-400" />
                    {spotsLeft} of {trip.spots} spots available
                  </div>
                )}
              </div>

              {/* View Details Button */}
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-medium">
                  {isUpcoming ? "View Details" : hasApplied ? "View Status" : "Apply Now"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
