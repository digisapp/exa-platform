import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  CheckCircle2,
  Award,
  Users,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";
import { AcademyApplicationForm } from "./academy-application-form";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "EXA Beauty Academy — Runway Makeup Certification | EXA Models",
  description:
    "Train with EXA Beauty Academy and graduate working backstage at Miami Swim Week, New York Fashion Week, and Art Basel. 8-week runway makeup certification program.",
  openGraph: {
    title: "EXA Beauty Academy — Runway Makeup Certification",
    description:
      "Train with EXA Beauty Academy and graduate working backstage at major fashion shows. No experience required.",
  },
};

const COHORTS = [
  {
    id: "miami-swim-week",
    name: "Miami Swim Week Cohort",
    dates: "March — May",
    event: "Miami Swim Week",
    icon: "☀️",
    color: "from-pink-500 to-orange-500",
  },
  {
    id: "nyfw",
    name: "New York Fashion Week Cohort",
    dates: "June — August",
    event: "New York Fashion Week",
    icon: "🗽",
    color: "from-violet-500 to-blue-500",
  },
  {
    id: "art-basel",
    name: "Art Basel Cohort",
    dates: "September — November",
    event: "Art Basel",
    icon: "🎨",
    color: "from-cyan-500 to-emerald-500",
  },
];

const CURRICULUM = [
  { week: 1, title: "Skin Prep & Skincare", description: "Professional skin preparation and skincare routines for runway models" },
  { week: 2, title: "Complexion & Foundation", description: "Flawless foundation techniques for diverse skin tones under runway lighting" },
  { week: 3, title: "Runway Eyes", description: "High-fashion eye looks from editorial to commercial runway styles" },
  { week: 4, title: "Contouring & Sculpting", description: "Professional contouring techniques for photography and stage lighting" },
  { week: 5, title: "Makeup for Photography", description: "Understanding lighting, camera angles, and how makeup translates on screen" },
  { week: 6, title: "Speed Makeup Techniques", description: "Master 20-minute full looks for fast-paced backstage environments" },
  { week: 7, title: "Backstage Workflow", description: "Real production workflows, team coordination, and professional backstage etiquette" },
  { week: 8, title: "Fashion Show Preparation", description: "Final preparation and rehearsal for your backstage graduation experience" },
];

