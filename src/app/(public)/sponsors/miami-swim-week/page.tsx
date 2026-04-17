export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  Check,
  ArrowRight,
  Star,
  Mail,
  Megaphone,
  Gift,
  Wine,
  Camera,
  ShoppingBag,
  Zap,
  Trophy,
  Frame,
  Droplets,
  Ship,
  Waves,
  Sun,
  Utensils,
  Dumbbell,
  Palette,
  Sparkles,
  Target,
  ChevronDown,
  PlayCircle,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { HotelFloorPlan } from "@/components/shows/hotel-floor-plan";
import { ModelGrid } from "./model-grid";
import {
  MSW_2026_SCHEDULE,
} from "@/lib/msw-schedule";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor Miami Swim Week 2026 | EXA Models",
  description:
    "Partner with EXA Models at Miami Swim Week 2026 (May 25–31, The Alexander Hotel, Miami Beach). 600+ models, 7 days, runway shows, casting call sponsorships, activations, gift bags, and more.",
  openGraph: {
    title: "Sponsor Miami Swim Week 2026 | EXA Models",
    description:
      "Get your brand in front of 300+ curated models and creators, 6 runway shows, and a full-week takeover of The Alexander Hotel at Miami Swim Week 2026. Packages from $2,000 to $45,000.",
  },
};

const VENUE = "The Alexander Hotel, Miami Beach";

const SCHEDULE = MSW_2026_SCHEDULE;

const CASTING_CALL_PACKAGES = [
  {
    id: "casting-presenting",
    name: "Casting Call Presenting Sponsor",
    tagline: "\"EXA Casting Call Presented by [Your Brand]\" — own the day: 600+ models + public day-party crowd",
    price: 14000,
    badge: "Only 1 Available",
    badgeGradient: "from-orange-500 to-red-500",
    borderColor: "border-orange-500/30",
    highlight: true,
    color: "from-orange-500/20 to-red-500/10",
    icon: <Trophy className="h-5 w-5 text-orange-400" />,
    features: [
      "Title naming rights — \"EXA Casting Call Presented by [Brand]\"",
      "Your brand in front of 600+ models AND a ticketed day-party crowd (11am–4pm)",
      "Branded step-and-repeat photo wall — every model poses in front of your logo",
      "Branded bottle-table service signage throughout the pool deck",
      "All casting photos delivered to you for marketing use",
      "Full brand activation booth at the casting venue",
      "Product sampling + branded gift bag for every model at check-in",
      "Dedicated EXA social media coverage of your brand at casting",
      "Email blast to all registered models featuring your brand",
      "Logo on all casting call promotional materials + ticket page",
      "6 VIP passes to all runway shows + 1 bottle table at the day party",
    ],
  },
  {
    id: "casting-product-sampling",
    name: "Casting Day Product Sampling & Gift Bag",
    tagline: "Put your product directly in the hands of 600+ models — sampling + swag bags",
    price: 8000,
    badge: "High Impact",
    badgeGradient: "from-pink-500 to-rose-500",
    borderColor: "border-pink-500/30",
    highlight: false,
    color: "from-pink-500/10 to-rose-500/10",
    icon: <Gift className="h-5 w-5 text-pink-400" />,
    features: [
      "Product sampling station — hand your product to 600+ models",
      "Product placed in 600+ casting day swag bags",
      "Branded table/display at the casting venue",
      "QR code or promo card distribution to all attendees",
      "Branded insert card with your promo in every bag",
      "\"Official Casting Day Partner\" designation",
      "Social media feature from EXA showcasing your sampling activation",
      "Logo on casting day signage",
      "2 VIP passes to a runway show of your choice",
    ],
  },
];

