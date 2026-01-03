import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { BrandInquiryDialog } from "@/components/auth/BrandInquiryDialog";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Instagram,
} from "lucide-react";
import { TopModelsCarousel } from "@/components/home/TopModelsCarousel";
import { UpcomingEventsCarousel } from "@/components/home/UpcomingEventsCarousel";

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function TestHomePage() {
  const supabase = await createClient();

  // Fetch top 50 models with 4-5 star admin rating
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
    .gte("admin_rating", 4)
    .limit(50);

  // Randomize the order
  const topModels = shuffleArray(topModelsData || []) as any[];

  // Fetch new faces (models marked as new_face)
  const { data: newFaces } = await (supabase
    .from("models") as any)
    .select("id, username, first_name, profile_photo_url, state, profile_views")
    .eq("is_approved", true)
    .eq("new_face", true)
    .not("profile_photo_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch upcoming events/gigs
  const { data: upcomingEvents } = await (supabase
    .from("gigs") as any)
    .select("id, slug, title, type, location, start_date, end_date, cover_image_url, spots_total, spots_filled")
    .eq("status", "open")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(20);

  return (
    <div className="min-h-screen relative">
      {/* Floating Orbs Background */}
      <FloatingOrbs />

      {/* Content */}
      <div className="relative z-10">
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
            <Link href="/signin">
              <Button variant="outline" className="border-[#FF69B4]/50 hover:border-[#FF69B4] hover:bg-[#FF69B4]/10">
                Sign In
              </Button>
            </Link>
          </div>
        </nav>

        {/* Split Hero Section */}
        <section className="container px-8 md:px-16 py-6 md:py-10">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Models Side */}
            <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent border border-pink-500/20 hover:border-pink-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white mb-6">
                  For Models
                </span>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                  Join Experiences.
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
            <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 hover:border-amber-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -left-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white mb-6">
                  For Fans
                </span>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                  Follow Models.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Get Exclusive.</span>
                </h2>

                <FanSignupDialog>
                  <Button size="lg" className="text-base px-8 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    Fan Sign Up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </FanSignupDialog>
              </div>
            </div>

            {/* Brands Side */}
            <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
              {/* Decorative glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />

              <div className="relative z-10">
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white mb-6">
                  For Brands
                </span>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                  Book Models.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Campaigns + more</span>
                </h2>

                <BrandInquiryDialog>
                  <Button size="lg" className="text-base px-8 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
                    Brand Sign Up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </BrandInquiryDialog>
              </div>
            </div>
          </div>
        </section>

        {/* Book Top Models Section */}
        <section className="py-6">
          <div className="container px-8 md:px-16 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold exa-gradient-text">
              Book Top Models
            </h2>
          </div>
          <TopModelsCarousel models={topModels || []} showRank={false} showCategories={true} />
        </section>

        {/* New Faces Section */}
        {(newFaces?.length ?? 0) > 0 && (
          <section className="py-12">
            <div className="container px-8 md:px-16 mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-2 exa-gradient-text">
                New Faces
              </h2>
              <p className="text-muted-foreground">
                Meet our newest talent
              </p>
            </div>
            <TopModelsCarousel models={newFaces || []} />
          </section>
        )}

        {/* Upcoming Experiences Section */}
        <section className="py-12">
          <div className="container px-8 md:px-16 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 exa-gradient-text">
              Upcoming Experiences
            </h2>
            <p className="text-muted-foreground">
              Fashion shows, travel experiences, and brand campaigns
            </p>
          </div>
          <UpcomingEventsCarousel events={upcomingEvents || []} />
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container px-8 md:px-16">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">
                Ready to get started?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <ModelSignupDialog>
                  <Button size="lg" className="exa-gradient-button text-lg px-10 h-14 rounded-full">
                    Models Sign Up
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </ModelSignupDialog>
                <BrandInquiryDialog>
                  <Button
                    size="lg"
                    className="text-lg px-10 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                  >
                    Brand Sign Up
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </BrandInquiryDialog>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <Link href="/models" className="hover:text-[#FF69B4] transition-colors">
                  Browse Models
                </Link>
                <span className="text-muted-foreground/50">•</span>
                <Link href="/brands/inquiry" className="hover:text-[#FF69B4] transition-colors">
                  Brand Partnerships
                </Link>
              </div>
            </div>
          </div>
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
                <span className="text-muted-foreground">The Premier Model Platform</span>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/models" className="text-muted-foreground hover:text-[#FF69B4] transition-colors">
                  Models
                </Link>
                <Link href="/leaderboard" className="text-muted-foreground hover:text-[#FF69B4] transition-colors">
                  Leaderboard
                </Link>
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
