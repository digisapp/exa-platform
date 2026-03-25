import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Crown,
  Star,
  Camera,
  Heart,
  ArrowRight,
  Sparkles,
  Trophy,
  CheckCircle2,
  Users,
  Vote,
  Gem,
} from "lucide-react";

export const metadata: Metadata = {
  title: "SwimCrown - Global Swim Model Competition | EXA",
  description:
    "Enter SwimCrown, the premier global swim model competition. Compete for the crown at Miami Swim Week 2026 with prizes totaling over $10,000. Join the world's top swimwear models on EXA.",
  openGraph: {
    title: "SwimCrown - Global Swim Model Competition | EXA",
    description:
      "Enter SwimCrown, the premier global swim model competition at Miami Swim Week 2026. Over $10,000 in prizes.",
    type: "website",
  },
};

export default async function SwimCrownPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-black/40">
      <Navbar user={navbarUser} actorType={actorType} />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent blur-3xl" />
            <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-pink-500/15 via-violet-500/10 to-transparent blur-3xl" />
          </div>

          <div className="container relative mx-auto px-4 text-center">
            <Badge className="mb-6 inline-flex items-center gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-300 px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              2026 Miami Swim Week
            </Badge>

            <div className="relative mb-4 inline-flex items-center justify-center">
              <span className="text-6xl sm:text-7xl lg:text-8xl drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse [animation-duration:3s]">
                👑
              </span>
              <Sparkles className="absolute -top-2 -right-4 h-5 w-5 text-yellow-300 animate-ping [animation-duration:2s]" />
              <Sparkles className="absolute -top-1 -left-4 h-4 w-4 text-amber-300 animate-ping [animation-duration:2.5s] [animation-delay:0.5s]" />
              <Sparkles className="absolute -bottom-1 right-0 h-3 w-3 text-yellow-400 animate-ping [animation-duration:3s] [animation-delay:1s]" />
            </div>

            <h1 className="mx-auto max-w-4xl text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter">
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                SWIM
              </span>
              <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                CROWN
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
              The Global Swim Model Competition
            </p>

            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/70">
              Compete for the crown, walk the runway at Miami Swim Week, and
              launch your career on the world stage.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/swimcrown/enter">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-amber-500/25"
                >
                  <Crown className="mr-2 h-5 w-5" />
                  Enter the Competition
                </Button>
              </Link>
              <Link href="/swimcrown/contestants">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 px-8 py-6 text-lg rounded-full"
                >
                  View Contestants
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── About ─── */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                What is SwimCrown?
              </span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              SwimCrown is the premier global swimwear model competition hosted
              on EXA. Models from around the world compete for votes, exposure,
              and the coveted SwimCrown Queen title. Our winners are crowned live
              at Miami Swim Week and receive cash prizes, professional shoots,
              and career-changing opportunities.
            </p>
          </div>
        </section>

        {/* ─── Prizes ─── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-amber-950/5 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <Trophy className="inline-block mr-2 h-8 w-8 text-amber-400" />
              <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                Prize Tiers
              </span>
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Over $10,000 in total prizes for our winners
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {/* Queen */}
              <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
                <Crown className="mx-auto h-10 w-10 text-amber-400 mb-3" />
                <h3 className="text-lg font-bold text-amber-300">
                  SwimCrown Queen
                </h3>
                <p className="text-3xl font-black text-white mt-2">$5,000</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    Official crown & sash
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    Destination photoshoot
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    EXA cover feature
                  </li>
                </ul>
              </Card>

              {/* 1st Runner-Up */}
              <Card className="relative overflow-hidden border-zinc-500/30 bg-gradient-to-b from-zinc-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-zinc-300 to-zinc-400" />
                <Star className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
                <h3 className="text-lg font-bold text-zinc-300">
                  1st Runner-Up
                </h3>
                <p className="text-3xl font-black text-white mt-2">$2,500</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                    Runner-up sash
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                    Professional photoshoot
                  </li>
                </ul>
              </Card>

              {/* Fan Favorite */}
              <Card className="relative overflow-hidden border-pink-500/30 bg-gradient-to-b from-pink-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 to-violet-500" />
                <Heart className="mx-auto h-10 w-10 text-pink-400 mb-3" />
                <h3 className="text-lg font-bold text-pink-300">
                  Fan Favorite
                </h3>
                <p className="text-3xl font-black text-white mt-2">$1,500</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
                    Most public votes
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-pink-400 mt-0.5 shrink-0" />
                    Social media feature
                  </li>
                </ul>
              </Card>

              {/* Miss Photogenic */}
              <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-b from-violet-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <Camera className="mx-auto h-10 w-10 text-violet-400 mb-3" />
                <h3 className="text-lg font-bold text-violet-300">
                  Miss Photogenic
                </h3>
                <p className="text-3xl font-black text-white mt-2">$1,000</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                    Judge-selected
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                    Magazine feature
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-12">
              <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "01",
                  icon: Gem,
                  title: "Enter & Pay",
                  description:
                    "Choose your entry tier, complete your profile, and pay your entry fee via secure Stripe checkout.",
                },
                {
                  step: "02",
                  icon: Vote,
                  title: "Get Votes",
                  description:
                    "Share your contestant page. Fans vote using EXA coins — 1 coin = 1 vote. Rally your supporters!",
                },
                {
                  step: "03",
                  icon: Crown,
                  title: "Win the Crown",
                  description:
                    "Top vote-getters and judge favorites are crowned at Miami Swim Week. Walk the runway and claim your title.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/20">
                    <item.icon className="h-8 w-8 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-amber-500/60 tracking-widest uppercase">
                    Step {item.step}
                  </span>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Entry Tiers ─── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-amber-950/5 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                Entry Tiers
              </span>
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Choose the tier that fits your goals
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Standard */}
              <Card className="relative border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="text-lg font-bold text-white">Standard</h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $299
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "SwimCrown contestant profile",
                    "Online public voting",
                    "Official contestant badge",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/swimcrown/enter" className="block mt-8">
                  <Button className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10" variant="outline">
                    Select Standard
                  </Button>
                </Link>
              </Card>

              {/* Crown — Featured */}
              <Card className="relative border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-zinc-900/50 p-6 ring-1 ring-amber-500/20 scale-[1.02]">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold px-3">
                  Most Popular
                </Badge>
                <h3 className="text-lg font-bold text-amber-300 mt-2">
                  Crown Package
                </h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $549
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Everything in Standard",
                    "Runway training session",
                    "Professional swim photoshoot",
                    "Digital comp card",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/swimcrown/enter" className="block mt-8">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold">
                    Select Crown
                  </Button>
                </Link>
              </Card>

              {/* Elite */}
              <Card className="relative border-violet-500/30 bg-gradient-to-b from-violet-500/5 to-zinc-900/50 p-6">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold px-3">
                  Premium
                </Badge>
                <h3 className="text-lg font-bold text-violet-300 mt-2">
                  Elite Package
                </h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $799
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Everything in Crown",
                    "Priority placement in gallery",
                    "Social media feature on EXA",
                    "Exclusive video interview",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/swimcrown/enter" className="block mt-8">
                  <Button className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10" variant="outline">
                    Select Elite
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl">
              <Crown className="mx-auto h-12 w-12 text-amber-400 mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Ready to Compete?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join hundreds of models from around the world and compete for
                the SwimCrown title at Miami Swim Week 2026.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/swimcrown/enter">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-amber-500/25"
                  >
                    <Crown className="mr-2 h-5 w-5" />
                    Enter Now
                  </Button>
                </Link>
                <Link href="/swimcrown/contestants">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 px-8 py-6 text-lg rounded-full"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    View Contestants
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
