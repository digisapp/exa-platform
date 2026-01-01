import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { BrandInquiryDialog } from "@/components/auth/BrandInquiryDialog";
import {
  Sparkles,
  Users,
  Trophy,
  ArrowRight,
  Star,
  Plane,
  Camera,
  Instagram,
} from "lucide-react";

export default function HomePage() {
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
            <a href="https://www.exashows.com" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-full px-8 border-[#9400D3]/50 hover:border-[#9400D3] hover:bg-[#9400D3]/10">
                EXA Shows
              </Button>
            </a>
          </div>
        </div>

        {/* Hero Section */}
        <section className="container px-8 md:px-16 py-16 md:py-24 lg:py-32">
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

            <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              The community where models grow. Join fashion shows, travel experiences,
              and brand campaigns. Earn points, level up, and get booked.
            </p>

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
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="container px-8 md:px-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 exa-gradient-text">
                How EXA Works
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  icon: Users,
                  title: "Create Profile",
                  description: "Build your portfolio with photos, stats, and social links.",
                  color: "#FF69B4",
                },
                {
                  icon: Sparkles,
                  title: "Apply",
                  description: "Browse shows, travel experiences, and campaigns.",
                  color: "#00BFFF",
                },
                {
                  icon: Trophy,
                  title: "Earn Points",
                  description: "Complete tasks and join shows to level up.",
                  color: "#FF00FF",
                },
                {
                  icon: Star,
                  title: "Get Discovered",
                  description: "Higher levels mean better visibility to brands.",
                  color: "#FFED4E",
                },
              ].map((step, index) => (
                <div key={index} className="glass-card rounded-2xl p-6 text-center relative group hover:scale-105 transition-transform">
                  <div
                    className="absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}80)` }}
                  >
                    {index + 1}
                  </div>
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ background: `${step.color}20` }}
                  >
                    <step.icon className="h-8 w-8" style={{ color: step.color }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Opportunity Types */}
        <section className="py-24">
          <div className="container px-8 md:px-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 exa-gradient-text">
                Gigs Await
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Star,
                  title: "Fashion Shows",
                  description: "Walk the runway at Art Basel, Miami Swim Week, and exclusive events.",
                  badge: "Most Popular",
                  gradient: "from-[#FF69B4] to-[#FF00FF]",
                },
                {
                  icon: Plane,
                  title: "Travel Experiences",
                  description: "Join destination shoots in Bali, Hawaii, and stunning locations worldwide.",
                  badge: "Adventure",
                  gradient: "from-[#9400D3] to-[#4B0082]",
                },
                {
                  icon: Camera,
                  title: "Brand Campaigns",
                  description: "Work with top brands on lookbooks, content, and ambassador programs.",
                  badge: "Paid",
                  gradient: "from-[#00BFFF] to-[#0099cc]",
                },
              ].map((type, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-8 hover:scale-105 transition-all group"
                >
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-gradient-to-r ${type.gradient} text-white`}>
                    {type.badge}
                  </span>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <type.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{type.title}</h3>
                  <p className="text-muted-foreground">{type.description}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Levels / Gamification */}
        <section className="py-24">
          <div className="container px-8 md:px-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 exa-gradient-text">
                Level Up Your Career
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Earn points for every action. Higher levels unlock exclusive perks and visibility.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { level: "Rising", points: "0-499", icon: "⭐", perks: "Basic profile", class: "level-rising" },
                { level: "Verified", points: "500-1,999", icon: "✓", perks: "Blue badge, priority search", class: "level-verified" },
                { level: "Pro", points: "2,000-4,999", icon: "💎", perks: "Featured placement", class: "level-pro" },
                { level: "Elite", points: "5,000+", icon: "👑", perks: "VIP gigs", class: "level-elite" },
              ].map((tier, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl p-6 text-center hover:scale-105 transition-transform"
                >
                  <div className="text-5xl mb-4">{tier.icon}</div>
                  <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-3 ${tier.class}`}>
                    {tier.level}
                  </span>
                  <div className="text-sm text-muted-foreground mb-3">{tier.points} points</div>
                  <p className="text-sm">{tier.perks}</p>
                </div>
              ))}
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
