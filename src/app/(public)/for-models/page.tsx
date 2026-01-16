import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Sparkles,
  Heart,
  Camera,
  MessageCircle,
  Wallet,
  Calendar,
  Users,
  TrendingUp,
  Play,
  Lock,
  DollarSign,
  Instagram,
  CheckCircle,
  ArrowRight,
  Zap,
  Star,
  Gift,
  Globe,
  Briefcase,
  Shirt,
  Salad,
  PartyPopper,
  Crown,
  Flame,
  Sparkle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Models | EXA",
  description: "Turn your influence into income. EXA is where your content, your time, and your personality actually pay you.",
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
        coinBalance={coinBalance}
      />

      <main className="container px-4 md:px-8 py-12 max-w-4xl mx-auto">
        {/* Swipe Carousel */}
        <div className="mb-12 -mx-4 md:mx-0">
          <p className="text-center text-sm text-muted-foreground mb-4 px-4">
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
              <Link href="/apply" className="inline-block mt-2 px-6 py-2 bg-white text-pink-500 rounded-full font-bold text-sm hover:bg-white/90 transition">
                Join EXA
              </Link>
            </CarouselSlide>
          </div>
          <div className="flex justify-center gap-1 mt-4">
            {Array.from({ length: 17 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-pink-500/30" />
            ))}
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
              How to Use EXA
            </span>
            <span className="ml-2">✨</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-2">For Real Life</p>
          <p className="text-xl">
            Turn your influence into income.
          </p>
          <p className="text-muted-foreground mt-2">
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
        <Card className="p-6 mb-12 bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <p className="text-center text-lg">
            <span className="font-bold">Think of EXA as:</span>
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
            <div className="text-center">
              <Instagram className="h-8 w-8 mx-auto mb-2 text-pink-500" />
              <p className="font-medium">Instagram</p>
              <p className="text-sm text-muted-foreground">free highlight reel</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />
            <div className="text-center">
              <Crown className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="font-medium">EXA</p>
              <p className="text-sm text-muted-foreground">your VIP inner world that actually pays you</p>
            </div>
          </div>
        </Card>

        {/* FITNESS SECTION */}
        <SectionHeader emoji="🏋️‍♀️" title="Fitness & Workout Models" />

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
        <SectionHeader emoji="🧘‍♀️" title="Yoga & Wellness Girls" />

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
        <SectionHeader emoji="🌴" title="Lifestyle Creators" />

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
        <SectionHeader emoji="👗" title="Fashion Models" />

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
        <SectionHeader emoji="💌" title="Fans & Community" />

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
        <SectionHeader emoji="🥗" title="Health & Nutrition" />

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
        <SectionHeader emoji="📸" title="Professional Work" />

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
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            💅 The EXA Income Stack
          </h2>
          <Card className="p-6 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10 border-pink-500/20">
            <p className="text-muted-foreground mb-4">In ONE month you can earn from:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <IncomeItem label="Tips" />
              <IncomeItem label="PPV unlocks" />
              <IncomeItem label="Paid messages" />
              <IncomeItem label="Photoshoots" />
              <IncomeItem label="Brand gigs" />
              <IncomeItem label="Events" />
            </div>
            <div className="space-y-2 text-center">
              <p className="text-muted-foreground">👉 Instagram = millions of views, <span className="text-red-400">$0</span></p>
              <p className="font-bold text-lg">👉 EXA = smaller audience, <span className="text-green-500">REAL money</span></p>
            </div>
          </Card>
        </div>

        {/* FUNNEL */}
        <div className="my-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            📲 How to Move Fans Over
          </h2>
          <Card className="p-6">
            <p className="font-bold mb-4">The Funnel</p>
            <div className="space-y-3 mb-6">
              <FunnelStep platform="TikTok/Reels" purpose="hooks" />
              <FunnelStep platform="Instagram" purpose="vibe" />
              <FunnelStep platform="EXA" purpose="VIP world 💎" highlight />
            </div>
            <div className="p-4 bg-pink-500/10 rounded-lg text-center">
              <p className="font-medium">&quot;Exclusive on EXA – link in bio&quot;</p>
              <p className="text-sm text-muted-foreground mt-2">Even 1% of your followers = big income.</p>
            </div>
          </Card>
        </div>

        {/* BY NICHE */}
        <div className="my-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            💖 By Niche
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
          <h2 className="text-2xl font-bold mb-6">QUICK START (5 mins)</h2>
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="space-y-3">
              <QuickStartItem emoji="📸" text="Upload profile pic" />
              <QuickStartItem emoji="🖼️" text="Add 5 portfolio photos" />
              <QuickStartItem emoji="💰" text="Set your rates" />
              <QuickStartItem emoji="🔒" text="Post 1 PPV" />
              <QuickStartItem emoji="🏦" text="Add bank" />
              <QuickStartItem emoji="🔗" text="Put EXA in bio" />
            </div>
          </Card>
        </div>

        {/* THE TRUTH */}
        <Card className="p-8 text-center bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 border-pink-500/30 mb-12">
          <h2 className="text-2xl font-bold mb-4">The Truth</h2>
          <p className="text-muted-foreground mb-4">
            Your followers already:
          </p>
          <ul className="space-y-1 mb-6">
            <li>• ask for routines</li>
            <li>• want advice</li>
            <li>• want more of you</li>
          </ul>
          <p className="font-medium mb-4">EXA just makes it FAIR.</p>
          <div className="space-y-2">
            <p className="text-muted-foreground">Likes don&apos;t pay rent.</p>
            <p className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              Your personality does.
            </p>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg px-8">
              <Link href="/apply">
                Apply Now ✨
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link href="/models">Browse Models</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EXA Models. All rights reserved.</p>
      </footer>
    </div>
  );
}

function StatCard({ emoji, label }: { emoji: string; label: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-sm font-medium">{label}</div>
    </Card>
  );
}

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center gap-2">
      <span>{emoji}</span> {title}
    </h2>
  );
}

function ScenarioCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 mb-4">
      <h3 className="font-bold text-lg mb-4">
        <span className="text-pink-500">{number}.</span> {title}
      </h3>
      {children}
    </Card>
  );
}

function IncomeItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function FunnelStep({ platform, purpose, highlight = false }: { platform: string; purpose: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${highlight ? 'bg-pink-500/10 border border-pink-500/30' : 'bg-muted/50'}`}>
      <ArrowRight className={`h-4 w-4 ${highlight ? 'text-pink-500' : 'text-muted-foreground'}`} />
      <span className={`font-medium ${highlight ? 'text-pink-500' : ''}`}>{platform}</span>
      <span className="text-muted-foreground">→ {purpose}</span>
    </div>
  );
}

function NicheCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-4">
      <h3 className="font-bold mb-3">{title}</h3>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </Card>
  );
}

function QuickStartItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
      <span className="text-xl">{emoji}</span>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function CarouselSlide({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (
    <div className={`flex-shrink-0 w-[280px] h-[360px] rounded-2xl bg-gradient-to-br ${gradient} p-6 snap-center flex flex-col justify-center items-center text-center text-white shadow-xl`}>
      {children}
    </div>
  );
}
