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
  Camera,
  Gift,
  Waves,
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1f35] to-[#0a1628]">
      <Navbar user={navbarUser} actorType={actorType} />

      <main>
        {/* ─── Hero ─── */}
        <section className="pt-12 sm:pt-16 pb-6">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-teal-400/80 mb-4">
              EXA Presents
            </p>

            <div className="relative mb-3 inline-flex items-center justify-center">
              <Crown className="h-12 sm:h-14 w-12 sm:w-14 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
              <Sparkles className="absolute -top-2 -right-4 h-5 w-5 text-teal-300 animate-ping [animation-duration:2s]" />
              <Sparkles className="absolute -top-1 -left-4 h-4 w-4 text-cyan-300 animate-ping [animation-duration:2.5s] [animation-delay:0.5s]" />
              <Sparkles className="absolute -bottom-1 right-0 h-3 w-3 text-teal-400 animate-ping [animation-duration:3s] [animation-delay:1s]" />
            </div>

            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-white/50 mb-1">
              The 1st Annual
            </p>

            <h1 className="mx-auto max-w-4xl text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                SWIM
              </span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                CROWN
              </span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-white/50 font-medium tracking-wide">
              World&apos;s #1 Swim Model of the Year Competition
            </p>
          </div>
        </section>

        {/* ─── Video + Competition Details — Split Layout ─── */}
        <section className="relative pb-10">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">

              {/* Left — Portrait Video with Overlay */}
              <div className="max-w-sm mx-auto lg:max-w-none">
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-teal-500/20 shadow-2xl shadow-teal-500/10">
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
                    <p className="text-white text-lg sm:text-xl font-bold leading-snug mb-2">
                      Who Will Be Crowned Miss SwimCrown 2026?
                    </p>
                    <p className="text-white/70 text-sm leading-relaxed mb-6">
                      Walk the runway at Miami Swim Week in gifted designer swimwear.
                      Compete before a live audience and an elite panel of judges for
                      the title of World&apos;s #1 Swim Model.
                    </p>
                    <Link href="/swimcrown/enter" className="lg:hidden">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold px-6 py-5 text-base rounded-full shadow-lg shadow-teal-500/25"
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
                <div className="relative overflow-hidden rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-500/10 via-[#0d1f35]/90 to-[#0d1f35]/90 p-8">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-400" />

                  <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-2 text-teal-400">
                      <Waves className="h-4 w-4" />
                      <span className="text-xs font-bold tracking-widest uppercase">1st Annual SwimCrown</span>
                      <Waves className="h-4 w-4" />
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-black text-white">
                      EXA Presents: SwimCrown 2026
                    </h2>

                    <p className="text-base font-semibold text-teal-300">
                      Saturday, May 30, 2026 &middot; Miami Beach, FL
                    </p>

                    <div className="w-12 h-px bg-gradient-to-r from-teal-500/50 to-transparent" />

                    <p className="text-muted-foreground text-sm leading-relaxed">
                      The inaugural SwimCrown competition debuts live at{" "}
                      <span className="text-teal-300 font-semibold">Miami Swim Week</span>.
                      Selected models walk the runway before a live audience,
                      scored by an elite panel of judges. The evening culminates
                      with the crowning ceremony — the winner receives the{" "}
                      <span className="text-white font-semibold">official crown and sash on stage</span>,
                      earning the title of{" "}
                      <span className="text-amber-300 font-semibold">Miss SwimCrown 2026</span>{" "}
                      and the distinction of{" "}
                      <span className="text-white font-semibold">World&apos;s #1 Swim Model of the Year</span>.
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { icon: Crown, text: "Walk the Runway at Miami Swim Week" },
                        { icon: Gift, text: "Gifted Designer Swimwear + Goodie Bag" },
                        { icon: Camera, text: "Professional Runway Content for Your Portfolio" },
                        { icon: Trophy, text: "Compete for Miss SwimCrown 2026" },
                      ].map((item) => (
                        <div key={item.text} className="flex items-center justify-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-3 py-2.5">
                          <item.icon className="h-4 w-4 text-teal-400 shrink-0" />
                          <span className="text-xs font-medium text-white">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <Link href="/swimcrown/enter">
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold px-8 py-5 text-base rounded-full shadow-lg shadow-teal-500/25"
                      >
                        <Crown className="mr-2 h-5 w-5" />
                        Enter the Competition
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Entry Tiers ─── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-teal-950/10 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Choose Your Entry
              </span>
            </h2>
            <p className="text-center text-muted-foreground mb-4 max-w-xl mx-auto">
              Both tiers include a runway walk and compete equally for the crown — your tier determines your experience, not your outcome
            </p>
            <p className="text-center text-xs text-amber-300/70 mb-12 max-w-md mx-auto font-medium">
              All models are scored equally by our judges regardless of entry tier
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Entry */}
              <Card className="relative border-teal-500/20 bg-[#0d1f35]/80 p-6 flex flex-col">
                <Waves className="h-8 w-8 text-teal-400 mb-3" />
                <h3 className="text-lg font-bold text-white">Entry</h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $175
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get on the runway and compete. Your contestant profile goes live on EXA. Arrive hair & makeup ready.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Walk the runway at Miami Swim Week",
                    "Official SwimCrown contestant profile",
                    "Compete for Miss SwimCrown 2026",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Link href="/swimcrown/enter" className="block">
                    <Button className="w-full border-teal-500/30 text-teal-300 hover:bg-teal-500/10" variant="outline">
                      Enter — $175
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Full Package */}
              <Card className="relative border-rose-500/40 bg-gradient-to-b from-rose-500/10 to-[#0d1f35]/80 p-6 ring-1 ring-rose-500/20 scale-[1.02] flex flex-col">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold px-3">
                  Best Value
                </Badge>
                <Gift className="h-8 w-8 text-rose-400 mb-3 mt-2" />
                <h3 className="text-lg font-bold text-rose-300">
                  Full Package
                </h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $399
                </p>
                <p className="mt-2 text-sm text-rose-300/70">
                  Everything you need to arrive prepared and walk away with more. Designer swimwear, professional content, and the full Swim Week experience.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Everything in Entry",
                    "Designer swimwear gifted ($100+ value) — yours to keep",
                    "Hair & makeup included",
                    "Official SwimCrown robe",
                    "Sponsored gift bag (beauty, sun care & lifestyle)",
                    "Professional photos & video of your runway walk",
                    "Featured across EXA social channels",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Link href="/swimcrown/enter" className="block">
                    <Button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold">
                      Enter Full Package — $399
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* ─── Comparison Table ─── */}
            <div className="mt-16 max-w-2xl mx-auto overflow-hidden rounded-2xl border border-teal-500/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-500/10">
                    <th className="text-left py-4 px-5 text-white/70 font-semibold">What&apos;s Included</th>
                    <th className="py-4 px-4 text-center text-teal-300 font-bold">Entry<br /><span className="text-white/50 text-xs font-normal">$175</span></th>
                    <th className="py-4 px-4 text-center text-rose-300 font-bold">Full Package<br /><span className="text-white/50 text-xs font-normal">$399</span></th>
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
                      <td className="py-3 px-5 text-white/70">{row.feature}</td>
                      <td className="py-3 px-4 text-center">
                        {row.entry ? (
                          <CheckCircle2 className="h-5 w-5 text-teal-400 mx-auto" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.full ? (
                          <CheckCircle2 className="h-5 w-5 text-rose-400 mx-auto" />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── Judges Panel ─── */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Meet the Judges
              </span>
            </h2>
            <div className="mb-12" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { name: "Miriam", role: "Founder, EXA Models", image: "https://nanftzomzluetblqgrvo.supabase.co/storage/v1/object/public/avatars/172bac94-7d23-43de-8b55-aad09c3115ef/1767135037631.jpg" },
                { name: "Coming Soon", role: "Swimwear Designer", image: null },
                { name: "Coming Soon", role: "Celebrity Judge", image: null },
                { name: "Coming Soon", role: "Industry Expert", image: null },
              ].map((judge, i) => (
                <Card key={i} className="border-teal-500/10 bg-[#0d1f35]/80 p-6 text-center">
                  <div className="mx-auto mb-4 relative h-20 w-20 rounded-full overflow-hidden border border-teal-500/20">
                    {judge.image ? (
                      <Image
                        src={judge.image}
                        alt={judge.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500/20 to-cyan-500/10">
                        <UserCircle className="h-10 w-10 text-teal-400/50" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{judge.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{judge.role}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>


        {/* ─── Sponsors ─── */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Interested in sponsoring SwimCrown?{" "}
              <a href="mailto:team@examodels.com" className="text-teal-400 hover:underline">
                Contact us — team@examodels.com
              </a>
            </p>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl">
              <Crown className="mx-auto h-12 w-12 text-amber-400 mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Will You Be Crowned?
              </h2>
              <p className="text-muted-foreground mb-3">
                Models from around the world are entering for their chance to step onto the
                runway at Miami Swim Week — and earn the title of Miss SwimCrown 2026.
              </p>
              <p className="text-sm text-amber-300/70 font-medium mb-8">
                Limited to 100 selected models. Applications reviewed and approved.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/swimcrown/enter">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-teal-500/25"
                  >
                    <Crown className="mr-2 h-5 w-5" />
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
