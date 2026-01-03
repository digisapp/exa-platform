import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { BrandInquiryDialog } from "@/components/auth/BrandInquiryDialog";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Instagram,
} from "lucide-react";
import { TopModelsCarousel } from "@/components/home/TopModelsCarousel";
import { UpcomingEventsCarousel } from "@/components/home/UpcomingEventsCarousel";

export default async function TestHomePage() {
  const supabase = await createClient();

  // Fetch top 50 models with 4-5 star admin rating
  const { data: topModels } = await (supabase
    .from("models") as any)
    .select("id, username, first_name, profile_photo_url, state, profile_views, admin_rating")
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null)
    .gte("admin_rating", 4)
    .order("admin_rating", { ascending: false })
    .order("profile_views", { ascending: false })
    .limit(50);

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
    .from("opportunities") as any)
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

        {/* Quick Actions */}
        <div className="container px-8 md:px-16 py-4">
          <div className="flex justify-center gap-4">
            <ModelSignupDialog>
              <Button className="exa-gradient-button rounded-full px-8">
                Models
              </Button>
            </ModelSignupDialog>
            <FanSignupDialog>
              <Button variant="outline" className="rounded-full px-8 border-[#00BFFF]/50 hover:border-[#00BFFF] hover:bg-[#00BFFF]/10">
                Fans
              </Button>
            </FanSignupDialog>
            <BrandInquiryDialog>
              <Button variant="outline" className="rounded-full px-8 border-[#FF69B4]/50 hover:border-[#FF69B4] hover:bg-[#FF69B4]/10">
                Brands
              </Button>
            </BrandInquiryDialog>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container px-8 md:px-16 py-12 md:py-16">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Join Experiences.
              <br />
              <span className="exa-gradient-text exa-glow-text">
                Get Discovered.
              </span>
              <br />
              Become Top Model.
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              The community where models grow. Join fashion shows, travel experiences,
              and brand campaigns. Earn points, level up, and get booked.
            </p>
          </div>
        </section>

        {/* Top Models Section */}
        <section className="py-12">
          <div className="container px-8 md:px-16 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 exa-gradient-text">
              Top Models
            </h2>
            <p className="text-muted-foreground">
              Discover our most popular creators
            </p>
          </div>
          <TopModelsCarousel models={topModels || []} />
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
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <ModelSignupDialog>
                  <Button size="lg" className="exa-gradient-button text-lg px-10 h-14 rounded-full">
                    I&apos;m a Model
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </ModelSignupDialog>
                <FanSignupDialog>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-10 h-14 rounded-full border-[#00BFFF]/50 hover:border-[#00BFFF] hover:bg-[#00BFFF]/10"
                  >
                    I&apos;m a Fan
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </FanSignupDialog>
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
