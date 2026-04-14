import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Crown,
  Sparkles,
  Trophy,
  CheckCircle2,
  UserCircle,
  Gift,
  Waves,
  ChevronRight,
} from "lucide-react";
import { CountdownTimer } from "@/components/swimcrown/CountdownTimer";

export const metadata: Metadata = {
  title: "SwimCrown - Global Swim Model Competition | EXA",
  description:
    "Enter SwimCrown, the premier global swim model competition at Miami Swim Week 2026. Walk the runway in gifted designer swimwear and compete for the crown.",
  openGraph: {
    title: "SwimCrown - Global Swim Model Competition | EXA",
    description:
      "Enter SwimCrown, the premier global swim model competition at Miami Swim Week 2026. Walk the runway in gifted designer swimwear and compete for the crown.",
    type: "website",
  },
};

export default async function SwimCrownPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch contestant count for scarcity display
  const { count: contestantCount } = await (supabase as any)
    .from("swimcrown_contestants")
    .select("id", { count: "exact", head: true })
    .in("payment_status", ["paid", "pending"]);

  let navbarUser = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type === "model" || actor?.type === "fan" || actor?.type === "brand" || actor?.type === "admin") {
      actorType = actor.type;
    }

    let avatarUrl = "";
    let name = "";
    let username = "";

    if (actor?.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("profile_photo_url, first_name, username")
        .eq("user_id", user.id)
        .single();
      avatarUrl = model?.profile_photo_url || "";
      name = model?.first_name || "";
      username = model?.username || "";
    } else if (actor?.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("avatar_url, display_name, username")
        .eq("user_id", user.id)
        .single();
      avatarUrl = fan?.avatar_url || "";
      name = fan?.display_name || "";
      username = fan?.username || "";
    } else if (actor?.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("logo_url, company_name")
        .eq("user_id", user.id)
        .single();
      avatarUrl = brand?.logo_url || "";
      name = brand?.company_name || "";
    }

    navbarUser = {
      id: user.id,
      email: user.email || "",
      avatar_url: avatarUrl,
      name,
      username,
    };
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f1628] to-[#0a0a1a]">
      <Navbar user={navbarUser} actorType={actorType} />

      <main>
        {/* ─── Hero ─── */}
        <section className="pt-14 sm:pt-20 pb-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm sm:text-base font-bold tracking-[0.3em] uppercase text-pink-400/90 mb-5">
              EXA Presents
            </p>

            <div className="relative mb-4 inline-flex items-center justify-center">
              <Crown className="h-14 sm:h-16 w-14 sm:w-16 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
              <Sparkles className="absolute -top-2 -right-5 h-6 w-6 text-pink-300 animate-ping [animation-duration:2s]" />
              <Sparkles className="absolute -top-1 -left-5 h-5 w-5 text-cyan-300 animate-ping [animation-duration:2.5s] [animation-delay:0.5s]" />
              <Sparkles className="absolute -bottom-1 right-0 h-4 w-4 text-amber-300 animate-ping [animation-duration:3s] [animation-delay:1s]" />
            </div>

            <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-white/40 mb-2">
              The 1st Annual
            </p>

            <h1 className="mx-auto max-w-4xl text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-pink-300 via-rose-400 to-pink-400 bg-clip-text text-transparent">
                SWIM
              </span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                CROWN
              </span>
            </h1>

            <p className="mt-5 text-lg sm:text-xl text-white font-medium tracking-wide">
              World&apos;s #1 Swim Model of the Year Competition
            </p>
          </div>
        </section>

        {/* ─── Video + Competition Details — Split Layout ─── */}
        <section className="relative pb-14">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">

              {/* Left — Portrait Video with Overlay */}
              <div className="max-w-sm mx-auto lg:max-w-none">
                <div className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-pink-500/20 shadow-2xl shadow-pink-500/10">
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    src="https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/portfolio/swimcrown/jb-paris-crown.mp4"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-center">
                    <p className="text-white text-xl sm:text-2xl font-bold leading-snug mb-3">
                      Who Will Be Crowned Miss SwimCrown 2026?
                    </p>
                    <p className="text-white text-base leading-relaxed mb-6">
                      Walk the runway at Miami Swim Week.
                      Compete before a live audience and an elite panel of judges for
                      the title of World&apos;s #1 Swim Model.
                    </p>
                    <Link href="/swimcrown/enter" className="lg:hidden">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-8 py-5 text-base rounded-full shadow-lg shadow-pink-500/30"
                      >
                        <Crown className="mr-2 h-5 w-5" />
                        Enter the Competition
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right — Competition Details */}
              <div className="flex flex-col gap-8 lg:sticky lg:top-24">
                {/* Countdown */}
                <div className="text-center lg:text-left">
                  <div className="scale-75 sm:scale-85 lg:scale-90 origin-top lg:origin-top-left">
                    <CountdownTimer />
                  </div>
                </div>

                {/* Competition Card */}
                <div className="relative overflow-hidden rounded-3xl border border-pink-500/20 bg-gradient-to-b from-pink-500/5 via-[#0f1628]/90 to-[#0f1628]/90 p-8">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-400 via-rose-500 to-amber-400" />

                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-2 text-pink-400">
                      <Waves className="h-4 w-4" />
                      <span className="text-sm font-bold tracking-widest uppercase">1st Annual SwimCrown</span>
                      <Waves className="h-4 w-4" />
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                      SwimCrown 2026
                    </h2>

                    <p className="text-lg font-semibold text-pink-300">
                      Saturday, May 30, 2026 &middot; Miami Beach, FL
                    </p>

                    <div className="w-12 h-px bg-gradient-to-r from-pink-500/50 to-transparent" />

                    <p className="text-white text-base leading-relaxed">
                      SwimCrown competition debuts live at{" "}
                      <span className="text-pink-300 font-semibold">Miami Swim Week</span>.
                      The winner receives the{" "}
                      <span className="text-white font-semibold">official crown and sash on stage</span>,
                      earning the title of{" "}
                      <span className="text-amber-300 font-semibold">Miss SwimCrown 2026</span>{" "}
                      and the distinction of{" "}
                      <span className="text-white font-semibold">World&apos;s #1 Swim Model of the Year</span>.
                    </p>

                    <Link href="/swimcrown/enter">
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-pink-500/30"
                      >
                        <Crown className="mr-2 h-5 w-5" />
                        Enter the Competition
                      </Button>
                    </Link>
                    <a href="mailto:team@examodels.com?subject=SwimCrown%20Sponsorship%20Inquiry">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full border-amber-400/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/60 py-5 text-base rounded-full font-bold"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Become a Sponsor
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Entry Tiers ─── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-pink-950/10 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-4xl sm:text-5xl font-black mb-5">
              <span className="bg-gradient-to-r from-pink-300 via-rose-400 to-pink-300 bg-clip-text text-transparent">
                Choose Your Entry
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Entry */}
              <Card className="relative border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 flex flex-col rounded-3xl">
                <Waves className="h-9 w-9 text-pink-400 mb-4" />
                <h3 className="text-xl font-bold text-white">Entry</h3>
                <p className="mt-2 text-4xl font-black text-white">
                  $175
                </p>
                <p className="mt-3 text-base text-white leading-relaxed">
                  Get on the runway and compete. Your contestant profile goes live on EXA. Arrive hair & makeup ready.
                </p>
                <ul className="mt-6 space-y-4 text-base text-white">
                  {[
                    "Walk the runway at Miami Swim Week",
                    "Official SwimCrown contestant profile",
                    "Compete for Miss SwimCrown 2026",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-pink-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <Link href="/swimcrown/enter" className="block">
                    <Button className="w-full border-pink-500/30 text-pink-300 hover:bg-pink-500/10 py-6 text-base rounded-full" variant="outline">
                      Enter — $175
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Full Package */}
              <Card className="relative border-rose-500/30 bg-gradient-to-b from-rose-500/10 to-white/[0.03] backdrop-blur-sm p-8 ring-1 ring-rose-500/20 scale-[1.02] flex flex-col rounded-3xl">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold px-4 py-1 text-sm">
                  Best Value
                </Badge>
                <Gift className="h-9 w-9 text-rose-400 mb-4 mt-2" />
                <h3 className="text-xl font-bold text-rose-300">
                  Full Package
                </h3>
                <p className="mt-2 text-4xl font-black text-white">
                  $399
                </p>
                <p className="mt-3 text-base text-rose-300/70 leading-relaxed">
                  Everything you need to arrive prepared and walk away with more. Designer swimwear, professional content, and the full Swim Week experience.
                </p>
                <ul className="mt-6 space-y-4 text-base text-white">
                  {[
                    "Everything in Entry",
                    "Designer swimwear gifted ($100+ value) — yours to keep",
                    "Hair & makeup included",
                    "Official SwimCrown robe",
                    "Sponsored gift bag (beauty, sun care & lifestyle)",
                    "Professional photos & video of your runway walk",
                    "Featured across EXA social channels",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <Link href="/swimcrown/enter" className="block">
                    <Button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-6 text-base rounded-full shadow-lg shadow-rose-500/20">
                      Enter Full Package — $399
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* ─── Comparison Table ─── */}
            <div className="mt-16 max-w-2xl mx-auto overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
              <table className="w-full">
                <thead>
                  <tr className="bg-pink-500/10">
                    <th className="text-left py-5 px-6 text-white/80 font-semibold text-base">What&apos;s Included</th>
                    <th className="py-5 px-5 text-center text-pink-300 font-bold text-base">Entry<br /><span className="text-white/80 text-sm font-normal">$175</span></th>
                    <th className="py-5 px-5 text-center text-rose-300 font-bold text-base">Full Package<br /><span className="text-white/80 text-sm font-normal">$399</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { feature: "Walk the runway at Miami Swim Week", entry: true, full: true },
                    { feature: "Compete for Miss SwimCrown 2026", entry: true, full: true },
                    { feature: "Designer swimwear gifted ($100+ value)", entry: false, full: true },
                    { feature: "Hair & makeup", entry: false, full: true },
                    { feature: "Official SwimCrown robe", entry: false, full: true },
                    { feature: "Sponsored gift bag", entry: false, full: true },
                    { feature: "Professional photos & video", entry: false, full: true },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6 text-white text-base">{row.feature}</td>
                      <td className="py-4 px-5 text-center">
                        {row.entry ? (
                          <CheckCircle2 className="h-6 w-6 text-pink-400 mx-auto" />
                        ) : (
                          <span className="text-white/15 text-lg">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {row.full ? (
                          <CheckCircle2 className="h-6 w-6 text-rose-400 mx-auto" />
                        ) : (
                          <span className="text-white/15 text-lg">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── Competition Format ─── */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-4xl sm:text-5xl font-black mb-5">
              <span className="bg-gradient-to-r from-pink-300 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                Competition Format
              </span>
            </h2>
            <p className="text-center text-white mb-14 max-w-lg mx-auto text-lg">
              Three rounds. One crown. Every model walks the runway.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto items-stretch">
              {/* Round 1 */}
              <div className="relative rounded-3xl border border-pink-500/15 bg-white/[0.03] p-7 text-center">
                <span className="text-sm font-bold tracking-widest uppercase text-pink-400/70">Round 1</span>
                <h3 className="mt-2 text-2xl font-bold text-white">The Runway</h3>
                <p className="mt-2 text-3xl font-black text-pink-300">All Models</p>
                <p className="mt-4 text-base text-white leading-relaxed">
                  Every model walks the runway. This is your moment — the full experience, the audience, the stage. Judges score every walk.
                </p>
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="h-7 w-7 text-pink-500/40" />
                </div>
              </div>

              {/* Semifinals */}
              <div className="relative rounded-3xl border border-rose-500/15 bg-gradient-to-b from-rose-500/5 to-white/[0.03] p-7 text-center">
                <span className="text-sm font-bold tracking-widest uppercase text-rose-400/70">Semifinals</span>
                <h3 className="mt-2 text-2xl font-bold text-white">Top 30</h3>
                <p className="mt-2 text-3xl font-black text-rose-300">Advance</p>
                <p className="mt-4 text-base text-white leading-relaxed">
                  The top-scoring models return to the runway for a second walk. Higher stakes, closer judging — proving they belong in the Finals.
                </p>
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="h-7 w-7 text-rose-500/40" />
                </div>
              </div>

              {/* Finals */}
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-white/[0.03] p-7 text-center">
                <span className="text-sm font-bold tracking-widest uppercase text-amber-400/70">Finals</span>
                <h3 className="mt-2 text-2xl font-bold text-white">Top 10</h3>
                <p className="mt-2 text-3xl font-black text-amber-300">The Showdown</p>
                <p className="mt-4 text-base text-white leading-relaxed">
                  The final 10 compete for the crown. Judges make their decision. The Top 3 are announced — and Miss SwimCrown 2026 is crowned live on stage.
                </p>
              </div>
            </div>

            {/* Top 3 callout */}
            <div className="mt-12 max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-8 sm:gap-10 rounded-3xl border border-amber-500/20 bg-amber-500/5 px-10 py-7">
                <div>
                  <Crown className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-amber-300">Miss SwimCrown</p>
                </div>
                <div>
                  <Trophy className="h-9 w-9 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-zinc-300">1st Runner-Up</p>
                </div>
                <div>
                  <Trophy className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-amber-600">2nd Runner-Up</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Judges Panel ─── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-pink-950/10 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-4xl sm:text-5xl font-black mb-14">
              <span className="bg-gradient-to-r from-pink-300 to-rose-400 bg-clip-text text-transparent">
                Meet the Judges
              </span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { name: "Miriam", role: "Founder, EXA Models", image: "https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/avatars/172bac94-7d23-43de-8b55-aad09c3115ef/1767135037631.jpg" },
                { name: "TBA", role: "Swimwear Designer", image: null },
                { name: "TBA", role: "Swimwear Designer", image: null },
                { name: "TBA", role: "Swimwear Designer", image: null },
                { name: "TBA", role: "Celebrity Judge", image: null },
                { name: "TBA", role: "Industry Expert", image: null },
              ].map((judge, i) => (
                <Card key={i} className="border-white/10 bg-white/[0.03] p-6 text-center rounded-3xl">
                  <div className="mx-auto mb-4 relative h-24 w-24 rounded-full overflow-hidden border-2 border-pink-500/20">
                    {judge.image ? (
                      <Image
                        src={judge.image}
                        alt={judge.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-500/10">
                        <UserCircle className="h-12 w-12 text-pink-400/40" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{judge.name}</h3>
                  <p className="mt-1 text-sm text-white/80">{judge.role}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>


        {/* ─── Final CTA ─── */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl">
              <Crown className="mx-auto h-14 w-14 text-amber-400 mb-6 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]" />
              <h2 className="text-4xl sm:text-5xl font-black mb-5 text-white">
                Will You Be Crowned?
              </h2>
              <p className="text-white mb-8 text-lg leading-relaxed">
                Models from around the world are entering for their chance to step onto the
                runway at Miami Swim Week — and earn the title of Miss SwimCrown 2026.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/swimcrown/enter">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold px-10 py-7 text-xl rounded-full shadow-lg shadow-pink-500/30"
                  >
                    <Crown className="mr-2 h-6 w-6" />
                    Enter Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {navbarUser && (
        <BottomNav
          user={{
            avatar_url: navbarUser.avatar_url,
            name: navbarUser.name,
            email: navbarUser.email,
          }}
          actorType={actorType}
        />
      )}
    </div>
  );
}
