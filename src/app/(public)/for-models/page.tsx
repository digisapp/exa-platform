import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import {
  Instagram,
  CheckCircle,
  ArrowRight,
  Crown,
  Globe,
} from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "For Models | EXA",
  description:
    "Turn your influence into income. EXA is where your content, your time, and your personality actually pay you.",
  alternates: {
    canonical: "https://www.examodels.com/for-models",
  },
  openGraph: {
    title: "For Models | EXA",
    description:
      "Turn your influence into income. EXA is where your content, your time, and your personality actually pay you.",
    url: "https://www.examodels.com/for-models",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Models | EXA",
    description:
      "Turn your influence into income. EXA is where your content, your time, and your personality actually pay you.",
  },
};

export default async function ForModelsPage() {
  const supabase = await createClient();

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

      <main className="container px-4 md:px-8 py-12 max-w-4xl mx-auto">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <Link
            href="/modelo"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 text-xs font-semibold text-white/70 hover:text-pink-300 transition-all"
          >
            <Globe className="h-3.5 w-3.5" />
            Español
          </Link>
        </div>

        {/* Swipe Carousel */}
        <div className="mb-12 -mx-4 md:mx-0">
          <p className="text-center text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-4 px-4">
            👆 Swipe through the slides
          </p>
          <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory flex gap-4 px-4 pb-4">
            <CarouselSlide gradient="from-pink-500 to-violet-500">
              <p className="text-3xl mb-4">💸</p>
              <h3 className="text-2xl font-bold mb-2">How to Use EXA</h3>
              <p className="text-white/80">Turn your influence into income</p>
              <p className="text-sm text-white/60 mt-2">(real girl scenarios)</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-violet-500 to-indigo-500">
              <p className="text-sm text-white/60 mb-2">Instagram</p>
              <p className="font-medium mb-4">= free highlight</p>
              <p className="text-sm text-white/60 mb-2">EXA</p>
              <p className="font-bold text-lg">= your VIP world that pays you</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-orange-500 to-red-500">
              <p className="text-xs text-white/60 mb-2">FITNESS GIRL</p>
              <p className="mb-2">You finish gym →</p>
              <p className="text-white/70 text-sm">IG: mirror selfie</p>
              <p className="font-bold mt-2">EXA: full workout routine</p>
              <p className="text-sm text-white/80">(50–100 coins)</p>
              <p className="mt-4 font-medium">Get paid to train. 💪</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-pink-500 to-rose-500">
              <p className="text-white/70 mb-2">Fan:</p>
              <p className="italic mb-4">&quot;send your ab routine?&quot;</p>
              <p className="text-white/70 mb-2">You:</p>
              <p className="font-bold">sends EXA link</p>
              <p className="mt-4 text-lg">Paid. Not paragraphs. 💅</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-teal-500 to-emerald-500">
              <p className="text-xs text-white/60 mb-2">YOGA & WELLNESS</p>
              <p className="font-bold text-lg mb-2">Sunrise yoga flow = premium</p>
              <p className="text-white/80">Upload once →</p>
              <p className="font-medium">earn forever 🌙</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-purple-500 to-violet-500">
              <p className="mb-2">Meditation audio</p>
              <p className="mb-2">affirmations</p>
              <p className="mb-4">mindset talks</p>
              <p className="font-bold text-lg">= passive income 💜</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-amber-500 to-orange-500">
              <p className="text-xs text-white/60 mb-2">LIFESTYLE</p>
              <p className="text-white/70 mb-1">IG = highlights</p>
              <p className="font-bold mb-4">EXA = real life</p>
              <p className="text-sm text-white/80">day in my life</p>
              <p className="text-sm text-white/80">travel tea ☕️</p>
              <p className="text-sm text-white/80">routines</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-pink-400 to-pink-600">
              <p className="mb-1">Apartment tour</p>
              <p className="mb-1">closet tour</p>
              <p className="mb-4">where it&apos;s from</p>
              <p className="font-bold">= paid content energy ✨</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-fuchsia-500 to-pink-500">
              <p className="text-xs text-white/60 mb-2">FASHION</p>
              <p className="mb-4">5 ways to style 1 blazer</p>
              <p className="text-white/70">IG shows 1</p>
              <p className="font-bold mt-2">EXA unlocks all 5 👗</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-blue-500 to-cyan-500">
              <p className="text-xs text-white/60 mb-2">BOOKINGS</p>
              <p className="mb-2">Brands can:</p>
              <p className="text-sm">• see your rates</p>
              <p className="text-sm">• book you</p>
              <p className="text-sm">• pay you</p>
              <p className="mt-4 text-sm text-white/80">(no messy DMs)</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-rose-500 to-pink-500">
              <p className="text-xs text-white/60 mb-2">FANS</p>
              <p className="font-bold text-lg mb-2">Paid messages &gt; free DMs</p>
              <p className="text-white/80">Your time has value 💌</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-red-400 to-pink-500">
              <p className="mb-4">Tips from supporters 💖</p>
              <p className="text-white/70 text-sm">No Venmo in bio vibes</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-violet-600 to-purple-600">
              <p className="text-white/70">Best 3 pics → IG</p>
              <p className="font-bold mt-2">Other 20 → EXA only</p>
              <p className="mt-4 text-sm text-white/80">Your real fans unlock them 🔒</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-green-500 to-emerald-500">
              <p className="font-bold mb-4">6 income streams:</p>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <p>💝 tips</p>
                <p>🔒 PPV</p>
                <p>💬 messages</p>
                <p>📸 shoots</p>
                <p>🏷️ brands</p>
                <p>🎉 events</p>
              </div>
            </CarouselSlide>

            <CarouselSlide gradient="from-red-500 to-orange-500">
              <p className="text-white/70 mb-2">IG views =</p>
              <p className="text-2xl mb-4">$0</p>
              <p className="text-white/70 mb-2">EXA fans =</p>
              <p className="text-2xl">💸💸💸</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-cyan-500 to-blue-500">
              <p className="text-xs text-white/60 mb-4">HOW TO START</p>
              <p className="text-sm mb-1">📸 Upload profile</p>
              <p className="text-sm mb-1">🖼️ Add 5 photos</p>
              <p className="text-sm mb-1">🔒 Post 1 PPV</p>
              <p className="text-sm">🔗 Link in bio</p>
            </CarouselSlide>

            <CarouselSlide gradient="from-pink-500 to-violet-500">
              <p className="text-white/70 mb-2">Likes don&apos;t pay rent</p>
              <p className="text-2xl font-bold mb-4">YOU do 💅</p>
              <Link href="/signin" className="inline-block mt-2 px-6 py-2 bg-white text-pink-500 rounded-full font-bold text-sm hover:bg-white/90 transition">
                Join EXA
              </Link>
            </CarouselSlide>
          </div>
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: 17 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-pink-500/30 shadow-[0_0_4px_rgba(236,72,153,0.4)]" />
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-3">
            For Real Life
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="exa-gradient-text">How to Use EXA</span>
            <span className="ml-2">✨</span>
          </h1>
          <p className="text-xl text-white font-medium">
            Turn your influence into income.
          </p>
          <p className="text-white/60 mt-2 max-w-xl mx-auto">
            EXA is where your content, your time, and your personality actually pay you — not just &quot;likes.&quot;
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <StatCard emoji="💸" label="6+ Income Streams" />
          <StatCard emoji="🌙" label="24/7 Passive Earnings" />
          <StatCard emoji="💎" label="$0.10 Per Coin" />
          <StatCard emoji="🫶" label="100% YOUR Content" />
        </div>

        {/* Think of EXA as */}
        <div
          className="relative overflow-hidden rounded-2xl border border-pink-500/30 p-6 mb-12"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,105,180,0.15) 0%, rgba(139,92,246,0.10) 50%, rgba(245,158,11,0.12) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 w-40 h-40 rounded-full bg-pink-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-40 h-40 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="relative">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-4">
              Mental Model
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-500/15 ring-1 ring-pink-500/30 mb-2">
                  <Instagram className="h-7 w-7 text-pink-300" />
                </div>
                <p className="font-bold text-white">Instagram</p>
                <p className="text-xs text-white/50">free highlight reel</p>
              </div>
              <ArrowRight className="h-6 w-6 text-white/40 hidden md:block" />
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/40 mb-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <Crown className="h-7 w-7 text-amber-300" />
                </div>
                <p className="font-bold text-white">EXA</p>
                <p className="text-xs text-amber-300/80">your VIP world that actually pays you</p>
              </div>
            </div>
          </div>
        </div>

        {/* FITNESS SECTION */}
        <SectionHeader kicker="Use case" emoji="🏋️‍♀️" title="Fitness & Workout Models" />

        <ScenarioCard
          number={1}
          title={`"I just left the gym" content → PAID`}
        >
          <p className="text-muted-foreground mb-4">You finish leg day. On Instagram you&apos;d post:</p>
          <ul className="text-muted-foreground mb-4 space-y-1">
            <li>• mirror pic</li>
            <li>• booty pump reel</li>
            <li>• free tips in comments</li>
          </ul>
          <p className="font-medium mb-2">On EXA you can:</p>
          <ul className="space-y-1 mb-4">
            <li>• upload the full routine (50–100 coins)</li>
            <li>• add voiceover explaining form</li>
            <li>• sell your exact split</li>
          </ul>
          <p className="text-pink-500 font-medium">👉 Fans pay to train with you, not just watch you.</p>
        </ScenarioCard>

        <ScenarioCard
          number={2}
          title="Fans ask the same question 100x"
        >
          <p className="text-muted-foreground mb-4">
            &quot;Can you send your ab routine?&quot;<br />
            &quot;Do you have a glute guide?&quot;
          </p>
          <p className="mb-2">Instead of typing for free →</p>
          <p className="font-medium">Upload it ONCE as PPV</p>
          <p className="font-medium">Send the link forever 💅</p>
        </ScenarioCard>

        <ScenarioCard
          number={3}
          title="Real Brand Bookings"
        >
          <p className="text-muted-foreground mb-4">
            Gym brand, supplement company, or local gym can:
          </p>
          <ul className="mb-4 space-y-1">
            <li>• see your profile</li>
            <li>• check your rates</li>
            <li>• send a real offer</li>
          </ul>
          <p className="text-muted-foreground">No more:</p>
          <ul className="text-red-400 space-y-1">
            <li>❌ &quot;DM for collab&quot;</li>
            <li>❌ unpaid &quot;exposure shoots&quot;</li>
          </ul>
        </ScenarioCard>

        {/* YOGA SECTION */}
        <SectionHeader kicker="Use case" emoji="🧘‍♀️" title="Yoga & Wellness Girls" />

        <ScenarioCard
          number={4}
          title="Sunrise flow = premium content"
        >
          <p className="text-muted-foreground mb-4">
            That beach yoga video everyone begs for?
          </p>
          <ul className="space-y-1 mb-2">
            <li>• Upload 20-min flow</li>
            <li>• 75 coins</li>
            <li>• earn while you nap</li>
          </ul>
        </ScenarioCard>

        <ScenarioCard
          number={5}
          title="Wellness studios book YOU"
        >
          <p className="text-muted-foreground mb-4">A retreat wants:</p>
          <ul className="mb-4 space-y-1">
            <li>• meet & greet</li>
            <li>• class host</li>
            <li>• content day</li>
          </ul>
          <p className="mb-2">They send a booking with:</p>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <span>📍 location</span>
            <span>🗓 date</span>
            <span>💰 pay</span>
            <span>📝 details</span>
          </div>
          <p className="font-medium text-pink-500">You accept like a boss.</p>
        </ScenarioCard>

        <ScenarioCard
          number={6}
          title="Meditation / mindset audio"
        >
          <p className="text-muted-foreground mb-4">Your voice is literally a product.</p>
          <ul className="space-y-1 mb-4">
            <li>• 10-min guided meditation</li>
            <li>• affirmations</li>
            <li>• anxiety calm-downs</li>
          </ul>
          <p className="font-medium">Passive income while you sleep 🌙</p>
        </ScenarioCard>

        {/* LIFESTYLE SECTION */}
        <SectionHeader kicker="Use case" emoji="🌴" title="Lifestyle Creators" />

        <ScenarioCard
          number={7}
          title="Day in My Life — but unfiltered"
        >
          <p className="text-muted-foreground mb-4">
            IG = highlight<br />
            EXA = real tea ☕️
          </p>
          <ul className="space-y-1">
            <li>• what you actually eat</li>
            <li>• how you plan your week</li>
            <li>• behind-the-scenes life</li>
          </ul>
        </ScenarioCard>

        <ScenarioCard
          number={8}
          title="Travel Content That Pays"
        >
          <p className="text-muted-foreground mb-4">Bali trip:</p>
          <ul className="space-y-1 mb-4">
            <li>• IG = cute bikini pic</li>
            <li>• EXA = &quot;hidden cafes + villa tour + budget&quot;</li>
          </ul>
          <p className="font-medium">100 coins → real value</p>
        </ScenarioCard>

        <ScenarioCard
          number={9}
          title="Apartment Tour"
        >
          <p className="text-muted-foreground mb-4">Girls LIVE for:</p>
          <ul className="space-y-1 mb-4">
            <li>• closet tour</li>
            <li>• where everything&apos;s from</li>
            <li>• Amazon links</li>
          </ul>
          <p className="font-medium text-pink-500">That&apos;s paid content energy.</p>
        </ScenarioCard>

        {/* FASHION SECTION */}
        <SectionHeader kicker="Use case" emoji="👗" title="Fashion Models" />

        <ScenarioCard
          number={10}
          title="Styling Sessions"
        >
          <p className="text-muted-foreground mb-4">&quot;5 ways to style one blazer&quot;</p>
          <ul className="space-y-1">
            <li>• IG shows 1 look</li>
            <li>• EXA unlocks all 5 + links</li>
          </ul>
        </ScenarioCard>

        <ScenarioCard
          number={11}
          title="Runway & Designer Gigs"
        >
          <p className="text-muted-foreground mb-4">Designers can:</p>
          <ul className="space-y-1 mb-4">
            <li>• find your portfolio</li>
            <li>• check measurements</li>
            <li>• book you properly</li>
          </ul>
          <p className="font-medium">No messy DMs.</p>
        </ScenarioCard>

        <ScenarioCard
          number={12}
          title="Brand Ambassador Deals"
        >
          <p className="text-muted-foreground mb-4">Jewelry / swim / beauty brands:</p>
          <ul className="space-y-1">
            <li>• post gigs</li>
            <li>• invite you</li>
            <li>• pay through platform</li>
          </ul>
        </ScenarioCard>

        {/* FANS SECTION */}
        <SectionHeader kicker="Community" emoji="💌" title="Fans & Community" />

        <ScenarioCard
          number={13}
          title="Monetized DMs"
        >
          <p className="text-muted-foreground mb-4">
            Instagram = free emotional labor<br />
            EXA = paid conversations
          </p>
          <p>Fans pay coins to message you →</p>
          <p className="font-medium text-pink-500">you reply when YOU want.</p>
        </ScenarioCard>

        <ScenarioCard
          number={14}
          title="Tips from Supporters"
        >
          <p className="text-muted-foreground mb-4">Instead of:</p>
          <ul className="text-red-400 space-y-1 mb-4">
            <li>❌ PayPal link</li>
            <li>❌ Venmo bio</li>
          </ul>
          <p className="font-medium">You get clean in-app tips 💖</p>
        </ScenarioCard>

        <ScenarioCard
          number={15}
          title="Exclusive Photo Drops"
        >
          <p className="mb-2">Best 3 pics → IG</p>
          <p className="mb-4">Other 20 → EXA only</p>
          <p className="font-medium text-pink-500">Your real fans unlock them.</p>
        </ScenarioCard>

        <ScenarioCard
          number={16}
          title="Build Your VIP Circle"
        >
          <p className="text-muted-foreground mb-4">See who:</p>
          <ul className="space-y-1 mb-4">
            <li>• tips you</li>
            <li>• buys content</li>
            <li>• supports you most</li>
          </ul>
          <p className="font-medium">Treat them like your inner circle.</p>
        </ScenarioCard>

        {/* HEALTH SECTION */}
        <SectionHeader kicker="Use case" emoji="🥗" title="Health & Nutrition" />

        <ScenarioCard
          number={17}
          title="Meal Prep Guides"
        >
          <p className="font-medium">Film Sunday prep once →</p>
          <p className="font-medium text-pink-500">sell forever.</p>
        </ScenarioCard>

        <ScenarioCard
          number={18}
          title={`"What supplements do you take?"`}
        >
          <p className="mb-2">Make ONE detailed video</p>
          <p className="font-medium text-pink-500">Send link every time.</p>
        </ScenarioCard>

        <ScenarioCard
          number={19}
          title="Transformation Stories"
        >
          <p className="font-medium text-pink-500">Real journey = premium value</p>
        </ScenarioCard>

        {/* PROFESSIONAL SECTION */}
        <SectionHeader kicker="Bookings" emoji="📸" title="Professional Work" />

        <ScenarioCard
          number={20}
          title="Photoshoot Bookings"
        >
          <p className="text-muted-foreground mb-4">Photographers can:</p>
          <ul className="space-y-1 mb-4">
            <li>• see rates</li>
            <li>• book hours</li>
            <li>• pay safely</li>
          </ul>
          <p className="font-medium">No chasing invoices.</p>
        </ScenarioCard>

        <ScenarioCard
          number={21}
          title="Event Appearances"
        >
          <p className="text-muted-foreground mb-4">Clubs / venues / brands:</p>
          <ul className="space-y-1 mb-4">
            <li>• send details</li>
            <li>• you accept or counter</li>
            <li>• professional & safe</li>
          </ul>
        </ScenarioCard>

        <ScenarioCard
          number={22}
          title="Private Events"
        >
          <p className="text-muted-foreground mb-2">Yacht party? Launch?</p>
          <p className="font-medium text-pink-500">Booked the right way.</p>
        </ScenarioCard>

        {/* INCOME STACK */}
        <div className="my-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
            Revenue
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2 text-white">
            💅 <span className="exa-gradient-text">The EXA Income Stack</span>
          </h2>
          <div
            className="relative overflow-hidden rounded-2xl border border-pink-500/30 p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.10) 50%, rgba(0,191,255,0.12) 100%)",
            }}
          >
            <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="relative">
              <p className="text-white/70 mb-4 font-medium">In ONE month you can earn from:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <IncomeItem label="Tips" />
                <IncomeItem label="PPV unlocks" />
                <IncomeItem label="Paid messages" />
                <IncomeItem label="Photoshoots" />
                <IncomeItem label="Brand gigs" />
                <IncomeItem label="Events" />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-white/60">
                  👉 Instagram = millions of views, <span className="text-rose-300 font-semibold">$0</span>
                </p>
                <p className="font-bold text-lg text-white">
                  👉 EXA = smaller audience, <span className="text-emerald-300">REAL money</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FUNNEL */}
        <div className="my-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
            Strategy
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2 text-white">
            📲 <span className="exa-gradient-text">How to Move Fans Over</span>
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6">
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/60 mb-4">The Funnel</p>
            <div className="space-y-3 mb-6">
              <FunnelStep platform="TikTok/Reels" purpose="hooks" />
              <FunnelStep platform="Instagram" purpose="vibe" />
              <FunnelStep platform="EXA" purpose="VIP world 💎" highlight />
            </div>
            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 text-center shadow-[0_0_16px_rgba(236,72,153,0.15)]">
              <p className="font-semibold text-white">&quot;Exclusive on EXA – link in bio&quot;</p>
              <p className="text-sm text-white/60 mt-2">Even 1% of your followers = big income.</p>
            </div>
          </div>
        </div>

        {/* BY NICHE */}
        <div className="my-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
            Audience
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2 text-white">
            💖 <span className="exa-gradient-text">By Niche</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <NicheCard
              title="Fitness Girl"
              items={["sell programs", "gym bookings", "tips"]}
            />
            <NicheCard
              title="Yoga Babe"
              items={["flows", "private sessions", "retreats"]}
            />
            <NicheCard
              title="Fashion Model"
              items={["runway", "styling", "designers"]}
            />
            <NicheCard
              title="Lifestyle Creator"
              items={["vlogs", "brand deals", "fan chats"]}
            />
          </div>
        </div>

        {/* QUICK START */}
        <div className="my-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
            5-minute setup
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white">
            <span className="exa-gradient-text">QUICK START</span>
          </h2>
          <div
            className="relative overflow-hidden rounded-2xl border border-emerald-500/30 p-6"
            style={{
              background:
                "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(20,184,166,0.08) 100%)",
            }}
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="relative space-y-3">
              <QuickStartItem emoji="📸" text="Upload profile pic" />
              <QuickStartItem emoji="🖼️" text="Add 5 portfolio photos" />
              <QuickStartItem emoji="💰" text="Set your rates" />
              <QuickStartItem emoji="🔒" text="Post 1 PPV" />
              <QuickStartItem emoji="🏦" text="Add bank" />
              <QuickStartItem emoji="🔗" text="Put EXA in bio" />
            </div>
          </div>
        </div>

        {/* THE TRUTH */}
        <div
          className="relative overflow-hidden rounded-2xl border border-pink-500/40 p-8 text-center mb-12 shadow-[0_0_32px_rgba(236,72,153,0.2)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,105,180,0.18) 0%, rgba(139,92,246,0.15) 50%, rgba(0,191,255,0.18) 100%)",
          }}
        >
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/30 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
              Real talk
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              The Truth
            </h2>
            <p className="text-white/70 mb-4">
              Your followers already:
            </p>
            <ul className="space-y-1 mb-6 text-white/80">
              <li>• ask for routines</li>
              <li>• want advice</li>
              <li>• want more of you</li>
            </ul>
            <p className="font-semibold text-white mb-4">EXA just makes it FAIR.</p>
            <div className="space-y-2">
              <p className="text-white/60">Likes don&apos;t pay rent.</p>
              <p className="text-2xl md:text-3xl font-bold exa-gradient-text">
                Your personality does.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signin"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white text-lg font-bold shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:shadow-[0_0_32px_rgba(236,72,153,0.7)] active:scale-[0.98] transition-all"
            >
              Apply Now <span>✨</span>
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-pink-500/40 text-white text-lg font-semibold transition-all"
            >
              Browse Models
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
        </p>
      </footer>
    </div>
    </CoinBalanceProvider>
  );
}

