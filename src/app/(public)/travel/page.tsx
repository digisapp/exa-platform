import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Home,
  UtensilsCrossed,
  Wifi,
  Heart,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "EXA Travel",
  description:
    "EXA Travel is an ongoing travel series — 5 influencer models traveling the world's best destinations, creating cinematic content. Join as a model and be part of the series.",
  robots: { index: true, follow: true },
};

export const revalidate = 120;

export default async function TravelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let myApplications: any[] = [];

  if (user) {
    const { data: actor } = (await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single()) as {
      data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null;
    };

    actorType = actor?.type || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      const { data } = (await supabase
        .from("models")
        .select(
          "id, username, first_name, last_name, profile_photo_url, coin_balance"
        )
        .eq("user_id", user.id)
        .single()) as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;

      if (data?.id) {
        const { data: applications } = await (
          supabase.from("gig_applications") as any
        )
          .select("id, status, gig_id")
          .eq("model_id", data.id);
        myApplications = applications || [];
      }
    } else if (actor?.type === "fan") {
      const { data } = (await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single()) as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  // Get all travel gigs
  const { data: travelGigs } = (await supabase
    .from("gigs")
    .select("*")
    .eq("type", "travel")
    .eq("visibility", "public")
    .in("status", ["open", "upcoming"])
    .order("start_at", { ascending: true })) as { data: any[] | null };

  const displayName =
    actorType === "fan"
      ? profileData?.display_name
      : profileData?.first_name
        ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
        : (profileData?.username || undefined);

  const openTrips = travelGigs?.filter((g) => g.status === "open") || [];
  const upcomingTrips = travelGigs?.filter((g) => g.status === "upcoming") || [];

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
        <Navbar
          user={
            user
              ? {
                  id: user.id,
                  email: user.email || "",
                  avatar_url:
                    profileData?.profile_photo_url ||
                    profileData?.avatar_url ||
                    undefined,
                  name: displayName,
                  username: profileData?.username || undefined,
                }
              : undefined
          }
          actorType={actorType}
        />

        {/* ═══════════════════════════════════════════ */}
        {/* HERO */}
        {/* ═══════════════════════════════════════════ */}
        <main className="container px-4 md:px-16 py-4 md:py-8">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden mb-4 md:mb-8">
            <div className="aspect-video relative">
              <iframe
                src="https://www.youtube.com/embed/LP5uPoIgGOA?autoplay=1&mute=1&loop=1&playlist=LP5uPoIgGOA&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
                title="EXA Travel"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 pointer-events-none">
              <h1 className="text-2xl md:text-5xl lg:text-6xl font-bold text-white mb-1 md:mb-3 drop-shadow-lg">
                EXA Travel
              </h1>
            </div>
          </div>
        </main>

        {/* ═══════════════════════════════════════════ */}
        {/* UPCOMING TRIPS FROM DB */}
        {/* ═══════════════════════════════════════════ */}
        <section id="trips" className="py-10 md:py-16 bg-muted/30">
          <div className="container px-6 md:px-16">
            {/* Open Trips */}
            {openTrips.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Plane className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Now Booking</h2>
                    <p className="text-muted-foreground text-sm">
                      Secure your spot — 5 models per trip
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openTrips.map((trip) => (
                    <TravelCard
                      key={trip.id}
                      trip={trip}
                      hasApplied={myApplications.some(
                        (a) => a.gig_id === trip.id
                      )}
                      applicationStatus={
                        myApplications.find((a) => a.gig_id === trip.id)?.status
                      }
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
                    <p className="text-muted-foreground text-sm">
                      Stay tuned — bookings open soon
                    </p>
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
              <div className="max-w-2xl mx-auto py-12">
                {/* Description bio */}
                <div className="text-center mb-10">
                  <Globe className="h-14 w-14 mx-auto text-muted-foreground/30 mb-5" />
                  <h3 className="text-2xl font-semibold mb-4">
                    Next destination coming soon
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    EXA Travel is our ongoing travel series — hotels, resorts, villas, and destinations around the world. Each trip brings together a small group of models to travel, create content, and experience it all together.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    From beach resorts in the Caribbean to luxury hotels in Bali, Mykonos, Dubai, and beyond — every trip is a new destination, a new experience, and a new set of content opportunities. You book your own flight. We handle everything else.
                  </p>
                </div>

                {/* Key details */}
                <div className="grid grid-cols-3 gap-4 mb-10 text-center">
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-2xl font-bold text-pink-400">Global</p>
                    <p className="text-xs text-muted-foreground mt-1">Hotels &amp; resorts worldwide</p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-2xl font-bold text-violet-400">5</p>
                    <p className="text-xs text-muted-foreground mt-1">Models per trip</p>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <p className="text-2xl font-bold text-cyan-400">New</p>
                    <p className="text-xs text-muted-foreground mt-1">Destinations every month</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    We&apos;re scouting the next location. Apply as a model to get notified when bookings open.
                  </p>
                  <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600" asChild>
                    <Link href="/apply">Apply as a Model</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* WHAT'S INCLUDED / WHAT YOU'LL NEED */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container px-6 md:px-16">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                What&apos;s Included
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Here&apos;s what&apos;s covered and what you&apos;ll need to bring
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Included */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Included
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: Home,
                      title: "Luxury Villa",
                      desc: "Shared villa with pool, content areas, and stunning views",
                    },
                    {
                      icon: UtensilsCrossed,
                      title: "All Meals",
                      desc: "Breakfast, lunch, and dinner — local cuisine and group dining",
                    },
                    {
                      icon: Wifi,
                      title: "WiFi & Workspace",
                      desc: "High-speed internet so you can edit and post content in real-time",
                    },
                    {
                      icon: Camera,
                      title: "Content Opportunities",
                      desc: "Group and solo shoot setups at the villa and curated local spots",
                    },
                    {
                      icon: Users,
                      title: "Community & Networking",
                      desc: "Connect with 4 other models, share audiences, and build lasting friendships",
                    },
                    {
                      icon: Heart,
                      title: "Trip Coordination",
                      desc: "Everything organized — villa, meals, activities, and local guides",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not Included */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  What You&apos;ll Need
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: Plane,
                      title: "Your Flight",
                      desc: "Book your own airline ticket to the destination. We'll share the best flight options and airport details.",
                    },
                    {
                      icon: Globe,
                      title: "Travel Documents",
                      desc: "Valid passport and any visas required for the destination country.",
                    },
                    {
                      icon: Camera,
                      title: "Your Camera/Phone",
                      desc: "Bring your content creation gear — phone, camera, tripod, whatever you shoot with.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* FAQ */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-12 md:py-20">
          <div className="container px-6 md:px-16 max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground">
                Everything you need to know about EXA Travel
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem
                value="how-it-works"
                className="glass-card rounded-xl border px-5"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  How does booking a trip work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Browse our upcoming destinations and pick the trip that works
                  for you. Apply through the trip page, and once accepted
                  you&apos;ll receive payment details. The trip fee covers
                  the villa and all meals. You book your own flight.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="who-can-join"
                className="glass-card rounded-xl border px-5"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  Who can join EXA Travel trips?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  EXA Travel is open to approved EXA models. If you&apos;re not
                  yet on the platform, apply as a model first. We review
                  applications to ensure a great group dynamic and experience
                  for everyone.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="whats-included"
                className="glass-card rounded-xl border px-5"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  What does the trip fee cover?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  The trip fee covers your stay at a luxury shared villa and
                  all meals (breakfast, lunch, dinner). It also includes trip
                  coordination, local guides, and organized activities. You are
                  responsible for booking your own flight and any personal expenses.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="cancellation"
                className="glass-card rounded-xl border px-5"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  What&apos;s the cancellation policy?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Full refund if you cancel 30+ days before the trip. 50% refund
                  for 15-29 days. No refund within 14 days of the trip start
                  date, as the villa and meals are already committed. If we
                  cancel a trip, you get a full refund.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="solo"
                className="glass-card rounded-xl border px-5"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  Can I come alone or do I need to bring a friend?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Most models come solo — that&apos;s the whole point! You&apos;ll
                  meet 4 other models and leave with new friends. We add you to
                  the trip group chat before departure so you can connect with
                  your housemates beforehand.
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* CTA */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-violet-500/10 to-pink-500/5" />
          <div className="container relative px-6 md:px-16">
            <div className="max-w-xl mx-auto rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-violet-500/5 p-8 md:p-12 text-center">
              <Palmtree className="h-12 w-12 mx-auto text-pink-400 mb-5" />
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to EXA Travel?</h2>
              {!user ? (
                <Button variant="outline" asChild>
                  <Link href="/signin?redirect=/travel">Sign In</Link>
                </Button>
              ) : (
                <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600" asChild>
                  <Link href="#trips">
                    View Available Trips
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </CoinBalanceProvider>
  );
}

/* ═══════════════════════════════════════════ */
/* TRAVEL CARD COMPONENT */
/* ═══════════════════════════════════════════ */

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
  const spotsLeft = trip.spots
    ? trip.spots - (trip.spots_filled || 0)
    : null;
  const isUrgent = spotsLeft !== null && spotsLeft <= 3 && !isUpcoming;

  return (
    <Link href={`/gigs/${trip.slug}`}>
      <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
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
            <Badge
              className={`absolute top-3 right-3 ${
                applicationStatus === "accepted"
                  ? "bg-green-500 text-white"
                  : applicationStatus === "rejected"
                    ? "bg-gray-500 text-white"
                    : "bg-amber-500 text-white"
              }`}
            >
              {applicationStatus === "accepted"
                ? "Accepted"
                : applicationStatus === "rejected"
                  ? "Not Selected"
                  : "Applied"}
            </Badge>
          )}

          {/* Urgency Badge */}
          {isUrgent && !hasApplied && (
            <Badge variant="destructive" className="absolute top-3 right-3 animate-pulse">
              {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left!
            </Badge>
          )}

          {/* Bottom Title Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
            <h3 className="font-semibold text-white text-lg line-clamp-2">
              {trip.title}
            </h3>
            {(trip.location_city || trip.location_state) && (
              <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-pink-400" />
                {trip.location_city && trip.location_state
                  ? `${trip.location_city}, ${trip.location_state}`
                  : trip.location_city || trip.location_state}
              </p>
            )}
          </div>

          {/* Hover Overlay */}
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
                    {trip.end_at &&
                      ` - ${format(new Date(trip.end_at), "MMMM d, yyyy")}`}
                  </div>
                )}

                {trip.compensation_type && (
                  <div className="flex items-center gap-2 text-white/90">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    {trip.compensation_type === "paid" &&
                    trip.compensation_amount > 0 ? (
                      <span className="font-medium text-green-400">
                        ${(trip.compensation_amount / 100).toFixed(0)} per model
                      </span>
                    ) : (
                      <span className="capitalize">
                        {trip.compensation_type}
                      </span>
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

              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-medium">
                  {isUpcoming
                    ? "View Details"
                    : hasApplied
                      ? "View Status"
                      : "Apply Now"}
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