const PREMIUM_EXPERIENCES = [
  {
    id: "beach-show-sponsor",
    name: "Sunset Beach Show Sponsor",
    tagline: "Own the most iconic moment — the sand runway at sunset",
    price: 12000,
    badge: "Only 1 Available",
    badgeGradient: "from-orange-500 to-yellow-500",
    borderColor: "border-orange-500/30",
    highlight: true,
    color: "from-orange-500/20 to-yellow-500/10",
    icon: <Sun className="h-5 w-5 text-orange-400" />,
    features: [
      "Title naming rights — \"Sunset Beach Show Presented by [Brand]\"",
      "Branded beach runway backdrop and sand signage",
      "Brand activation on the beach during the show",
      "Branded cabanas and seating for VIP guests",
      "Product sampling to all beach show attendees",
      "100+ models walk past your branding on the sand",
      "Sunset golden-hour content — the most shareable moment of the week",
      "6 VIP passes + premium beach seating",
      "Dedicated social media coverage from EXA",
      "Full photo & video rights from the beach show",
      "📊 Estimated reach: 500K–3M+ organic impressions — sunset content goes viral",
    ],
  },
  {
    id: "yacht-presenting",
    name: "Yacht Experience — Presenting Sponsor",
    tagline: "Full day yacht experience with up to 15 models you select from our 125+ roster",
    price: 16500,
    badge: "Only 1 Available",
    badgeGradient: "from-blue-500 to-cyan-500",
    borderColor: "border-blue-500/30",
    highlight: false,
    color: "from-blue-500/20 to-cyan-500/10",
    icon: <Ship className="h-5 w-5 text-blue-400" />,
    features: [
      "Full branding on 120ft yacht — banners, signage, and branded experience",
      "Host a VIP sunset cruise with models, influencers, and press",
      "Branded photoshoot on the yacht with select EXA models",
      "Product activations and sampling on board",
      "Cocktail service branded with your product",
      "All yacht content (photos/video) delivered for your marketing use",
      "Social media coverage from EXA — yacht content goes viral",
      "8 VIP passes for the cruise",
      "Option for multiple cruise events throughout the week",
    ],
  },
  {
    id: "yacht-photoshoot",
    name: "Yacht Photoshoot Package",
    tagline: "Exclusive branded photoshoot with models on a 120ft yacht",
    price: 7500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-sky-500/20",
    highlight: false,
    color: "from-sky-500/10 to-blue-500/5",
    icon: <Camera className="h-5 w-5 text-sky-400" />,
    features: [
      "Half-day exclusive photoshoot on the 120ft yacht",
      "5 EXA models styled with your product",
      "Professional photographer and videographer included",
      "All content delivered — full commercial usage rights",
      "Behind-the-scenes social media content from EXA",
      "Product placement throughout the yacht",
      "4 VIP passes for the shoot day",
    ],
  },
  {
    id: "pool-deck",
    name: "Pool Deck Takeover",
    tagline: "Brand the hotel pool — cabanas, loungers, and activations all week",
    price: 8000,
    badge: "Only 1 Available",
    badgeGradient: "from-teal-500 to-cyan-500",
    borderColor: "border-teal-500/30",
    highlight: false,
    color: "from-teal-500/10 to-cyan-500/5",
    icon: <Waves className="h-5 w-5 text-teal-400" />,
    features: [
      "Full pool deck branding — cabanas, umbrellas, loungers, signage",
      "Branded refreshment station at the pool",
      "Product sampling to 100+ models staying at the hotel",
      "Pop-up activation space poolside",
      "Pool party event option (one evening)",
      "Content creation — models at the pool with your brand",
      "Social media coverage all week",
      "4 VIP passes to runway shows",
    ],
  },
];

