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
  Vote,
  Gem,
  Instagram,
  UserCircle,
  Camera,
  Gift,
  Shirt,
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

            <p className="mt-4 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              The Search for the World&apos;s #1
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
              Swim Model of the Year
            </p>

            <p className="mt-4 text-sm sm:text-base text-white/60 font-medium tracking-wide">
              One Crown. One Title. One Year of Reign.
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
                      The 1st Annual SwimCrown competition debuts live at{" "}
                      <span className="text-teal-300 font-semibold">Miami Swim Week</span>.
                      Each selected model walks the runway before a live audience,
                      styled in{" "}
                      <span className="text-rose-300 font-semibold">gifted designer swimwear ($100+ value)</span>{" "}
                      from our featured sponsors. Scored live by an elite panel of
                      judges, the evening culminates with the crowning ceremony — the
                      winner receives the{" "}
                      <span className="text-white font-semibold">official crown and sash on stage</span>,
                      earning the title of{" "}
                      <span className="text-amber-300 font-semibold">Miss SwimCrown 2026</span>{" "}
                      and holding the distinction of{" "}
                      <span className="text-white font-semibold">World&apos;s #1 Swim Model of the Year</span>{" "}
                      for the entire year.
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

        {/* ─── What You Get ─── */}
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-teal-950/10 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <Gift className="inline-block mr-2 h-8 w-8 text-rose-400" />
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                What Every Model Gets
              </span>
            </h2>
            <p className="text-center text-white/50 mb-12 max-w-xl mx-auto text-sm">
              Every competitor walks away with more than a runway moment
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Designer Swimwear */}
              <Card className="relative overflow-hidden border-teal-500/30 bg-gradient-to-b from-teal-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 to-cyan-500" />
                <Shirt className="mx-auto h-10 w-10 text-teal-400 mb-3" />
                <h3 className="text-lg font-bold text-teal-300">
                  Designer Swimwear
                </h3>
                <p className="text-2xl font-black text-white mt-2">$100+ Value</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Every model is gifted designer swimwear from our featured sponsors — yours to keep and wear on the runway.
                </p>
              </Card>

              {/* Goodie Bag */}
              <Card className="relative overflow-hidden border-rose-500/30 bg-gradient-to-b from-rose-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 to-pink-500" />
                <Gift className="mx-auto h-10 w-10 text-rose-400 mb-3" />
                <h3 className="text-lg font-bold text-rose-300">
                  Sponsor Goodie Bag
                </h3>
                <p className="text-2xl font-black text-white mt-2">Exclusive</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Beauty, sun care, and lifestyle products from our sponsors — curated exclusively for SwimCrown competitors.
                </p>
              </Card>

              {/* The Crown */}
              <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent p-6 text-center">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
                <Crown className="mx-auto h-10 w-10 text-amber-400 mb-3" />
                <h3 className="text-lg font-bold text-amber-300">
                  Miss SwimCrown 2026
                </h3>
                <p className="text-2xl font-black text-white mt-2">The Title</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground text-left">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    Official crown & sash on stage
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    Hold the title for the entire year
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    Featured on EXA homepage & socials
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    Priority booking with partner brands
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
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
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
                    "Choose your entry tier, complete your profile, and secure your spot. You'll be matched with gifted designer swimwear from our sponsors.",
                },
                {
                  step: "02",
                  icon: Vote,
                  title: "Get Votes",
                  description:
                    "Share your contestant page with your audience. Fans vote using EXA coins — rally your supporters and rise in the rankings!",
                },
                {
                  step: "03",
                  icon: Crown,
                  title: "Walk & Win",
                  description:
                    "Compete on the runway at Miami Swim Week in your gifted swimwear. Judges score live, and the winner is crowned on stage.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/20">
                    <item.icon className="h-8 w-8 text-teal-400" />
                  </div>
                  <span className="text-xs font-bold text-teal-500/60 tracking-widest uppercase">
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
        <section className="py-20 sm:py-24 bg-gradient-to-b from-transparent via-teal-950/10 to-transparent">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Compete Your Way
              </span>
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Both tiers get you on the runway in gifted designer swimwear — pick the one that matches your ambition
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Standard */}
              <Card className="relative border-teal-500/20 bg-[#0d1f35]/80 p-6 flex flex-col">
                <Waves className="h-8 w-8 text-teal-400 mb-3" />
                <h3 className="text-lg font-bold text-white">Standard Entry</h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $150
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Walk the runway, compete for the crown, and take home gifted designer swimwear and a sponsor goodie bag. Your profile goes live for fan voting.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Walk the runway at Miami Swim Week",
                    "Gifted designer swimwear ($100+ value)",
                    "Sponsor goodie bag",
                    "Official SwimCrown contestant profile",
                    "Online public fan voting",
                    "Professional runway content",
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
                      Enter Standard — $150
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* VIP */}
              <Card className="relative border-rose-500/40 bg-gradient-to-b from-rose-500/10 to-[#0d1f35]/80 p-6 ring-1 ring-rose-500/20 scale-[1.02] flex flex-col">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold px-3">
                  Recommended
                </Badge>
                <Crown className="h-8 w-8 text-rose-400 mb-3 mt-2" />
                <h3 className="text-lg font-bold text-rose-300">
                  VIP Entry
                </h3>
                <p className="mt-1 text-3xl font-black text-white">
                  $250
                </p>
                <p className="mt-2 text-sm text-rose-300/70">
                  Skip the prelims and go straight to the finals. Get runway coaching so you shine on stage, plus priority placement in front of judges. This is how serious competitors show up.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Everything in Standard",
                    "Skip to the finals — bypass preliminary rounds",
                    "Runway coaching to perfect your walk",
                    "Priority placement — seen first by judges",
                    "Featured across EXA social channels",
                    "Higher visibility with designers & brands",
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
                      Enter VIP — $250
                    </Button>
                  </Link>
                </div>
              </Card>
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
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Our Sponsors & Partners
              </span>
            </h2>
            <p className="text-center text-white/40 mb-12 max-w-lg mx-auto text-sm">
              Models receive gifted products from these brands
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto items-center">
              {[
                { name: "TRIANGL", category: "Swimwear" },
                { name: "FRANKIES BIKINIS", category: "Swimwear" },
                { name: "SUPERGOOP!", category: "Sunscreen" },
                { name: "SUN BUM", category: "Sun Care" },
                { name: "COPA CABANA", category: "Resort Wear" },
                { name: "SOHO HOUSE", category: "Beach Club" },
                { name: "TARTE", category: "Beauty" },
                { name: "CELSIUS", category: "Beverage" },
              ].map((brand) => (
                <div
                  key={brand.name}
                  className="flex h-20 flex-col items-center justify-center rounded-xl border border-teal-500/10 bg-[#0d1f35]/80 px-4 hover:border-teal-500/30 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold tracking-widest text-zinc-400 text-center">
                    {brand.name}
                  </span>
                  <span className="text-[10px] text-zinc-600 mt-1">{brand.category}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground/50 mt-6">
              Sponsor lineup subject to change. Interested in sponsoring?{" "}
              <Link href="/contact" className="text-teal-400 hover:underline">
                Contact us
              </Link>
            </p>
          </div>
        </section>

        {/* ─── Follow Along ─── */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-transparent via-teal-950/10 to-transparent">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <Instagram className="mx-auto h-10 w-10 text-rose-400 mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">
              Follow the Journey
            </h2>
            <p className="text-muted-foreground mb-6">
              Go behind the scenes, watch contestant highlights, and stay updated
              on all things SwimCrown.
            </p>
            <a
              href="https://instagram.com/swimcrown"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="lg"
                className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 rounded-full px-8"
              >
                <Instagram className="mr-2 h-5 w-5" />
                @swimcrown
              </Button>
            </a>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl">
              <Crown className="mx-auto h-12 w-12 text-amber-400 mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                Will You Be Miss SwimCrown 2026?
              </h2>
              <p className="text-muted-foreground mb-8">
                Models from around the world are entering for their chance to walk the runway
                in gifted designer swimwear and be crowned the World&apos;s #1 Swim Model of the Year
                at Miami Swim Week 2026. Don&apos;t miss your shot.
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