function StatCard({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 text-center hover:border-pink-500/30 hover:bg-white/[0.06] transition-all">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-sm font-semibold text-white">{label}</div>
    </div>
  );
}

function SectionHeader({ emoji, title, kicker }: { emoji: string; title: string; kicker?: string }) {
  return (
    <div className="mt-12 mb-6">
      {kicker && (
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
          {kicker}
        </p>
      )}
      <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">
        <span>{emoji}</span>
        <span className="exa-gradient-text">{title}</span>
      </h2>
    </div>
  );
}

function ScenarioCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 mb-4 hover:border-pink-500/25 transition-all group">
      <h3 className="font-bold text-lg mb-4 text-white">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mr-2 shadow-[0_0_10px_rgba(236,72,153,0.15)]">
          {number}
        </span>
        {title}
      </h3>
      <div className="text-white/80 [&_.text-muted-foreground]:text-white/60 [&_.text-pink-500]:text-pink-300">
        {children}
      </div>
    </div>
  );
}

function IncomeItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.05] border border-white/10 hover:border-emerald-500/30 transition-colors">
      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
      <span className="text-sm font-semibold text-white">{label}</span>
    </div>
  );
}

function FunnelStep({ platform, purpose, highlight = false }: { platform: string; purpose: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        highlight
          ? 'bg-pink-500/10 border border-pink-500/40 shadow-[0_0_16px_rgba(236,72,153,0.2)]'
          : 'bg-white/[0.04] border border-white/10'
      }`}
    >
      <ArrowRight className={`h-4 w-4 shrink-0 ${highlight ? 'text-pink-300' : 'text-white/40'}`} />
      <span className={`font-semibold ${highlight ? 'text-pink-200' : 'text-white'}`}>{platform}</span>
      <span className="text-white/60">→ {purpose}</span>
    </div>
  );
}

function NicheCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 hover:border-violet-500/30 transition-all">
      <h3 className="font-bold text-white mb-3">{title}</h3>
      <ul className="space-y-1 text-sm text-white/60">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function QuickStartItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.08] transition-all">
      <span className="text-xl">{emoji}</span>
      <span className="font-semibold text-white">{text}</span>
    </div>
  );
}

function CarouselSlide({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (
    <div className={`flex-shrink-0 w-[280px] h-[360px] rounded-2xl bg-gradient-to-br ${gradient} p-6 snap-center flex flex-col justify-center items-center text-center text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/20`}>
      {children}
    </div>
  );
}