const HOTEL_PACKAGES = [
  {
    id: "hotel-welcome-gift",
    name: "Model Welcome Gift & Room Sponsor",
    tagline: "Your product in every model room at check-in — 100+ models, 6–8 per room",
    price: 5000,
    badge: "100+ Models",
    badgeGradient: "from-rose-500 to-pink-500",
    borderColor: "border-rose-500/30",
    highlight: true,
    color: "from-rose-500/20 to-pink-500/10",
    icon: <Gift className="h-5 w-5 text-rose-400" />,
    features: [
      "Your product in welcome bags and placed in every model room before check-in — enough for 6–8 models per room",
      "100+ models discover your brand the moment they arrive",
      "Branded welcome card with your message and promo code",
      "Lobby signage and display featuring your brand",
      "\"Official Welcome Partner\" designation",
      "EXA social media feature showcasing your brand at check-in",
      "Logo on all Swim Week communications to models and event website",
      "2 VIP passes to any runway show",
      "Model content creation & posting available as a paid add-on",
    ],
  },
  {
    id: "hotel-mini-fridge",
    name: "Mini-Fridge Stocking Sponsor",
    tagline: "Your beverage in every model room fridge — the first thing they reach for every day",
    price: 4000,
    badge: "Only 1 Beverage Brand",
    badgeGradient: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500/20",
    highlight: false,
    color: "from-cyan-500/10 to-blue-500/5",
    icon: <Droplets className="h-5 w-5 text-cyan-400" />,
    features: [
      "Stock every model room mini-fridge with your beverage",
      "Your product is the first thing 100+ models reach for every day",
      "Branded fridge card with your messaging",
      "Exclusive — only one beverage brand in the fridge",
      "EXA social media feature",
      "Logo on event website",
      "2 VIP passes to a runway show",
    ],
  },
  {
    id: "morning-wellness",
    name: "Morning Wellness Sponsor",
    tagline: "Coffee & yoga, matcha & pilates — brand the daily model morning ritual",
    price: 3000,
    badge: null,
    badgeGradient: "",
    borderColor: "border-green-500/20",
    highlight: false,
    color: "from-green-500/10 to-emerald-500/5",
    icon: <Dumbbell className="h-5 w-5 text-green-400" />,
    features: [
      "Branded daily wellness session — yoga, pilates, stretch, or meditation on the pool deck",
      "Branded coffee, matcha, or smoothie bar for all participating models",
      "Product sampling to 100+ models every morning",
      "Beautiful sunrise content with models and your brand",
      "Social media coverage from EXA",
      "\"Official Wellness Partner\" designation",
      "2 VIP passes to a runway show",
    ],
  },
  {
    id: "glam-lounge",
    name: "Backstage Glam Lounge Sponsor",
    tagline: "Brand the backstage hair & makeup room — 125+ models use your product before every show",
    price: 6000,
    badge: "High Exposure",
    badgeGradient: "from-pink-500 to-violet-500",
    borderColor: "border-pink-500/30",
    highlight: false,
    color: "from-pink-500/10 to-violet-500/5",
    icon: <Palette className="h-5 w-5 text-pink-400" />,
    features: [
      "Full branding of the backstage glam lounge — all 6 shows",
      "125+ models use your products for their runway looks",
      "Branded mirrors, stations, and signage",
      "Backstage content — models getting glammed with your product",
      "Product gifting to all models backstage",
      "\"Official Beauty Partner\" backstage designation",
      "EXA social media backstage content featuring your brand",
      "4 VIP passes to all shows",
    ],
  },
  {
    id: "content-studio",
    name: "Branded Content Studio",
    tagline: "Branded photo/video studio at The Alexander Hotel for models to create content with your product",
    price: 4500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-violet-500/20",
    highlight: false,
    color: "from-violet-500/10 to-purple-500/5",
    icon: <Camera className="h-5 w-5 text-violet-400" />,
    features: [
      "Branded photo/video studio set up at The Alexander Hotel",
      "Ring lights, backdrops, and props — all branded with your product",
      "EXA social media amplification",
      "2 VIP passes to runway shows",
      "Additional pricing available for model content creation with deliverables",
    ],
  },
  {
    id: "influencer-dinner",
    name: "Private Creator Dinner",
    tagline: "Intimate dinner with 30+ top creators — expected output: 40–60 posts, 200K–1M+ views",
    price: 7500,
    badge: "High ROI",
    badgeGradient: "from-amber-500 to-orange-500",
    borderColor: "border-amber-500/20",
    highlight: false,
    color: "from-amber-500/10 to-orange-500/5",
    icon: <Utensils className="h-5 w-5 text-amber-400" />,
    features: [
      "Host an exclusive branded dinner for 30+ top models and influencers",
      "Full venue branding — table settings, menu cards, signage",
      "Your product featured as the dinner's signature drink or gift",
      "Intimate, high-value networking with EXA's top talent",
      "Professional photography and videography",
      "Content delivered for your marketing use",
      "EXA social media coverage",
      "4 VIP passes to runway shows",
    ],
  },
];

