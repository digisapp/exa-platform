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
