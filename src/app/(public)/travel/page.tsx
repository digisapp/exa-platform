import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Plane,
  ArrowRight,
  Camera,
  BarChart3,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "EXA Travel — Influencer Content for Destinations",
  description:
    "500+ vetted U.S.-based content creators ready to fly to your destination and produce high-engagement content that drives bookings, traffic, and brand exposure.",
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
        <main className="container px-4 md:px-16 pt-4 md:pt-8">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
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
        {/* INTRO */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-12 md:py-20">
          <div className="container px-6 md:px-16">
            <div className="max-w-3xl">
              <p className="text-sky-400 font-semibold text-sm tracking-widest uppercase mb-3">EXA Travel</p>
              <h2 className="text-2xl md:text-4xl font-bold mb-5">Influencer Content for Your Destination</h2>
              <p className="text-lg text-zinc-300 leading-relaxed mb-4">
                500+ vetted U.S.-based content creators producing high-engagement content across Instagram, TikTok, and YouTube — ready to fly to your destination.
              </p>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Our creators specialize in destination storytelling that drives real results — bookings, traffic, and brand exposure.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* WHAT WE OFFER */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-12 md:py-20 border-t border-white/5">
          <div className="container px-6 md:px-16">
            <div className="max-w-3xl mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">What We Offer</h2>
              <p className="text-zinc-400 leading-relaxed text-lg">
                We bring creators directly to your destination to produce high-quality content tailored to your marketing goals. Whether you need one creator for a focused campaign or a full group for a large-scale push, we match the right talent to your audience.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent p-6">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
                  <Camera className="h-5 w-5 text-sky-400" />
                </div>
                <h3 className="font-semibold mb-2 text-zinc-100">Reels, TikToks &amp; YouTube</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Instagram Reels, TikToks, Stories, and YouTube features showcasing your destination.</p>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-6">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Globe className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-2 text-zinc-100">Destination Itineraries</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Curated itineraries highlighting your hotels, restaurants, and experiences that drive traffic.</p>
              </div>

              <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent p-6">
                <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-5 w-5 text-pink-400" />
                </div>
                <h3 className="font-semibold mb-2 text-zinc-100">Licensed Content</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">High-quality content you can license and repurpose across your own marketing channels.</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-semibold mb-2 text-zinc-100">Performance Reporting</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">Detailed reporting on reach, engagement, and measurable results from every campaign.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* HOW IT WORKS */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-12 md:py-20 border-t border-white/5">
          <div className="container px-6 md:px-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-10">How It Works</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl">
              {[
                { step: "01", title: "Share Your Goals", desc: "Tell us what you're looking to achieve — awareness, bookings, content library, or a seasonal push." },
                { step: "02", title: "We Match Creators", desc: "We hand-pick creators aligned with your destination and audience from our vetted network." },
                { step: "03", title: "We Handle Everything", desc: "Our team coordinates travel, content direction, and publishing — you focus on your destination." },
                { step: "04", title: "You Get Results", desc: "Receive premium content, measurable exposure, and a full performance report." },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <span className="text-5xl font-black text-sky-500/20 absolute -top-2 -left-1">{item.step}</span>
                  <div className="pt-10">
                    <h3 className="font-semibold text-lg mb-2 text-zinc-100">{item.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* CONTENT SHOWCASE */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-12 md:py-20 border-t border-white/5">
          <div className="container px-6 md:px-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Creator Content</h2>
            <p className="text-zinc-400 mb-8 max-w-2xl">Examples of the kind of content our creators produce for destinations and brands.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="rounded-2xl overflow-hidden bg-black relative group">
                <div className="aspect-[9/16]">
                  <video
                    src="https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/examodels/travel/exa-aqua-newyork.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-semibold text-sm">Aqua Restaurant · New York</p>
                    <p className="text-white/70 text-xs">Dining &amp; lifestyle content</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black relative group">
                <div className="aspect-[9/16]">
                  <video
                    src="https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/examodels/travel/exa-hair-spa.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-semibold text-sm">Luxury Hair Spa</p>
                    <p className="text-white/70 text-xs">Beauty &amp; wellness content</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black relative group">
                <div className="aspect-[9/16]">
                  <video
                    src="https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/examodels/travel/exa-hutong-miami.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-semibold text-sm">Hutong · Miami</p>
                    <p className="text-white/70 text-xs">Dining &amp; destination content</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black relative group">
                <div className="aspect-[9/16]">
                  <video
                    src="https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/examodels/travel/exa-pilates.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-semibold text-sm">Pilates Studio</p>
                    <p className="text-white/70 text-xs">Fitness &amp; wellness content</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* UPCOMING TRIPS FROM DB */}
        {/* ═══════════════════════════════════════════ */}
        {(openTrips.length > 0 || upcomingTrips.length > 0) && (
          <section id="trips" className="py-12 md:py-20 border-t border-white/5">
            <div className="container px-6 md:px-16">
              {/* Open Trips */}
              {openTrips.length > 0 && (
                <div className={upcomingTrips.length > 0 ? "mb-16" : ""}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Plane className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Now Booking</h2>
                      <p className="text-zinc-400 text-sm">
                        Active campaigns accepting creator applications
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
                      <p className="text-zinc-400 text-sm">
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

            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* BOTTOM CTA */}
        {/* ═══════════════════════════════════════════ */}
        <section className="py-16 md:py-24 border-t border-white/5">
          <div className="container px-6 md:px-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Get Started?</h2>
              <p className="text-zinc-400 mb-6 text-lg">
                Whether you represent a tourism board, hotel, resort, or destination — we&apos;d love to learn about your goals and see if this is a fit.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600"
                  asChild
                >
                  <a href="mailto:nathan@examodels.com">Partner With Us</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-base font-semibold border-zinc-700 hover:bg-zinc-800"
                  asChild
                >
                  <Link href="/apply">Apply as a Creator</Link>
                </Button>
              </div>
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