const PACKAGES = [
  {
    id: "presenting",
    name: "Presenting Sponsor",
    tagline: "Miami Swim Week 2026 Presented by [Your Brand]",
    price: 45000,
    badge: "Only 1 Available",
    badgeGradient: "from-yellow-500 to-amber-500",
    borderColor: "border-yellow-500/30",
    highlight: true,
    color: "from-yellow-500/20 to-amber-500/10",
    icon: <Trophy className="h-5 w-5 text-yellow-400" />,
    features: [
      "Top billing — \u201cPresented by [Brand]\u201d across all event materials",
      "Logo on all 6 runway backdrops (every show)",
      "2-minute branded video played at Opening Night",
      "Full-week brand activation booth at The Alexander Hotel",
      "10 VIP passes to all shows",
      "Dedicated EXA model brand ambassador for the week",
      "Product placement in 200+ model & VIP gift bags",
      "3 dedicated EXA social media features (pre, during, post-event)",
      "Logo on event website, email blasts & press kits",
      "Backstage content access & photo opportunity",
      "Full photo & video rights from all shows",
      "Logo on Red Carpet Promo Wall",
      "Category exclusivity — no competing brand partners this tier",
    ],
  },
  {
    id: "title-runway",
    name: "Title Runway Sponsor",
    tagline: "Logo on every runway backdrop, all 6 shows",
    price: 12000,
    badge: "High Visibility",
    badgeGradient: "from-pink-500 to-violet-500",
    borderColor: "border-pink-500/30",
    highlight: false,
    color: "from-pink-500/10 to-violet-500/10",
    icon: <Megaphone className="h-5 w-5 text-pink-400" />,
    features: [
      "Logo on runway backdrop — all 6 shows",
      "Brand activation booth at The Alexander Hotel",
      "6 VIP passes per show",
      "1 show-opening brand moment (logo card + PA mention)",
      "EXA model brand ambassador (3 days)",
      "Product placement in all model gift bags",
      "2 dedicated EXA social media features",
      "Logo on event website & email blasts",
      "Logo on Red Carpet Promo Wall",
      "🎥 Content guarantee: 75–150 tagged posts + full usage rights",
      "📊 Estimated reach: 500K–3M+ organic impressions",
    ],
  },
  {
    id: "official-category",
    name: "Official Category Sponsor",
    tagline: "\u201cOfficial Skincare / Beverage / Wellness Partner\u201d",
    price: 22500,
    badge: "Only 1 Per Category",
    badgeGradient: "from-cyan-500 to-blue-500",
    borderColor: "border-cyan-500/30",
    highlight: false,
    color: "from-cyan-500/10 to-blue-500/10",
    icon: <Star className="h-5 w-5 text-cyan-400" />,
    features: [
      "\u201cOfficial [Category] Partner of Miami Swim Week 2026\u201d \u2014 exclusive to your vertical",
      "All models use your product for their runway look (beauty, wellness, skincare)",
      "Backstage photo opportunity with full model lineup",
      "Brand activation booth (2 full days)",
      "4 VIP passes per show",
      "1 dedicated EXA social feature",
      "Product in model & VIP gift bags",
      "Logo on event website",
      "Logo on Red Carpet Promo Wall",
    ],
  },
  {
    id: "gold",
    name: "Runway Visibility Package",
    tagline: "Your logo on the runway + weekend brand activation",
    price: 15000,
    badge: null,
    badgeGradient: "",
    borderColor: "border-amber-500/20",
    highlight: false,
    color: "from-amber-500/10 to-yellow-500/5",
    icon: <Zap className="h-5 w-5 text-amber-400" />,
    features: [
      "Logo on runway backdrop (1 featured show)",
      "Brand activation area — weekend (May 30–31)",
      "4 VIP passes per show (2 shows)",
      "Product placement in VIP gift bags",
      "1 dedicated EXA social media feature",
      "Logo on event website",
      "Logo on Red Carpet Promo Wall",
    ],
  },
  {
    id: "cocktail-hour",
    name: "Cocktail Hour Sponsor",
    tagline: "Own the pre-show cocktail reception",
    price: 10500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-violet-500/20",
    highlight: false,
    color: "from-violet-500/10 to-pink-500/5",
    icon: <Wine className="h-5 w-5 text-violet-400" />,
    features: [
      "Exclusive naming rights \u2014 \u201cCocktail Hour by [Brand]\u201d",
      "Branded bar setup with your product as featured pour",
      "Branded signage throughout cocktail reception area",
      "4 VIP tickets to your sponsored reception",
      "Social media content captured from cocktail hour",
      "Logo on event website",
      "Logo on Red Carpet Promo Wall",
    ],
  },
  {
    id: "brand-activation",
    name: "Pop-Up Experience",
    tagline: "Branded pop-up at The Alexander Hotel — sample, demo, or sell all week",
    price: 2500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-teal-500/20",
    highlight: false,
    color: "from-teal-500/10 to-cyan-500/5",
    icon: <ShoppingBag className="h-5 w-5 text-teal-400" />,
    features: [
      "Branded pop-up space at The Alexander Hotel during Swim Week",
      "Reach attendees, press, buyers, and models in person",
      "Product sampling, demos, or sales — your call",
      "2 VIP passes",
      "Logo on event website",
      "Logo on Red Carpet Promo Wall",
    ],
  },
  {
    id: "gift-bag",
    name: "Gift Bag Sponsor",
    tagline: "Your product in every model & VIP bag",
    price: 2000,
    badge: null,
    badgeGradient: "",
    borderColor: "border-rose-500/20",
    highlight: false,
    color: "from-rose-500/10 to-pink-500/5",
    icon: <Gift className="h-5 w-5 text-rose-400" />,
    features: [
      "Product included in 200+ model & VIP gift bags",
      "\u201cOfficial Gift Partner\u201d designation",
      "EXA social media unboxing feature",
      "2 VIP passes",
      "Logo on event website",
      "Logo on Red Carpet Promo Wall",
    ],
  },
];



