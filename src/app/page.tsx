import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { BrandInquiryDialog } from "@/components/auth/BrandInquiryDialog";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Instagram,
  Flame,
  Trophy,
  Gavel,
  Coins,
  Tv,
  Play,
  Calendar,
  MapPin,
} from "lucide-react";
import { TopModelsCarousel } from "@/components/home/TopModelsCarousel";
import { UpcomingEventsCarousel } from "@/components/home/UpcomingEventsCarousel";
import { formatCoins, coinsToFanUsd, formatUsd } from "@/lib/coin-config";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Cache homepage for 60 seconds so bid counts stay reasonably fresh
export const revalidate = 60;

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function HomePage() {
  const supabase = await createClient();

  // If user is already logged in, redirect to appropriate dashboard
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Check if admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single() as { data: { type: string } | null };

    if (actor?.type === "admin") {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  // Fetch top 50 models with 4-5 star admin rating (signed-in models with self-uploaded photos)
  // Requires: user_id (signed in) AND avatars bucket (self-uploaded, not Instagram imports)
  const { data: topModelsData, error: modelsError } = await (supabase
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

  console.log("[Homepage] Models query - count:", topModelsData?.length ?? 0, "error:", modelsError?.message ?? "none");

  // Randomize the order
  const topModels = shuffleArray(topModelsData || []) as any[];

  // Fetch upcoming events/gigs
  const { data: upcomingEvents, error: eventsError } = await (supabase
    .from("gigs") as any)
    .select("id, slug, title, type, location_city, location_state, start_at, end_at, cover_image_url, spots, spots_filled")
    .eq("status", "open")
    .gte("start_at", new Date().toISOString())
    .neq("title", "EXA Models Creator House - Trip 3")
    .order("start_at", { ascending: true })
    .limit(20);

  console.log("[Homepage] Events query - count:", upcomingEvents?.length ?? 0, "error:", eventsError?.message ?? "none");

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

  // Get actual EXA Boost leaderboard from top_model_leaderboard table
  const { data: leaderboardModels } = await (supabase as any)
    .from("top_model_leaderboard")
    .select(`
      model_id,
      today_points,
      total_points,
      total_likes,
      total_boosts,
      models!inner (
        id, first_name, username, profile_photo_url
      )
    `)
    .gt("total_points", 0)
    .order("total_points", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen relative">
      {/* Floating Orbs Background */}
      <FloatingOrbs />

      {/* Content */}
      <div className="relative z-10">
        {/* Scrolling Digis Banner */}
        <a
          href="https://digis.cc"
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-violet-600 via-pink-500 to-violet-600 bg-[length:200%_100%] animate-gradient py-3.5 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-marquee">
              <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
                ✨ Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats ✨
              </span>
              <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
                🎁 Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats 🎁
              </span>
              <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
                ✨ Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats ✨
              </span>
              <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
                🎁 Join our <Image src="/digis-logo-white.png" alt="Digis" width={72} height={20} className="h-5 w-auto inline-block" /> Community — Live Streams, Virtual Gifts, AI Twin & Chats 🎁
              </span>
            </div>
          </div>
        </a>

        {/* Navigation */}
        <nav className="container px-8 md:px-16 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={100}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <Link href="/shows/miami-swim-week-2026">
              <Button variant="outline" className="border-amber-400/50 hover:border-amber-400 hover:bg-amber-400/10 text-amber-400">
                Miami Swim Week
              </Button>
            </Link>
            <Link href="/signin">
              <Button variant="outline" className="border-[#FF69B4]/50 hover:border-[#FF69B4] hover:bg-[#FF69B4]/10">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        {/* Split Hero Section */}
        <section id="signup" className="container px-8 md:px-16 py-6 md:py-10 scroll-mt-20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {/* Models Side — full width on mobile */}
            <div className="col-span-2 md:col-span-1 relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent border border-pink-500/20 hover:border-pink-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <span className="inline-block px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white mb-4 md:mb-6">
                  For Models
                </span>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                  Gigs. Bookings.
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
                <span className="inline-block px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white mb-3 md:mb-6">
                  For Fans
                </span>

                <h2 className="text-lg md:text-3xl lg:text-4xl font-bold tracking-tight mb-3 md:mb-4">
                  Follow Models.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Get Exclusive.</span>
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
                <span className="inline-block px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white mb-3 md:mb-6">
                  For Brands
                </span>

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
          </div>
        </section>

        {/* EXA Boost & EXA Bids Banners */}
        <section className="container px-8 md:px-16 py-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* EXA Bids */}
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

            {/* EXA Boost */}
            <Link href="/boost" className="block group">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 p-[2px] h-full">
                <div className="relative rounded-3xl bg-black/90 backdrop-blur-xl p-6 md:p-8 h-full">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                        <Flame className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl md:text-2xl font-bold text-white">
                        EXA Boost
                      </h3>
                      <p className="text-white/60 text-xs md:text-sm">
                        Swipe, like & boost models to the top!
                      </p>
                    </div>
                  </div>

                  {/* Leaderboard Preview */}
                  {(leaderboardModels?.length ?? 0) > 0 && (
                    <div className="space-y-2 mb-5">
                      {(leaderboardModels || []).map((entry: any, i: number) => (
                        <div key={entry.model_id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                          <span className="w-5 text-center text-xs font-bold text-white/50">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                          </span>
                          <Avatar className="h-8 w-8 border border-orange-500/30">
                            <AvatarImage src={entry.models?.profile_photo_url} />
                            <AvatarFallback className="bg-orange-500/20 text-orange-300 text-xs">
                              {entry.models?.first_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-white font-medium truncate flex-1">
                            {entry.models?.first_name || entry.models?.username}
                          </span>
                          <span className="text-xs text-white/40">
                            {(entry.total_points || 0).toLocaleString()} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs">Live Leaderboard</span>
                    </div>
                    <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold group-hover:scale-105 transition-transform flex items-center gap-2">
                      Play Now
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Upcoming Shows Section */}
        <section className="py-6">
          <div className="container px-8 md:px-16 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 exa-gradient-text">
              Upcoming Shows
            </h2>
          </div>
          <UpcomingEventsCarousel events={upcomingEvents || []} />
        </section>

        {/* EXA TV Banner */}
        <section className="container px-8 md:px-16 py-4">
          <Link href="/tv" className="block group">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-pink-600 to-cyan-600 p-[2px]">
              <div className="relative rounded-3xl bg-black/90 backdrop-blur-xl px-6 py-5 md:px-8 md:py-6 flex items-center gap-4 md:gap-6">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Tv className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-white">
                    EXA TV
                  </h3>
                  <p className="text-white/50 text-xs md:text-sm">
                    Watch 59 runway shows, backstage footage & highlights
                  </p>
                </div>
                <div className="flex-shrink-0 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold group-hover:scale-105 transition-transform flex items-center gap-2">
                  <Play className="h-4 w-4" fill="white" />
                  Watch Now
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Runway Workshop Flyer */}
        {upcomingWorkshop?.cover_image_url && (
          <section className="container px-8 md:px-16 py-6">
            <Link href={`/workshops/${upcomingWorkshop.slug}`} className="block group">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 p-[2px]">
                <div className="relative rounded-3xl bg-black/90 backdrop-blur-xl overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Flyer Image */}
                    <div className="relative aspect-[3/4] md:aspect-auto md:min-h-[500px] overflow-hidden">
                      <Image
                        src={upcomingWorkshop.cover_image_url}
                        alt={upcomingWorkshop.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    {/* Details */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <span className="inline-block w-fit px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white mb-6">
                        Workshop
                      </span>
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        {upcomingWorkshop.title}
                      </h2>
                      {upcomingWorkshop.subtitle && (
                        <p className="text-lg text-white/60 mb-6">{upcomingWorkshop.subtitle}</p>
                      )}
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-white/70">
                          <Calendar className="h-5 w-5 text-pink-400" />
                          <span>{format(new Date(upcomingWorkshop.date), "EEEE, MMMM d, yyyy")}</span>
                        </div>
                        {(upcomingWorkshop.location_city || upcomingWorkshop.location_state) && (
                          <div className="flex items-center gap-3 text-white/70">
                            <MapPin className="h-5 w-5 text-pink-400" />
                            <span>
                              {upcomingWorkshop.location_city && upcomingWorkshop.location_state
                                ? `${upcomingWorkshop.location_city}, ${upcomingWorkshop.location_state}`
                                : upcomingWorkshop.location_city || upcomingWorkshop.location_state}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-base font-semibold group-hover:scale-105 transition-transform flex items-center gap-2">
                          Register Now — ${(upcomingWorkshop.price_cents / 100).toFixed(0)}
                          <ArrowRight className="h-5 w-5" />
                        </div>
                        {upcomingWorkshop.spots_available && (
                          <span className="text-sm text-white/40">
                            {upcomingWorkshop.spots_available - upcomingWorkshop.spots_sold} spots left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Book Top Models Section */}
        <section className="py-12">
          <div className="container px-8 md:px-16 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold exa-gradient-text">
              Book Top Models
            </h2>
          </div>
          <TopModelsCarousel models={topModels || []} showRank={false} showCategories={true} />
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-[#FF69B4]/20">
          <div className="container px-8 md:px-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Image
                  src="/exa-logo-white.png"
                  alt="EXA"
                  width={80}
                  height={32}
                  className="h-8 w-auto"
                />
                <span className="text-muted-foreground">One Platform. Models Worldwide.</span>
              </div>
              <div className="flex items-center gap-6">
                <a
                  href="https://instagram.com/examodels"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[#FF69B4] transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div className="text-center mt-8 text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
