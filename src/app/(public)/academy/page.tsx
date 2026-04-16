import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
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
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-violet-500/30 blur-3xl" />

          <div className="relative container px-4 md:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-2 mb-5">
                <Sparkles className="h-5 w-5 text-pink-400" />
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                  NOW ACCEPTING APPLICATIONS
                </span>
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>

              <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-3">
                EXA Beauty Academy
              </p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-white">Become a </span>
                <span className="exa-gradient-text">Runway Makeup Artist</span>
              </h1>

              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
                Train with EXA Beauty Academy and graduate working backstage at major
                fashion shows including Miami Swim Week, New York Fashion Week, and Art Basel.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white">
                  <Clock className="h-3.5 w-3.5 text-pink-400" />
                  <span>8-Week Program</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white">
                  <Users className="h-3.5 w-3.5 text-violet-400" />
                  <span>Limited to 40 Students</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white">
                  <Award className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Certification Included</span>
                </div>
              </div>

              <a
                href="#apply"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white px-8 py-4 rounded-full text-lg font-bold transition-all shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:shadow-[0_0_32px_rgba(236,72,153,0.7)] active:scale-[0.98]"
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
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                Credibility
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                <span className="exa-gradient-text">Real Fashion Shows. Real Experience.</span>
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                EXA produces major fashion shows and works with hundreds of professional
                models each year. Our academy gives you direct access to the industry.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { emoji: "👗", title: "Miami Swim Week", desc: "Work backstage at one of the biggest swimwear fashion events in the world.", rgb: "236,72,153" },
                { emoji: "✨", title: "New York Fashion Week", desc: "Graduate by doing makeup backstage at NYFW runway shows.", rgb: "167,139,250" },
                { emoji: "🎨", title: "Art Basel", desc: "Experience the intersection of art and fashion at Art Basel shows.", rgb: "34,211,238" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 text-center hover:border-white/25 transition-all"
                >
                  <div
                    className="pointer-events-none absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-50 transition-opacity"
                    style={{ background: `rgba(${item.rgb}, 0.5)` }}
                  />
                  <div className="relative">
                    <div className="text-4xl mb-4">{item.emoji}</div>
                    <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What You'll Learn */}
          <section className="py-16 md:py-20 border-t border-white/10">
            <div className="text-center mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                Curriculum highlights
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                <span className="exa-gradient-text">What You&apos;ll Learn</span>
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                Our 8-week program covers everything you need to work as a professional
                runway makeup artist.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
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
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.05] border border-white/10 hover:border-emerald-500/30 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/80">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Graduate Backstage */}
          <section className="py-16 md:py-20 border-t border-white/10">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-flex items-center mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(236,72,153,0.4)]">
                  THE EXA DIFFERENCE
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  <span className="exa-gradient-text">Graduate Backstage</span>
                </h2>
                <p className="text-white/60 text-lg max-w-2xl mx-auto">
                  Most beauty programs teach theory. Our students graduate by working
                  backstage at real fashion shows — an experience most makeup artists
                  never get.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {COHORTS.map((cohort) => (
                  <div
                    key={cohort.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 text-center hover:border-white/25 transition-all group"
                  >
                    <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-pink-500/20 blur-2xl opacity-0 group-hover:opacity-50 transition-opacity" />
                    <div className="relative">
                      <div className="text-4xl mb-3">{cohort.icon}</div>
                      <h3 className="font-bold text-white text-lg mb-1">{cohort.name}</h3>
                      <p className="text-sm text-white/50 mb-3">{cohort.dates}</p>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${cohort.color} text-white text-xs font-semibold shadow-[0_0_12px_rgba(236,72,153,0.3)]`}>
                        <Star className="h-3 w-3" />
                        Graduate at {cohort.event}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Weekly Curriculum */}
          <section className="py-16 md:py-20 border-t border-white/10">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                  Week by week
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  <span className="exa-gradient-text">8-Week Curriculum</span>
                </h2>
                <p className="text-white/60 text-lg">
                  One live virtual class per week, plus recorded modules and assignments.
                </p>
              </div>

              <div className="space-y-2.5">
                {CURRICULUM.map((week) => (
                  <div
                    key={week.week}
                    className="flex gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-pink-500/25 hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_rgba(236,72,153,0.35)]">
                      W{week.week}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-0.5">{week.title}</h3>
                      <p className="text-sm text-white/60">{week.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Certification */}
          <section className="py-16 md:py-20 border-t border-white/10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full bg-amber-500/40 blur-2xl opacity-60" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/40 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.3)]">
                  <Award className="h-10 w-10 text-amber-300" />
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-semibold mb-2">
                Certification
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                <span className="exa-gradient-text">EXA Certified Runway Makeup Artist</span>
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                Graduates receive an official certification recognized across the fashion industry.
              </p>

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { emoji: "📜", title: "Digital Certificate", desc: "Official EXA certification" },
                  { emoji: "📸", title: "Backstage Photos", desc: "Professional portfolio content" },
                  { emoji: "🏷️", title: "Production Credit", desc: "Credited on show production" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 text-center hover:border-amber-500/30 transition-all">
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-white/50">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-16 md:py-20 border-t border-white/10">
            <div className="max-w-lg mx-auto text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                Investment
              </p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                <span className="exa-gradient-text">Tuition</span>
              </h2>
              <p className="text-white/60 mb-8">
                Investment in your runway makeup career
              </p>

              <div
                className="relative overflow-hidden rounded-2xl border border-pink-500/40 p-8 shadow-[0_0_32px_rgba(236,72,153,0.15)]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.08) 100%)",
                }}
              >
                <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative">
                  <div className="mb-6">
                    <div className="text-5xl md:text-6xl font-bold mb-2">
                      <span className="exa-gradient-text">$1,995</span>
                    </div>
                    <p className="text-white/60 text-sm">or 4 payments of $499</p>
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
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-white/80">{item}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="#apply"
                    className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white px-6 py-3.5 rounded-full font-bold shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_28px_rgba(236,72,153,0.6)] transition-all active:scale-[0.98]"
                  >
                    Apply for the Program
                    <ArrowRight className="h-5 w-5" />
                  </a>

                  <p className="text-xs text-white/50 mt-4">
                    Seats are limited per cohort. Apply early to secure your spot.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Application Form */}
          <section id="apply" className="py-16 md:py-20 border-t border-white/10 scroll-mt-20">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                  Application
                </p>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                  <span className="exa-gradient-text">Apply for EXA Beauty Academy</span>
                </h2>
                <p className="text-white/60 text-lg">
                  Submit your application below. Limited seats available per cohort.
                </p>
              </div>

              <AcademyApplicationForm />
            </div>
          </section>

          {/* FAQ */}
          <section className="py-16 md:py-20 border-t border-white/10">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                Questions
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-white">
                <span className="exa-gradient-text">Frequently Asked Questions</span>
              </h2>

              <div className="space-y-3">
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
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 hover:border-pink-500/25 transition-all">
                    <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                    <p className="text-sm text-white/60">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>


        </main>

        {/* Footer */}
        <footer className="relative mt-8 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
          </p>
        </footer>
      </div>
    </CoinBalanceProvider>
  );
}