function SponsorContactButton({ packageName, price }: { packageName: string; price: number }) {
  const subject = encodeURIComponent(`Miami Swim Week 2026 — ${packageName} ($${price.toLocaleString()})`);
  const body = encodeURIComponent(
    `Hi Nathan,\n\nI'm interested in the ${packageName} ($${price.toLocaleString()}) for Miami Swim Week 2026.\n\nBrand name: \nWebsite: \nContact name: \n\nLooking forward to hearing from you.`
  );
  return (
    <a
      href={`mailto:nathan@examodels.com?subject=${subject}&body=${body}`}
      className="block w-full text-center bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold px-6 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-pink-500/25 hover:scale-[1.01] text-sm"
    >
      Get Started — ${price.toLocaleString()}
    </a>
  );
}

export default async function SponsorMswPage() {
  // Fetch confirmed MSW models
  let eventModels: any[] = [];
  try {
    const supabase = await createClient();

    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("slug", "miami-swim-week-2026")
      .single() as { data: { id: string } | null };

    if (event) {
      const { data: eventBadge } = await supabase
        .from("badges")
        .select("id")
        .eq("event_id", event.id)
        .eq("badge_type", "event")
        .eq("is_active", true)
        .single() as { data: { id: string } | null };

      if (eventBadge) {
        const { data: badgeHolders } = await supabase
          .from("model_badges")
          .select("model_id")
          .eq("badge_id", eventBadge.id) as { data: { model_id: string }[] | null };

        const modelIds = badgeHolders?.map((b) => b.model_id) || [];

        if (modelIds.length > 0) {
          const { data: fullModels } = await supabase
            .from("models")
            .select("id, username, first_name, last_name, profile_photo_url")
            .in("id", modelIds)
            .not("profile_photo_url", "is", null);
          eventModels = fullModels || [];
        }
      }
    }
  } catch {
    // silently fail — page renders fine without models
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero — YouTube Video */}
      <div className="relative overflow-hidden">
        <div className="aspect-video relative max-h-[75vh]">
          <iframe
            src="https://www.youtube.com/embed/Iu68o0MCuvw?autoplay=1&mute=1&loop=1&playlist=Iu68o0MCuvw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="Miami Swim Week 2026"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
          <span className="inline-flex items-center mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold shadow-[0_0_16px_rgba(245,158,11,0.5)]">
            FOR SPONSORS
          </span>
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300/90 font-bold mb-2 drop-shadow-lg">
            Partnership 2026
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Miami Swim Week 2026
          </h1>
          <div className="flex flex-wrap gap-2 text-white/90">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="font-semibold text-sm">May 25–31, 2026</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
              <MapPin className="h-4 w-4 text-cyan-400" />
              <span className="font-semibold text-sm">The Alexander Hotel, Miami Beach</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 md:px-8 py-14">

        {/* Pitch + Schedule — Split Layout */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 mb-16 items-start">
          {/* Left — Pitch + Stats */}
          <div>
            <span className="inline-flex items-center mb-4 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              Full Hotel Takeover · 7 Days · Global Exposure
            </span>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
              The pitch
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-5">
              <span className="exa-gradient-text">Position Your Brand at the Center of Miami Swim Week</span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              A full 7-day takeover of The Alexander Hotel with creators whose audiences range from 5K to 5M. <span className="text-white font-semibold">Six evening runway shows, each featuring global designers and 100+ models on the runway.</span> From a Monday ticketed day party and sunset beach runway to a 120ft yacht and on-site content production all week, your brand is seamlessly integrated into every moment — captured, shared, and distributed across millions of viewers worldwide.
            </p>

            {/* Model ladder — honest breakdown by role */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xl font-bold text-amber-300">600+</p>
                <p className="text-[10px] text-white/55 mt-0.5 uppercase tracking-wider">At Casting</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xl font-bold text-pink-300">300+</p>
                <p className="text-[10px] text-white/55 mt-0.5 uppercase tracking-wider">Curated Roster</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xl font-bold text-violet-300">150+</p>
                <p className="text-[10px] text-white/55 mt-0.5 uppercase tracking-wider">On The Runway</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-xl font-bold text-cyan-300">100+</p>
                <p className="text-[10px] text-white/55 mt-0.5 uppercase tracking-wider">Onsite All Week</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-colors">
                <p className="text-2xl md:text-3xl font-bold text-amber-300">50M+</p>
                <p className="text-xs text-white/60 mt-1">Combined Reach</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-pink-500/30 transition-colors">
                <p className="text-2xl md:text-3xl font-bold text-pink-300">6</p>
                <p className="text-xs text-white/60 mt-1">Runway Shows</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-colors">
                <p className="text-2xl md:text-3xl font-bold text-cyan-300">7 Days</p>
                <p className="text-xs text-white/60 mt-1">May 25–31</p>
              </div>
            </div>
          </div>

          {/* Right — Compact Schedule */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-lg bg-pink-500/15 ring-1 ring-pink-500/30">
                <Calendar className="h-4 w-4 text-pink-300" />
              </div>
              EXA Shows Schedule
            </h3>
            <div className="space-y-2">
              {SCHEDULE.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    event.highlight
                      ? "border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent shadow-[0_0_14px_rgba(236,72,153,0.12)]"
                      : "bg-white/[0.03] border border-white/5"
                  }`}
                >
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{event.day.slice(0, 3)}</p>
                    <p className={`text-base font-bold ${event.highlight ? "text-pink-300" : "text-white"}`}>
                      {event.date.split(" ")[1]}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-white/10 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">{event.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Past Year Videos — Social Proof */}
        <div className="mb-20">
          <Link
            href="/tv"
            className="group block relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10 p-8 md:p-10 transition-all hover:border-pink-500/40 hover:shadow-[0_0_40px_rgba(236,72,153,0.25)]"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-pink-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />

            <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-pink-500/40 blur-2xl opacity-60" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/30 to-violet-500/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                    <PlayCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300 font-bold mb-2">
                  Watch past years
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  See what EXA Miami Swim Week looks like
                </h3>
                <p className="text-white/70 leading-relaxed mb-4 max-w-2xl">
                  Full runway shows, backstage content, brand activations, and casting footage from past Miami Swim Weeks. The complete library — 4K, free to watch.
                </p>
                <div className="flex items-center gap-2 text-white/90 font-semibold group-hover:text-pink-300 transition-colors">
                  <span>Watch at examodels.com/tv</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Venue Floor Plan — Where Your Activation Lives */}
        <div className="mb-20">
          <HotelFloorPlan />
        </div>

        {/* Confirmed Model Roster — Credibility Section */}
        {eventModels.length > 0 && (
          <div className="mb-20">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
              The lineup
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              <span className="exa-gradient-text">Confirmed Models</span>
            </h2>

            <ModelGrid models={eventModels} />
          </div>
        )}

        {/* All Sponsorship Packages — Accordion Layout */}
        {[
          {
            title: "Casting Call Sponsorships",
            subtitle: "Monday May 25th · 600+ Models",
            description: "Our open casting call draws 600+ female models in a single day — each with their own social media following, from 5K to 5M. This is the single largest gathering of models at any event during Swim Week.",
            badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
            checkColor: "from-orange-500/20 to-red-500/20",
            checkIcon: "text-orange-400",
            packages: CASTING_CALL_PACKAGES,
          },
          {
            title: "Show Week Sponsorship Packages",
            subtitle: "Tuesday–Sunday · 6 Runway Shows",
            description: "Choose your level of visibility — or mix and match to build a custom partnership. Official Category Sponsorships are exclusive — one brand per vertical.",
            badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
            checkColor: "from-amber-500/20 to-orange-500/20",
            checkIcon: "text-amber-400",
            packages: PACKAGES,
          },
          {
            title: "Premium Experience Sponsorships",
            subtitle: "Beach · Yacht · Pool Deck",
            description: "The Alexander Hotel sits right on the beach with the Intracoastal across the street. A sunset sand runway show, a 120ft yacht for VIP cruises and photoshoots — these are the moments brands dream about.",
            badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            checkColor: "from-blue-500/20 to-cyan-500/20",
            checkIcon: "text-blue-400",
            packages: PREMIUM_EXPERIENCES,
          },
          {
            title: "Hotel Activation Packages",
            subtitle: "100+ Models Staying On-Site · Full Hotel Takeover",
            description: "100+ models are staying at The Alexander Hotel all week. That means your brand has access to them 24/7 — in their rooms, at breakfast, poolside, backstage, and everywhere in between.",
            badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            checkColor: "from-rose-500/20 to-pink-500/20",
            checkIcon: "text-rose-400",
            packages: HOTEL_PACKAGES,
          },
        ].map((section) => (
          <div key={section.title} className="mb-16">
            <div className="text-center mb-4">
              <Badge className={`mb-4 ${section.badgeColor} px-4 py-1`}>
                {section.subtitle}
              </Badge>
              <h2 className="text-3xl font-bold mb-3">
                <span className="exa-gradient-text">{section.title}</span>
              </h2>
              <p className="text-white/65 max-w-2xl mx-auto">
                {section.description}
              </p>
            </div>

            <div className="space-y-3 mt-10 max-w-3xl mx-auto">
              {section.packages.map((pkg) => (
                <details
                  key={pkg.id}
                  className={`group rounded-2xl border ${pkg.borderColor} bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all [&[open]]:shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:border-pink-500/40`}
                >
                  <summary className="flex items-center gap-4 p-5 md:p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none hover:bg-white/[0.04] transition-colors">
                    <div className="flex-shrink-0">{pkg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-base md:text-lg text-white">{pkg.name}</h3>
                        {pkg.badge && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${pkg.badgeGradient} text-white shadow-[0_0_10px_rgba(245,158,11,0.35)]`}>
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60 mt-0.5 truncate">{pkg.tagline}</p>
                    </div>
                    <ChevronDown className="h-5 w-5 text-white/40 flex-shrink-0 transition-transform duration-200 group-open:rotate-180 group-hover:text-pink-300" />
                  </summary>

                  <div className="px-5 md:px-6 pb-6 pt-2 border-t border-white/5">
                    <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-20 pointer-events-none`} />

                    <div className="space-y-3 mb-6 relative">
                      {pkg.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3 text-sm">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${section.checkColor} ring-1 ring-white/10 flex items-center justify-center mt-0.5`}>
                            <Check className={`h-3 w-3 ${section.checkIcon}`} />
                          </div>
                          <span className="text-white/75 leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="relative">
                      <SponsorContactButton packageName={pkg.name} price={pkg.price} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ))}

        {/* Custom Influencer Campaign */}
        <div className="mb-20">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-violet-500/5 p-8 md:p-12">
            <div className="absolute top-6 right-6 text-7xl opacity-10 select-none pointer-events-none">🎯</div>

            <Badge className="mb-5 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 px-4 py-1">
              Flexible
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 max-w-xl">
              Build a Custom Influencer Campaign
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl">
              Don&apos;t see a package that fits? Work directly with our team to build a custom campaign using our confirmed Miami Swim Week models. Choose your deliverables, pick your models, and set your budget.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { icon: <Camera className="h-5 w-5 text-cyan-400" />, title: "Content Creation", desc: "Reels, TikToks, Stories, and photo content from professional models — shot during Swim Week" },
                { icon: <Target className="h-5 w-5 text-cyan-400" />, title: "Affiliate & Swipe-Up Links", desc: "Tracked affiliate campaigns with swipe-up links — measure real ROI from model-driven traffic" },
                { icon: <Megaphone className="h-5 w-5 text-cyan-400" />, title: "Product Reviews & Unboxing", desc: "Authentic product reviews and unboxing content from models your target audience follows" },
                { icon: <Zap className="h-5 w-5 text-cyan-400" />, title: "Story Takeovers", desc: "Models take over your brand&apos;s Instagram Stories live from Miami Swim Week — real-time engagement" },
                { icon: <Users className="h-5 w-5 text-cyan-400" />, title: "Pick Your Models", desc: "Hand-select models from our confirmed roster based on follower count, aesthetic, niche, or audience demo" },
                { icon: <ShoppingBag className="h-5 w-5 text-cyan-400" />, title: "Product Seeding", desc: "Get your product into the hands of specific models — they wear it, use it, and post about it organically" },
              ].map((item) => (
                <div key={item.title} className="p-5 rounded-2xl bg-black/20 border border-white/5">
                  <div className="mb-3">{item.icon}</div>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <a
              href="mailto:nathan@examodels.com?subject=Custom%20Influencer%20Campaign%20—%20Miami%20Swim%20Week%202026&body=Hi%20Nathan%2C%0A%0AI%27m%20interested%20in%20building%20a%20custom%20influencer%20campaign%20for%20Miami%20Swim%20Week%202026.%0A%0ABrand%3A%20%0AWebsite%3A%20%0AGoal%3A%20%0ABudget%20range%3A%20%0ADeliverables%20I%27m%20interested%20in%3A%20%0A%0ALooking%20forward%20to%20connecting."
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02]"
            >
              <Mail className="h-5 w-5" />
              Build Your Campaign
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>



        {/* Cross-links — Also Participating in Miami Swim Week? */}
        <div className="mb-14">
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
            Also participating in Miami Swim Week?
          </p>
          <h3 className="text-center text-xl md:text-2xl font-bold mb-6">
            <span className="exa-gradient-text">Explore the full week</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <Link
              href="/designers/miami-swim-week"
              className="group flex items-center justify-between gap-4 px-6 py-5 rounded-2xl border border-violet-500/30 bg-violet-500/5 hover:border-violet-500/60 hover:bg-violet-500/10 transition-all hover:shadow-[0_0_20px_rgba(167,139,250,0.25)]"
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider text-violet-300 font-bold mb-1">For Designers</p>
                <p className="font-semibold text-white">Book a Runway Show</p>
                <p className="text-xs text-white/55 mt-0.5">Showcase your collection — from $1,000</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-violet-300 transition-colors flex-shrink-0" />
            </Link>
            <Link
              href="/shows/miami-swim-week-2026"
              className="group flex items-center justify-between gap-4 px-6 py-5 rounded-2xl border border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]"
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider text-pink-300 font-bold mb-1">For Fans &amp; Press</p>
                <p className="font-semibold text-white">View the Shows &amp; Get Tickets</p>
                <p className="text-xs text-white/55 mt-0.5">Confirmed lineup · venue map · ticket tiers</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-pink-300 transition-colors flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="relative overflow-hidden text-center p-10 md:p-14 rounded-3xl bg-gradient-to-r from-amber-500/12 via-orange-500/12 to-pink-500/12 border border-amber-500/40 shadow-[0_0_32px_rgba(245,158,11,0.15)]">
          <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-amber-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
              Final step
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-5">
              <span className="exa-gradient-text">Secure Your Sponsorship</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-lg font-bold text-amber-300">300+</p>
                <p className="text-xs text-white/60">Curated Creators</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-lg font-bold text-pink-300">7 Days</p>
                <p className="text-xs text-white/60">Of Content</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-lg font-bold text-violet-300">6</p>
                <p className="text-xs text-white/60">Runway Shows</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <p className="text-lg font-bold text-cyan-300">50M+</p>
                <p className="text-xs text-white/60">Combined Reach</p>
              </div>
            </div>
            <a
              href="mailto:nathan@examodels.com?subject=Miami%20Swim%20Week%202026%20—%20Reserve%20My%20Spot&body=Hi%20Nathan%2C%0A%0AI%20want%20to%20secure%20a%20sponsorship%20for%20Miami%20Swim%20Week%202026.%0A%0ABrand%3A%20%0AWebsite%3A%20%0APackage(s)%20of%20interest%3A%20%0ABudget%20range%3A%20%0A%0ALooking%20forward%20to%20connecting."
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-400 hover:via-orange-400 hover:to-pink-400 text-white font-bold px-8 py-4 rounded-full transition-all shadow-[0_0_24px_rgba(245,158,11,0.5)] hover:shadow-[0_0_32px_rgba(245,158,11,0.7)] active:scale-[0.98]"
            >
              <Mail className="h-5 w-5" />
              Reserve Your Spot
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