export default async function AcademyPage() {
  const supabase = await createClient();

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

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent" />

          <div className="relative container px-4 md:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-pink-500" />
                <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-4 py-1.5 text-sm">
                  Now Accepting Applications
                </Badge>
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                Become a{" "}
                <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                  Runway Makeup Artist
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                Train with EXA Beauty Academy and graduate working backstage at major
                fashion shows including Miami Swim Week, New York Fashion Week, and Art Basel.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-10">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-pink-500" />
                  <span>8-Week Program</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-violet-500" />
                  <span>Limited to 40 Students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-cyan-500" />
                  <span>Certification Included</span>
                </div>
              </div>

              <a
                href="#apply"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40"
              >
                Apply for the Program
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <main className="container px-4 md:px-8">

          {/* Social Proof / Fashion Credibility */}
          <section className="py-16 md:py-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Real Fashion Shows. Real Experience.
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                EXA produces major fashion shows and works with hundreds of professional
                models each year. Our academy gives you direct access to the industry.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center border-pink-500/20 bg-pink-500/5">
                <div className="text-4xl mb-4">👗</div>
                <h3 className="font-semibold text-lg mb-2">Miami Swim Week</h3>
                <p className="text-sm text-muted-foreground">
                  Work backstage at one of the biggest swimwear fashion events in the world.
                </p>
              </Card>
              <Card className="p-6 text-center border-violet-500/20 bg-violet-500/5">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="font-semibold text-lg mb-2">New York Fashion Week</h3>
                <p className="text-sm text-muted-foreground">
                  Graduate by doing makeup backstage at NYFW runway shows.
                </p>
              </Card>
              <Card className="p-6 text-center border-cyan-500/20 bg-cyan-500/5">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="font-semibold text-lg mb-2">Art Basel</h3>
                <p className="text-sm text-muted-foreground">
                  Experience the intersection of art and fashion at Art Basel shows.
                </p>
              </Card>
            </div>
          </section>

          {/* What You'll Learn */}
          <section className="py-16 md:py-20 border-t border-border">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What You&apos;ll Learn
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our 8-week program covers everything you need to work as a professional
                runway makeup artist.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {[
                "Runway makeup techniques for diverse skin tones",
                "Skin prep and skincare for photography",
                "High-fashion editorial and commercial beauty looks",
                "Backstage speed techniques (20-minute full looks)",
                "Working with professional models",
                "Professional backstage workflow and etiquette",
                "Contouring and sculpting for stage lighting",
                "Building your professional makeup portfolio",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Graduate Backstage */}
          <section className="py-16 md:py-20 border-t border-border">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
                  The EXA Difference
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Graduate Backstage
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Most beauty programs teach theory. Our students graduate by working
                  backstage at real fashion shows — an experience most makeup artists
                  never get.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {COHORTS.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="relative p-6 rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-muted/20 text-center"
                  >
                    <div className="text-4xl mb-3">{cohort.icon}</div>
                    <h3 className="font-semibold text-lg mb-1">{cohort.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{cohort.dates}</p>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${cohort.color} text-white text-xs font-medium`}>
                      <Star className="h-3 w-3" />
                      Graduate at {cohort.event}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Weekly Curriculum */}
          <section className="py-16 md:py-20 border-t border-border">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  8-Week Curriculum
                </h2>
                <p className="text-muted-foreground text-lg">
                  One live virtual class per week, plus recorded modules and assignments.
                </p>
              </div>

              <div className="space-y-3">
                {CURRICULUM.map((week) => (
                  <div
                    key={week.week}
                    className="flex gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                      W{week.week}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-0.5">{week.title}</h3>
                      <p className="text-sm text-muted-foreground">{week.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Certification */}
          <section className="py-16 md:py-20 border-t border-border">
            <div className="max-w-3xl mx-auto text-center">
              <Award className="h-16 w-16 text-pink-500 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                EXA Certified Runway Makeup Artist
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Graduates receive an official certification recognized across the fashion industry.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="p-5 text-center">
                  <div className="text-2xl mb-2">📜</div>
                  <h3 className="font-semibold text-sm mb-1">Digital Certificate</h3>
                  <p className="text-xs text-muted-foreground">Official EXA certification</p>
                </Card>
                <Card className="p-5 text-center">
                  <div className="text-2xl mb-2">📸</div>
                  <h3 className="font-semibold text-sm mb-1">Backstage Photos</h3>
                  <p className="text-xs text-muted-foreground">Professional portfolio content</p>
                </Card>
                <Card className="p-5 text-center">
                  <div className="text-2xl mb-2">🏷️</div>
                  <h3 className="font-semibold text-sm mb-1">Production Credit</h3>
                  <p className="text-xs text-muted-foreground">Credited on show production</p>
                </Card>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-16 md:py-20 border-t border-border">
            <div className="max-w-lg mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Tuition</h2>
              <p className="text-muted-foreground mb-8">
                Investment in your runway makeup career
              </p>

              <Card className="p-8 border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-violet-500/5">
                <div className="mb-6">
                  <div className="text-5xl font-bold text-white mb-2">$1,995</div>
                  <p className="text-muted-foreground">or 4 payments of $499</p>
                </div>

                <div className="space-y-3 text-left mb-8">
                  {[
                    "8 weeks of live virtual training",
                    "Recorded lesson modules",
                    "Backstage experience at a major fashion show",
                    "EXA Certified Runway Makeup Artist credential",
                    "Professional backstage photos for your portfolio",
                    "Production credit on EXA fashion shows",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="#apply"
                  className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white px-6 py-3.5 rounded-xl font-semibold transition-all"
                >
                  Apply for the Program
                  <ArrowRight className="h-5 w-5" />
                </a>

                <p className="text-xs text-muted-foreground mt-4">
                  Seats are limited per cohort. Apply early to secure your spot.
                </p>
              </Card>
            </div>
          </section>

          {/* Application Form */}
          <section id="apply" className="py-16 md:py-20 border-t border-border scroll-mt-20">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Apply for EXA Beauty Academy
                </h2>
                <p className="text-muted-foreground text-lg">
                  Submit your application below. Limited seats available per cohort.
                </p>
              </div>

              <AcademyApplicationForm />
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 md:py-20 border-t border-border">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-10">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {[
                  {
                    q: "Do I need makeup experience?",
                    a: "No prior professional experience is required. Our program is designed for beginners through intermediate artists who want to break into the fashion industry.",
                  },
                  {
                    q: "Do I need my own makeup kit?",
                    a: "Yes — a recommended kit list is provided after enrollment. We also offer a professional makeup kit package as an optional add-on.",
                  },
                  {
                    q: "Will I actually work backstage at a fashion show?",
                    a: "Yes. Students who complete the full program are placed on the backstage makeup team for the corresponding fashion event (Miami Swim Week, NYFW, or Art Basel).",
                  },
                  {
                    q: "Are the classes virtual or in-person?",
                    a: "The 8-week training is delivered virtually through live weekly classes and recorded modules. The backstage graduation experience is in-person at the fashion event.",
                  },
                  {
                    q: "Can I pay in installments?",
                    a: "Yes. We offer a 4-payment plan of $499 per installment, or you can pay in full at $1,995.",
                  },
                  {
                    q: "How many students are in each cohort?",
                    a: "Each cohort is limited to 40 students to ensure quality training and meaningful backstage placement.",
                  },
                ].map((faq, i) => (
                  <Card key={i} className="p-5">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>


        </main>
      </div>
    </CoinBalanceProvider>
  );
}
