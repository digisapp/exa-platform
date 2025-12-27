import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloatingOrbs } from "@/components/ui/floating-orbs";
import {
  Sparkles,
  Users,
  Trophy,
  MapPin,
  Calendar,
  ArrowRight,
  Star,
  Plane,
  Camera,
  Instagram,
  Building2,
  Palette,
  Video,
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
            <div className="flex items-center gap-4">
              <Link
                href="/models"
                className="text-muted-foreground hover:text-[#FF69B4] transition-colors hidden sm:block"
              >
                Models
              </Link>
              <Link
                href="/opportunities"
                className="text-muted-foreground hover:text-[#FF69B4] transition-colors hidden sm:block"
              >
                Opportunities
              </Link>
              <Link href="/login">
                <Button variant="outline" className="border-[#FF69B4]/50 hover:border-[#FF69B4] hover:bg-[#FF69B4]/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="exa-gradient-button">Join Now</Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container px-8 md:px-16 py-16 md:py-24 lg:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
              <Sparkles className="h-4 w-4 text-[#FF69B4]" />
              <span className="text-sm">The Premier Model Community</span>
            </div>

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

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/signup">
                <Button size="lg" className="exa-gradient-button text-lg px-10 h-14 rounded-full">
                  Join as a Model
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/models">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 h-14 rounded-full border-[#00BFFF]/50 hover:border-[#00BFFF] hover:bg-[#00BFFF]/10"
                >
                  Browse Models
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 md:gap-16 w-full max-w-xl">
              <div className="stat-card py-6">
                <div className="text-3xl font-bold text-[#FF69B4]">5,000+</div>
                <div className="text-sm text-muted-foreground">Models</div>
              </div>
              <div className="stat-card py-6">
                <div className="text-3xl font-bold text-[#00BFFF]">200+</div>
                <div className="text-sm text-muted-foreground">Shows</div>
              </div>
              <div className="stat-card py-6">
                <div className="text-3xl font-bold text-[#FF00FF]">50+</div>
                <div className="text-sm text-muted-foreground">Brands</div>
              </div>
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
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Build your profile, apply to opportunities, earn points, and grow your career.
              </p>
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
                Opportunities Await
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From runway shows to travel adventures, find your next opportunity.
              </p>
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

            <div className="text-center mt-12">
              <Link href="/opportunities">
                <Button variant="outline" size="lg" className="rounded-full border-[#FF69B4]/50 hover:border-[#FF69B4] hover:bg-[#FF69B4]/10">
                  View All Opportunities
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
                { level: "Elite", points: "5,000+", icon: "👑", perks: "VIP opportunities", class: "level-elite" },
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

        {/* Upcoming Events */}
        <section className="py-24">
          <div className="container px-8 md:px-16">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2 exa-gradient-text">
                  Upcoming Events
                </h2>
                <p className="text-muted-foreground">Join our next shows and experiences</p>
              </div>
              <Link href="/opportunities">
                <Button variant="outline" className="rounded-full border-[#00BFFF]/50 hover:border-[#00BFFF]">
                  View All
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Art Basel Miami",
                  date: "December 2025",
                  location: "Miami Beach, FL",
                  type: "Fashion Show",
                  spots: 20,
                  emoji: "🎨",
                },
                {
                  title: "Hawaii Retreat",
                  date: "February 2026",
                  location: "Honolulu, HI",
                  type: "Travel Experience",
                  spots: 10,
                  emoji: "🌺",
                },
                {
                  title: "Miami Swim Week",
                  date: "May 2026",
                  location: "Miami, FL",
                  type: "Fashion Show",
                  spots: 50,
                  emoji: "👙",
                },
              ].map((event, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl overflow-hidden hover:scale-105 transition-all group"
                >
                  <div className="h-40 bg-gradient-to-br from-[#FF69B4]/20 to-[#9400D3]/20 flex items-center justify-center">
                    <span className="text-6xl">{event.emoji}</span>
                  </div>
                  <div className="p-6">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-[#FF69B4]/20 text-[#FF69B4]">
                      {event.type}
                    </span>
                    <h3 className="text-xl font-semibold mb-3">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4 text-[#00BFFF]" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4 text-[#FF69B4]" />
                      {event.location}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{event.spots} spots</span>
                      <Button size="sm" className="exa-gradient-button rounded-full">
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner With Us */}
        <section className="py-24">
          <div className="container px-8 md:px-16">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 exa-gradient-text">
                Partner With EXA
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Join our network as a brand, designer, or media partner.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Building2,
                  title: "Brands",
                  description: "Connect with top models for campaigns, events, and brand ambassadors.",
                  cta: "Partner With Us",
                  href: "/brands/inquiry",
                  gradient: "from-[#FF69B4] to-[#FF00FF]",
                },
                {
                  icon: Palette,
                  title: "Designers",
                  description: "Showcase your collections with our community of professional models.",
                  cta: "Join as Designer",
                  href: "/designers/signup",
                  gradient: "from-[#9400D3] to-[#4B0082]",
                },
                {
                  icon: Video,
                  title: "Media & Press",
                  description: "Get exclusive access to shows, behind-the-scenes content, and interviews.",
                  cta: "Apply for Access",
                  href: "/media/signup",
                  gradient: "from-[#00BFFF] to-[#0099cc]",
                },
              ].map((partner, index) => (
                <Link
                  key={index}
                  href={partner.href}
                  className="glass-card rounded-2xl p-8 hover:scale-105 transition-all group block"
                >
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${partner.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <partner.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{partner.title}</h3>
                  <p className="text-muted-foreground mb-6">{partner.description}</p>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r ${partner.gradient} text-white`}>
                    {partner.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container px-8 md:px-16">
            <div className="glass-card rounded-3xl p-12 md:p-16 text-center max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 exa-glow-text">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-muted-foreground mb-10">
                Join thousands of models building their careers on EXA.
                It&apos;s free to create your profile.
              </p>
              <Link href="/signup">
                <Button size="lg" className="exa-gradient-button text-lg px-12 h-14 rounded-full">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
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
                <Link href="/opportunities" className="text-muted-foreground hover:text-[#FF69B4] transition-colors">
                  Opportunities
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
