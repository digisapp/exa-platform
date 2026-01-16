import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
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
  LayoutDashboard,
  Image,
  FileText,
  Send,
  CreditCard,
  UserCircle,
  Bell,
  BadgeCheck,
  Upload,
  Eye,
  Coins,
  BanknoteIcon,
  Clock,
  MapPin,
  ChevronRight,
  Settings,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Use EXA | Guide for Models & Creators",
  description: "Learn how to monetize your influence, book gigs, and connect with fans on EXA Models platform.",
};

export default async function GuidePage() {
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

      <main className="container px-4 md:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
            How to Use EXA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Turn your influence into income. Real scenarios showing how creators like you use EXA every day.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <Card className="text-center p-6 bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/20">
            <div className="text-3xl font-bold text-pink-500">6+</div>
            <div className="text-sm text-muted-foreground">Income Streams</div>
          </Card>
          <Card className="text-center p-6 bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/20">
            <div className="text-3xl font-bold text-violet-500">24/7</div>
            <div className="text-sm text-muted-foreground">Passive Earning</div>
          </Card>
          <Card className="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
            <div className="text-3xl font-bold text-cyan-500">$0.10</div>
            <div className="text-sm text-muted-foreground">Per Coin Value</div>
          </Card>
          <Card className="text-center p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
            <div className="text-3xl font-bold text-amber-500">100%</div>
            <div className="text-sm text-muted-foreground">Your Content</div>
          </Card>
        </div>

        {/* Fitness & Workout Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Fitness & Workout</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ScenarioCard
              title="Morning Workout Routine"
              description="You just crushed a 6 AM gym session. Instead of only posting a sweaty selfie to Instagram Stories (gone in 24 hours), upload the full workout video to your EXA PPV content."
              result="Your dedicated fans pay 50-100 coins to unlock your complete ab routine or glute workout. You earn while you train."
              icon={<Play className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Personal Training Sessions"
              description="A fan messages you asking about your leg day routine. Instead of typing paragraphs for free, you've already uploaded a full leg workout tutorial to your PPV."
              result="Send them the link - they unlock it, you get paid, they get real value."
              icon={<Lock className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Fitness Brand Booking"
              description="Gymshark, Alo, or a local activewear brand sees your profile. They send you a booking request for a photoshoot."
              result="You see the location, date, compensation, and can accept, decline, or counter with your rate. No back-and-forth DM chaos."
              icon={<Briefcase className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Yoga & Wellness Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Yoga & Wellness</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ScenarioCard
              title="Guided Yoga Flows"
              description="You filmed a 20-minute sunrise yoga flow at the beach. That's premium content."
              result="Upload it as PPV for 75 coins. Your followers who always ask 'can you teach me that pose?' now have access - and you're compensated for your expertise."
              icon={<Sparkles className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Wellness Retreat Appearance"
              description="A wellness studio wants you to host a meet & greet at their retreat weekend."
              result="They submit a booking through EXA with all details - date, location, hours needed, and payment. You review and confirm without endless email threads."
              icon={<Calendar className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Meditation Content"
              description="Your calming voice guiding a 10-minute meditation? That's exclusive content your stressed-out fans will pay for."
              result="Upload audio or video to PPV. Passive income while you sleep."
              icon={<Play className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Lifestyle Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Star className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Lifestyle & Daily Content</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ScenarioCard
              title="Day in My Life Vlogs"
              description="Your Instagram shows the highlight reel. Your EXA PPV shows the real behind-the-scenes."
              result="Your morning routine, what you actually eat, how you organize your week. Fans who want the full picture pay to see it."
              icon={<Camera className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Travel Content"
              description="You're in Bali for two weeks. Free content goes to IG/TikTok."
              result="The 15-minute 'hidden gems I found' video with actual locations and tips? That's EXA PPV content at 100 coins."
              icon={<Globe className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Apartment Tour"
              description="Fans always ask about your aesthetic. A full apartment tour with where you got everything is valuable content."
              result="Worth coins, not a free YouTube video getting buried by the algorithm."
              icon={<Play className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Fashion Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Shirt className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Fashion & Style</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ScenarioCard
              title="Outfit Styling Sessions"
              description="You put together 5 different ways to style one blazer. Free post shows 1 look."
              result="PPV unlocks all 5 with links and tips. Your fashion-obsessed followers gladly pay 30 coins."
              icon={<Sparkles className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Fashion Week Booking"
              description="A designer needs models for their runway show. They find you on EXA, see your portfolio, rates, and measurements."
              result="They send a booking request for the date with compensation details. Professional and organized."
              icon={<Briefcase className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Brand Ambassador Gig"
              description="A jewelry brand posts a gig looking for 3 models for ongoing content."
              result="You see it in your dashboard, check the compensation, and apply. If selected, everything is tracked in one place."
              icon={<Star className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Fan Engagement Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Engaging Your Fans & Followers</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScenarioCard
              title="Monetized DMs"
              description="A fan wants to chat and get personalized advice. On Instagram, you'd ignore it or reply for free."
              result="On EXA, fans pay coins to message you. You respond when you want, and you're compensated for your time."
              icon={<MessageCircle className="h-5 w-5" />}
              compact
            />
            <ScenarioCard
              title="Tips from Supporters"
              description="Your biggest fans want to show appreciation beyond likes."
              result="They send you tips directly through EXA. No PayPal links in bio, no awkward Venmo requests. Clean and professional."
              icon={<Gift className="h-5 w-5" />}
              compact
            />
            <ScenarioCard
              title="Exclusive Photo Drops"
              description="You did a fire photoshoot. The best 3 go to Instagram."
              result="The other 20? Exclusive PPV content on EXA. Your real fans get access to content no one else sees."
              icon={<Lock className="h-5 w-5" />}
              compact
            />
            <ScenarioCard
              title="Building Your Inner Circle"
              description="Track your followers on EXA. See who's been supporting you, who tips, who unlocks your content."
              result="These are your VIPs. Engage with them differently than casual scrollers."
              icon={<Star className="h-5 w-5" />}
              compact
            />
          </div>
        </section>

        {/* Health & Nutrition Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-lime-500 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Health & Nutrition</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ScenarioCard
              title="Meal Prep Guides"
              description="You meal prep every Sunday. Film it once, upload as PPV."
              result="Fans who want to eat like you pay 50 coins for your actual recipes and process - not a generic blog post."
              icon={<Play className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Supplement Breakdowns"
              description="Everyone asks 'what do you take?' Create one detailed PPV video explaining your supplements, skincare, vitamins."
              result="When they ask, you send the link. Earn while educating."
              icon={<Sparkles className="h-5 w-5" />}
            />
            <ScenarioCard
              title="Transformation Content"
              description="Your fitness journey before/after with the real details."
              result="What you ate, your workout split, your mental health journey. That's premium content worth charging for."
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
        </section>

        {/* Professional Bookings Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Professional Bookings</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ScenarioCard
              title="Photoshoot Bookings"
              description="A photographer finds your profile, sees your rates (hourly, half-day, full-day)."
              result="They submit a booking request. You review, accept or counter-offer, and get paid through the platform. No chasing invoices."
              icon={<Camera className="h-5 w-5" />}
              compact
            />
            <ScenarioCard
              title="Event Appearances"
              description="A club promoter needs models for a Saturday night event."
              result="They submit a booking with location, hours, dress code, and compensation. You review, negotiate if needed, and confirm."
              icon={<Calendar className="h-5 w-5" />}
              compact
            />
            <ScenarioCard
              title="Brand Content Creation"
              description="A skincare brand wants you to create content for their launch."
              result="They send an offer through EXA with deliverables and compensation. Accept, complete the work, mark done, get paid."
              icon={<Star className="h-5 w-5" />}
              compact
            />
            <ScenarioCard
              title="Private Events"
              description="Someone's hosting a yacht party and wants you there."
              result="Instead of sketchy DMs, they book through EXA with all details visible. Professional and safe."
              icon={<Users className="h-5 w-5" />}
              compact
            />
          </div>
        </section>

        {/* Income Stack Section */}
        <section className="mb-16">
          <Card className="p-8 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10 border-pink-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">The EXA Income Stack</h2>
            </div>
            <p className="text-muted-foreground mb-6">In one month you can earn from multiple streams:</p>
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <IncomeStream icon={<Gift />} label="Tips" description="From fans appreciating your content" />
              <IncomeStream icon={<Lock />} label="PPV Unlocks" description="Workout videos, tutorials, exclusive content" />
              <IncomeStream icon={<MessageCircle />} label="Paid Messages" description="Followers wanting advice" />
              <IncomeStream icon={<Camera />} label="Photoshoots" description="Professional booking requests" />
              <IncomeStream icon={<Briefcase />} label="Brand Gigs" description="Ambassador opportunities" />
              <IncomeStream icon={<Calendar />} label="Events" description="Appearances and meet & greets" />
            </div>
            <p className="text-lg font-medium text-center">
              That&apos;s <span className="text-pink-500">6 income streams</span> from one platform. Your Instagram has millions of impressions but pays <span className="text-muted-foreground">$0</span>.
            </p>
          </Card>
        </section>

        {/* Content Funnel Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Growing From Instagram & TikTok</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Converting Social Followers
              </h3>
              <p className="text-muted-foreground mb-4">
                You have 100K on Instagram. You post a Story: &quot;Exclusive content on EXA - link in bio.&quot;
              </p>
              <p className="text-muted-foreground">
                Even if <span className="text-foreground font-medium">1% converts</span>, that&apos;s 1,000 fans who might unlock your PPV content, tip you, and message you (paid).
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">The Content Funnel</h3>
              <div className="space-y-3">
                <FunnelStep platform="TikTok/Reels" purpose="Hook content (free, algorithm-driven)" />
                <FunnelStep platform="Instagram Feed" purpose="Lifestyle content (free, brand building)" />
                <FunnelStep platform="EXA Portfolio" purpose="Professional photos (public, attracts bookings)" />
                <FunnelStep platform="EXA PPV" purpose="Exclusive deep content (paid, your real fans)" highlight />
              </div>
            </Card>
          </div>
        </section>

        {/* Quick Reference by Niche */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Quick Reference by Niche</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <NicheCard
              niche="Fitness Model"
              uses={[
                "Sell workout programs",
                "Get gym brand bookings",
                "Earn tips from transformation posts"
              ]}
            />
            <NicheCard
              niche="Yoga Instructor"
              uses={[
                "Sell guided flows",
                "Book private sessions",
                "Monetize wellness content"
              ]}
            />
            <NicheCard
              niche="Fashion Model"
              uses={[
                "Get runway bookings",
                "Sell styling content",
                "Work with designers"
              ]}
            />
            <NicheCard
              niche="Lifestyle Creator"
              uses={[
                "Monetize day-in-life content",
                "Get brand deals",
                "Connect with real fans"
              ]}
            />
            <NicheCard
              niche="Wellness Influencer"
              uses={[
                "Sell nutrition guides",
                "Book retreat appearances",
                "Earn from health tips"
              ]}
            />
            <NicheCard
              niche="Content Creator"
              uses={[
                "Multiple income streams",
                "Professional bookings",
                "Direct fan monetization"
              ]}
            />
          </div>
        </section>

        {/* ========== PLATFORM GUIDE SECTION ========== */}
        <div className="border-t border-pink-500/20 pt-16 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Guide</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Step-by-step walkthrough of every feature. Learn exactly how to use each part of EXA.
            </p>
          </div>
        </div>

        {/* Dashboard Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<LayoutDashboard className="h-6 w-6 text-white" />}
            title="Dashboard"
            gradient="from-slate-500 to-zinc-600"
            path="/dashboard"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Your command center. When you log in, this is the first thing you see.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureItem
                icon={<Bell />}
                title="Pending Bookings"
                description="See how many booking requests are waiting for your response"
              />
              <FeatureItem
                icon={<Gift />}
                title="Brand Offers"
                description="New offers from brands wanting to work with you"
              />
              <FeatureItem
                icon={<Briefcase />}
                title="Open Gigs"
                description="Available opportunities you can apply for"
              />
              <FeatureItem
                icon={<TrendingUp />}
                title="Recent Activity"
                description="Tips received, coins earned, and milestone updates"
              />
            </div>
          </Card>
        </section>

        {/* Content Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<Image className="h-6 w-6 text-white" />}
            title="Content"
            gradient="from-pink-500 to-rose-500"
            path="/content"
          />
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-pink-500" />
                Portfolio (Free)
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                Your public showcase. These photos appear on your profile for everyone to see.
              </p>
              <div className="space-y-3">
                <Step number={1} text="Go to Content page" />
                <Step number={2} text="Click the Portfolio tab" />
                <Step number={3} text="Click Upload or drag photos/videos" />
                <Step number={4} text="Add optional titles (shows on hover)" />
                <Step number={5} text="Photos appear on your public profile" />
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Best for:</strong> Professional shots, headshots, lifestyle photos that showcase your look and brand
              </div>
            </Card>
            <Card className="p-6">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-violet-500" />
                PPV Content (Paid)
              </h4>
              <p className="text-muted-foreground text-sm mb-4">
                Exclusive content fans pay to unlock. This is where you monetize.
              </p>
              <div className="space-y-3">
                <Step number={1} text="Go to Content page" />
                <Step number={2} text="Click the PPV tab" />
                <Step number={3} text="Click Upload and select your content" />
                <Step number={4} text="Set your price in coins (e.g., 50 coins = $5)" />
                <Step number={5} text="Add a title and description" />
                <Step number={6} text="Fans pay to unlock, you earn coins" />
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Best for:</strong> Workout tutorials, behind-the-scenes, extended content, exclusive photos
              </div>
            </Card>
          </div>
        </section>

        {/* Gigs Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<Briefcase className="h-6 w-6 text-white" />}
            title="Gigs"
            gradient="from-amber-500 to-orange-500"
            path="/gigs"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Open opportunities posted by brands and event organizers. You apply, they select.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-bold mb-3">How Gigs Work</h4>
                <div className="space-y-3">
                  <Step number={1} text="Browse available gigs on the Gigs page" />
                  <Step number={2} text="Check details: date, location, compensation, requirements" />
                  <Step number={3} text="Click Apply if interested" />
                  <Step number={4} text="Brand reviews applications and selects models" />
                  <Step number={5} text="If selected, gig appears in your Bookings" />
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-3">What You&apos;ll See</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Location (city/venue or remote)
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Date and time
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4" /> Compensation amount
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Spots available / filled
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Requirements and description
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm"><strong>Pro tip:</strong> Check the dashboard daily for new gigs. Popular ones fill up fast!</p>
            </div>
          </Card>
        </section>

        {/* Offers Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<Gift className="h-6 w-6 text-white" />}
            title="Offers"
            gradient="from-violet-500 to-purple-500"
            path="/offers"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Direct invitations from brands. Unlike gigs where you apply, offers come to you.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-bold mb-3">How Offers Work</h4>
                <div className="space-y-3">
                  <Step number={1} text="Brand discovers your profile" />
                  <Step number={2} text="They send you a direct offer" />
                  <Step number={3} text="You see it on your Offers page (and dashboard)" />
                  <Step number={4} text="Review the details and compensation" />
                  <Step number={5} text="Accept, Decline, or Counter with different terms" />
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-3">Your Options</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Accept</div>
                      <div className="text-xs text-muted-foreground">Confirm participation as-is</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg">
                    <span className="h-5 w-5 text-red-500 mt-0.5">✕</span>
                    <div>
                      <div className="font-medium text-sm">Decline</div>
                      <div className="text-xs text-muted-foreground">Pass on this opportunity</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Counter</div>
                      <div className="text-xs text-muted-foreground">Suggest different rate or terms</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Bookings Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<Calendar className="h-6 w-6 text-white" />}
            title="Bookings"
            gradient="from-blue-500 to-cyan-500"
            path="/bookings"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Manage all your confirmed work - photoshoots, events, brand collaborations.
            </p>
            <div className="mb-6">
              <h4 className="font-bold mb-4">Booking Lifecycle</h4>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status="Pending" color="amber" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <StatusBadge status="Accepted" color="blue" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <StatusBadge status="Confirmed" color="violet" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <StatusBadge status="Completed" color="green" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Service Types</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Photoshoot (hourly/half-day/full-day)</li>
                  <li>• Promo modeling</li>
                  <li>• Brand ambassador</li>
                  <li>• Private events</li>
                  <li>• Meet & greets</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Actions You Can Take</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Accept or decline requests</li>
                  <li>• Counter-offer with your rate</li>
                  <li>• Confirm locked-in bookings</li>
                  <li>• Mark as complete when done</li>
                  <li>• Report no-shows</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2">Info You&apos;ll See</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Client name and contact</li>
                  <li>• Date, time, and duration</li>
                  <li>• Location or venue</li>
                  <li>• Payment amount in coins</li>
                  <li>• Special notes/requests</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Wallet Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<Wallet className="h-6 w-6 text-white" />}
            title="Wallet"
            gradient="from-green-500 to-emerald-500"
            path="/wallet"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Your money hub. Track earnings, view transactions, and withdraw to your bank.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-bold mb-4">What&apos;s In Your Wallet</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-500" />
                      <span className="font-medium">Coin Balance</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Your available coins</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Withheld</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Pending withdrawal</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Earnings Chart</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Last 6 months</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-4">How to Withdraw</h4>
                <div className="space-y-3">
                  <Step number={1} text="Add your bank account (checking or savings)" />
                  <Step number={2} text="Accumulate at least 500 coins ($50 minimum)" />
                  <Step number={3} text="Click Request Payout" />
                  <Step number={4} text="Funds arrive in 2-5 business days" />
                </div>
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                  <strong>Coin Value:</strong> 1 coin = $0.10 USD
                  <br />
                  <span className="text-muted-foreground">500 coins = $50 | 1000 coins = $100</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-3">Where Your Coins Come From</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <EarningSource icon={<Gift />} label="Tips" />
                <EarningSource icon={<MessageCircle />} label="Messages" />
                <EarningSource icon={<Lock />} label="PPV Unlocks" />
                <EarningSource icon={<Calendar />} label="Bookings" />
                <EarningSource icon={<Play />} label="Video Calls" />
                <EarningSource icon={<Zap />} label="Voice Calls" />
              </div>
            </div>
          </Card>
        </section>

        {/* Messages Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<MessageCircle className="h-6 w-6 text-white" />}
            title="Messages"
            gradient="from-cyan-500 to-teal-500"
            path="/chats"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Chat with fans who pay to message you. Every message they send earns you coins.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-3">How It Works</h4>
                <div className="space-y-3">
                  <Step number={1} text="Fan finds your profile" />
                  <Step number={2} text="They click Message and pay coins" />
                  <Step number={3} text="You receive the message in your Chats" />
                  <Step number={4} text="You earn coins for each message received" />
                  <Step number={5} text="Reply when you want - no pressure" />
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-3">Tips for Success</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Respond within 24-48 hours for best engagement</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Be personable - fans appreciate real responses</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Direct fans to your PPV content when relevant</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Set boundaries - you control your availability</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Profile Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<UserCircle className="h-6 w-6 text-white" />}
            title="Profile"
            gradient="from-indigo-500 to-blue-500"
            path="/profile"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              Your public face on EXA. This is what brands and fans see when they discover you.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-bold mb-3">Basic Info</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Profile photo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Username (your URL)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    First and last name
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Bio / About section
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Location (optional)
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3">Your Rates</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Photoshoot hourly rate
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Promo modeling rate
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Brand ambassador rate
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Set these on the Rates page. Brands see these when booking.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-3">Pro Tips</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>Use a high-quality profile photo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>Write a bio that shows personality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>Upload 5-10 portfolio photos minimum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>Set competitive but fair rates</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Followers Guide */}
        <section className="mb-16">
          <FeatureHeader
            icon={<Users className="h-6 w-6 text-white" />}
            title="Followers"
            gradient="from-rose-500 to-pink-500"
            path="/followers"
          />
          <Card className="p-6">
            <p className="text-muted-foreground mb-6">
              See everyone who follows you - fans, other models, and brands.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold mb-3">What You&apos;ll See</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Follower name and avatar
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Account type (Fan, Model, Brand)
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    When they followed you
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Quick message button
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3">Growing Your Following</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Share your EXA link on Instagram bio</li>
                  <li>• Post stories directing fans to EXA</li>
                  <li>• Mention exclusive content only on EXA</li>
                  <li>• Engage with fans who message you</li>
                  <li>• Post consistently to both platforms</li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Quick Start Checklist */}
        <section className="mb-16">
          <Card className="p-8 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-500/20">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <BadgeCheck className="h-7 w-7 text-green-500" />
              Quick Start Checklist
            </h3>
            <p className="text-muted-foreground mb-6">Complete these steps to fully set up your EXA profile:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <ChecklistItem text="Upload a professional profile photo" />
              <ChecklistItem text="Write a compelling bio" />
              <ChecklistItem text="Add 5-10 portfolio photos" />
              <ChecklistItem text="Set your rates on the Rates page" />
              <ChecklistItem text="Upload at least one PPV content piece" />
              <ChecklistItem text="Add your bank account for payouts" />
              <ChecklistItem text="Link EXA in your Instagram bio" />
              <ChecklistItem text="Check dashboard daily for opportunities" />
            </div>
          </Card>
        </section>

        {/* Bottom Line CTA */}
        <section className="text-center">
          <Card className="p-8 md:p-12 bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 border-pink-500/30">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">The Bottom Line</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Your Instagram followers scroll past your content in 2 seconds. Your TikTok views don&apos;t pay rent.
            </p>
            <div className="grid md:grid-cols-4 gap-4 mb-8 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">Direct monetization</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">Professional bookings</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">Paid messaging</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">A real business</span>
              </div>
            </div>
            <p className="text-xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              EXA turns your influence into income.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
                <Link href="/apply">
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/models">Browse Models</Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EXA Models. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ScenarioCard({
  title,
  description,
  result,
  icon,
  compact = false
}: {
  title: string;
  description: string;
  result: string;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} h-full hover:border-pink-500/50 transition-colors`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
          {icon}
        </div>
        <h3 className={`font-bold ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      </div>
      <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} mb-3`}>{description}</p>
      <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>{result}</p>
    </Card>
  );
}

function IncomeStream({ icon, label, description }: { icon: React.ReactNode; label: string; description: string }) {
  return (
    <div className="text-center p-4 rounded-lg bg-background/50">
      <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 mx-auto mb-2">
        {icon}
      </div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function FunnelStep({ platform, purpose, highlight = false }: { platform: string; purpose: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${highlight ? 'bg-pink-500/10 border border-pink-500/30' : 'bg-muted/50'}`}>
      <ArrowRight className={`h-4 w-4 ${highlight ? 'text-pink-500' : 'text-muted-foreground'}`} />
      <div>
        <span className={`font-medium ${highlight ? 'text-pink-500' : ''}`}>{platform}:</span>{' '}
        <span className="text-muted-foreground text-sm">{purpose}</span>
      </div>
    </div>
  );
}

function NicheCard({ niche, uses }: { niche: string; uses: string[] }) {
  return (
    <Card className="p-4">
      <h3 className="font-bold mb-3">{niche}</h3>
      <ul className="space-y-2">
        {uses.map((use, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            {use}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FeatureHeader({ icon, title, gradient, path }: { icon: React.ReactNode; title: string; gradient: string; path: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <Link href={path} className="text-sm text-pink-500 hover:text-pink-400 flex items-center gap-1">
        Go to {title} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {number}
      </div>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-pink-500">{icon}</div>
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    blue: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    violet: "bg-violet-500/20 text-violet-500 border-violet-500/30",
    green: "bg-green-500/20 text-green-500 border-green-500/30",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[color]}`}>
      {status}
    </span>
  );
}

function EarningSource({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <div className="text-green-500">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
      <div className="w-5 h-5 rounded border-2 border-green-500/50 flex items-center justify-center">
        <CheckCircle className="h-3 w-3 text-green-500" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}
