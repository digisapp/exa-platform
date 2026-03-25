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
  Hotel,
  Utensils,
  Dumbbell,
  Palette,
  Package,
  Sparkles,
  Target,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor Miami Swim Week 2026 | EXA Models",
  description:
    "Partner with EXA Models at Miami Swim Week 2026 (May 25–31, The Alexander Hotel, Miami Beach). 600+ models, 7 days, runway shows, casting call sponsorships, activations, gift bags, and more.",
  openGraph: {
    title: "Sponsor Miami Swim Week 2026 | EXA Models",
    description:
      "Get your brand in front of 600+ models and thousands of fashion, beauty, and lifestyle consumers at Miami Swim Week 2026. Packages from $500 to $20,000.",
  },
};

const VENUE = "The Alexander Hotel, 5225 Collins Ave, Miami Beach";

const SCHEDULE = [
  {
    day: "Monday",
    date: "May 25",
    title: "Casting Call",
    description: "600+ models attend the open casting call — the biggest gathering of talent all week",
    highlight: true,
    badge: "600+ Models",
  },
  {
    day: "Tuesday",
    date: "May 26",
    title: "Opening Show",
    description: "The grand opening runway show kicks off Miami Swim Week 2026",
    highlight: true,
    badge: "Opening Night",
  },
  {
    day: "Wednesday",
    date: "May 27",
    title: "Day 2 Show",
    description: "Runway show featuring emerging and established swimwear designers",
    highlight: false,
    badge: null,
  },
  {
    day: "Thursday",
    date: "May 28",
    title: "Sunset Beach Show",
    description: "Stunning sand runway show on the beach at sunset — the most iconic show of the week",
    highlight: true,
    badge: "Beach Runway",
  },
  {
    day: "Friday",
    date: "May 29",
    title: "Day 4 Show",
    description: "Runway show plus VIP cocktail hour and brand activations",
    highlight: false,
    badge: null,
  },
  {
    day: "Saturday",
    date: "May 30",
    title: "Day 5 Show",
    description: "Runway show featuring designer collections and brand activations",
    highlight: false,
    badge: null,
  },
  {
    day: "Sunday",
    date: "May 31",
    title: "Pool Vibes Closing Show",
    description: "Poolside closing runway show, DJ set, and after party — the ultimate send-off to Swim Week",
    highlight: true,
    badge: "Closing Party",
  },
];

const CASTING_CALL_PACKAGES = [
  {
    id: "casting-presenting",
    name: "Casting Call Presenting Sponsor",
    tagline: "\"EXA Casting Call Presented by [Your Brand]\" — 600+ models see your brand all day",
    price: 10000,
    badge: "Only 1 Available",
    badgeGradient: "from-orange-500 to-red-500",
    borderColor: "border-orange-500/30",
    highlight: true,
    color: "from-orange-500/20 to-red-500/10",
    icon: <Trophy className="h-5 w-5 text-orange-400" />,
    features: [
      "Title naming rights — \"EXA Casting Call Presented by [Brand]\"",
      "Your brand in front of 600+ models for the entire casting day",
      "Branded step-and-repeat photo wall — every model poses in front of your logo",
      "All casting photos delivered to you for marketing use",
      "Full brand activation booth at the casting venue",
      "Product sampling + branded gift bag for every model at check-in",
      "Exclusive beverage partner — your brand is the only drink served at casting",
      "Dedicated EXA social media coverage of your brand at casting",
      "Email blast to all registered models featuring your brand",
      "Logo on all casting call promotional materials",
      "6 VIP passes to all runway shows",
      "First right of refusal for show week sponsorship",
      "📊 Estimated reach: 1M–5M+ organic impressions from 600+ creators posting",
    ],
  },
  {
    id: "casting-product-sampling",
    name: "Casting Day Product Sampling & Gift Bag",
    tagline: "Put your product directly in the hands of 600+ models — sampling + swag bags",
    price: 5000,
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
    price: 15000,
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
    tagline: "Brand the 120ft yacht on the Intracoastal",
    price: 12000,
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
    id: "hotel-welcome-bag",
    name: "Model Welcome Gift Bag Sponsor",
    tagline: "100+ models check in to rooms stocked with your product — day one organic content",
    price: 5000,
    badge: "100+ Models",
    badgeGradient: "from-rose-500 to-pink-500",
    borderColor: "border-rose-500/30",
    highlight: true,
    color: "from-rose-500/20 to-pink-500/10",
    icon: <Gift className="h-5 w-5 text-rose-400" />,
    features: [
      "Your product in welcome bags for 100+ models — placed in every model room at check-in",
      "Branded welcome card with your message and promo code",
      "Lobby signage and display featuring your brand",
      "\"Official Welcome Partner\" designation",
      "Models unbox and share on social — organic UGC from day one",
      "EXA social media unboxing/arrival content featuring your brand",
      "Logo on all Swim Week communications to models",
      "2 VIP passes to any runway show",
    ],
  },
  {
    id: "hotel-room-gift",
    name: "Model Room Gift Sponsor",
    tagline: "Your product waiting in every model room at check-in — 100+ models, 6–8 per room",
    price: 3500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-pink-500/20",
    highlight: false,
    color: "from-pink-500/10 to-rose-500/5",
    icon: <Package className="h-5 w-5 text-pink-400" />,
    features: [
      "Your product placed in every model room before check-in — enough for 6–8 models per room",
      "100+ models discover your brand the moment they arrive",
      "Branded card with your messaging and promo code",
      "Models share the surprise on social — high organic engagement",
      "EXA social media feature",
      "Logo on event website",
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
    id: "hotel-signage",
    name: "Hotel Branding & Signage Package",
    tagline: "Elevator wraps, hallway banners, room key cards — your brand is impossible to miss",
    price: 6000,
    badge: null,
    badgeGradient: "",
    borderColor: "border-indigo-500/20",
    highlight: false,
    color: "from-indigo-500/10 to-violet-500/5",
    icon: <Hotel className="h-5 w-5 text-indigo-400" />,
    features: [
      "Branded elevator wraps — your brand seen on every floor, every trip",
      "Hallway banners and directional signage with your logo",
      "Branded hotel room key cards for model rooms",
      "Lobby display/installation with your product",
      "Your brand is literally impossible to miss all week",
      "EXA social media feature",
      "4 VIP passes to runway shows",
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
    tagline: "UGC creation station — 50+ guaranteed pieces of model-created content",
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
      "100+ models create organic UGC with your product throughout the week",
      "Guarantee 50+ pieces of model-created content",
      "All content delivered with full usage rights",
      "EXA social media amplification",
      "2 VIP passes to runway shows",
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
    price: 20000,
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
      "Organic social exposure from 600+ models — your brand in their content all week",
      "Logo on Red Carpet Promo Wall",
      "🎥 Content guarantee: 200+ tagged posts, dedicated hero video, full usage rights",
      "📊 Estimated reach: 2M–10M+ organic impressions across model and EXA channels",
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
    price: 7500,
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
      "🎥 Content guarantee: 50–100 tagged posts + usage rights",
      "📊 Estimated reach: 300K–1.5M+ organic impressions",
    ],
  },
  {
    id: "gold",
    name: "Runway Visibility Package",
    tagline: "Your logo on the runway + weekend brand activation",
    price: 5000,
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
      "🎥 Content guarantee: 25–50 tagged posts",
    ],
  },
  {
    id: "community-sponsor",
    name: "Supporting Brand Partner",
    tagline: "Your logo on the Red Carpet Promo Wall + show tickets",
    price: 500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-red-500/20",
    highlight: false,
    color: "from-red-500/10 to-rose-500/5",
    icon: <Frame className="h-5 w-5 text-red-400" />,
    features: [
      "Your logo on the Red Carpet Promo Wall",
      "2 GA tickets to the show",
    ],
  },
  {
    id: "cocktail-hour",
    name: "Cocktail Hour Sponsor",
    tagline: "Own the pre-show cocktail reception",
    price: 3500,
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

const STATS = [
  { value: "600+", label: "Models at Casting Call" },
  { value: "125+", label: "Runway Models" },
  { value: "100+", label: "Models Staying On-Site" },
  { value: "Millions", label: "Combined Social Reach" },
  { value: "7 Days", label: "May 25–31, 2026" },
  { value: "6", label: "Runway Shows" },
];

const FAQS = [
  {
    q: "Who attends Miami Swim Week?",
    a: "600+ models attend our Monday casting call alone — each with their own social media following. Throughout the week: buyers, press, fashion editors, influencers, photographers, and thousands of consumers. 100+ models stay on-site at the hotel all week.",
  },
  {
    q: "What kind of social media exposure can I expect?",
    a: "Our models have followings ranging from 5,000 to 5 million. When your brand is in their hands — at casting, backstage, at the pool, or in their hotel room — they post it. Stories, reels, TikToks. You're getting organic, authentic content from hundreds of creators. That's millions of impressions you can't buy through traditional ads.",
  },
  {
    q: "Why is this different from other sponsorship events?",
    a: "Where else can your brand connect with 600+ models in one location? This isn't a one-night event — it's a full 7-day hotel takeover with casting, 6 runway shows, a beach show, yacht experiences, and 100+ models living on-site. Your brand is embedded in every moment of their week.",
  },
  {
    q: "What categories are a good fit for sponsoring?",
    a: "Any brand targeting fashion-forward, beauty-conscious consumers. Top performers: skincare, sunscreen, medspa, wellness/supplements, spirits, beverages, haircare, beauty, swimwear, fitness, and tech/apps. If models use it, wear it, or drink it — it works here.",
  },
  {
    q: "Can I customize a package?",
    a: "Absolutely. Mix and match across casting call, hotel activations, beach/yacht experiences, and show week packages. Want a custom yacht photoshoot + casting day sampling + hotel room gifting combo? We'll build it.",
  },
  {
    q: "Do I need to be in Miami?",
    a: "For booth activations and sampling, yes — you or a brand rep should be present. For gift bags, hotel room gifting, Wi-Fi branding, signage, and media packages, we handle everything.",
  },
  {
    q: "What's the deadline?",
    a: "Sponsorship slots are limited and selling fast — especially the Sunset Beach Show, Yacht Experience, Casting Call Presenting Sponsor, and Official Category Sponsor (one per vertical). Reach out early to lock in the best packages.",
  },
  {
    q: "How do we get started?",
    a: "Email nathan@examodels.com with your brand name and the package(s) you're interested in. We'll send a sponsorship deck and get you set up.",
  },
];

const BUNDLES = [
  {
    id: "creator-takeover",
    name: "Creator Takeover Package",
    price: 12500,
    originalValue: 22000,
    badge: "Best Value",
    badgeGradient: "from-emerald-500 to-green-500",
    borderColor: "border-emerald-500/30",
    color: "from-emerald-500/20 to-green-500/10",
    icon: <Camera className="h-5 w-5 text-emerald-400" />,
    tagline: "Maximum content output — pool, studio, dinner, and gift bags combined",
    includes: [
      "Pool Deck Takeover ($8,000)",
      "Branded Content Studio ($4,500)",
      "Private Creator Dinner ($7,500)",
      "Gift Bag Sponsor ($2,000)",
    ],
    contentGuarantee: "100+ pieces of creator content, 500K–2M+ projected views",
  },
  {
    id: "casting-domination",
    name: "Casting Domination Package",
    price: 9500,
    originalValue: 21000,
    badge: "Own The Day",
    badgeGradient: "from-orange-500 to-red-500",
    borderColor: "border-orange-500/30",
    color: "from-orange-500/20 to-red-500/10",
    icon: <Trophy className="h-5 w-5 text-orange-400" />,
    tagline: "Own the entire casting day ecosystem — every model sees, touches, and posts your brand",
    includes: [
      "Casting Call Presenting Sponsor ($10,000)",
      "Casting Day Product Sampling ($5,000)",
      "Casting Day Photo Wall ($4,000)",
      "Casting Day Hydration Sponsor ($3,500)",
    ],
    contentGuarantee: "200+ tagged posts from 600+ models in a single day",
  },
  {
    id: "hotel-experience",
    name: "Hotel Experience Package",
    price: 8500,
    originalValue: 16000,
    badge: "Full Guest Journey",
    badgeGradient: "from-rose-500 to-pink-500",
    borderColor: "border-rose-500/30",
    color: "from-rose-500/20 to-pink-500/10",
    icon: <Hotel className="h-5 w-5 text-rose-400" />,
    tagline: "Own the full model hotel experience — check-in to checkout, your brand is everywhere",
    includes: [
      "Model Welcome Gift Bag ($5,000)",
      "Nightly Turn-Down Gift ($3,500)",
      "Mini-Fridge Stocking ($4,000)",
      "Hotel Branding & Signage ($6,000)",
    ],
    contentGuarantee: "75+ organic posts from 100+ models sharing your brand throughout their stay",
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
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Miami Swim Week 2026
          </h1>
          <div className="flex flex-wrap gap-3 text-white/90">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-sm">May 25–31, 2026</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <MapPin className="h-4 w-4 text-cyan-400" />
              <span className="font-medium text-sm">The Alexander Hotel, Miami Beach</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 md:px-8 py-14">

        {/* Pitch + Stats */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20 px-4 py-1">
            Full Hotel Takeover · 7 Days · Global Exposure
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Position Your Brand at the Center of Miami Swim Week
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            600+ models and creators with audiences ranging from 5K to 5M. From a sunset beach runway to a 120ft yacht and a full hotel takeover, your brand is seamlessly integrated into every moment — captured, shared, and distributed across millions of viewers worldwide. <span className="text-white font-semibold">This level of access doesn&apos;t exist anywhere else.</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-20">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-5 rounded-2xl bg-muted/30 border border-white/5">
              <p className="text-2xl md:text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Full Week Schedule */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Full Week Schedule</h2>
            <p className="text-muted-foreground">
              7 days of shows, activations, and brand experiences at The Alexander Hotel
            </p>
          </div>

          <div className="grid gap-3 max-w-4xl mx-auto">
            {SCHEDULE.map((event) => (
              <div
                key={event.date}
                className={`flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-2xl border transition-all ${
                  event.highlight
                    ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5"
                    : "border-white/5 bg-muted/30"
                }`}
              >
                <div className="text-center flex-shrink-0 w-16 md:w-20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{event.day}</p>
                  <p className={`text-lg md:text-xl font-bold ${event.highlight ? "text-amber-400" : "text-white"}`}>
                    {event.date.split(" ")[1]}
                  </p>
                  <p className="text-xs text-muted-foreground">May</p>
                </div>
                <div className="h-10 w-px bg-white/10 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm md:text-base">{event.title}</h3>
                    {event.badge && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        {event.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Casting Call Sponsor Packages */}
        <div className="mb-20">
          <div className="text-center mb-4">
            <Badge className="mb-4 bg-orange-500/10 text-orange-400 border-orange-500/20 px-4 py-1">
              Monday May 25th · 600+ Models
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Casting Call Sponsorships</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our open casting call draws 600+ female models in a single day — each with their own social media following, from 5K to 5M. This is the single largest gathering of models at any event during Swim Week. Put your product in their hands and it ends up on their feeds. No other activation gives you this kind of direct, one-day access to this many influencers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {CASTING_CALL_PACKAGES.map((pkg, index) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden border ${pkg.borderColor} ${
                  pkg.highlight ? "shadow-2xl shadow-orange-500/10 md:col-span-2 max-w-2xl mx-auto w-full" : ""
                } ${!pkg.highlight && CASTING_CALL_PACKAGES.filter(p => !p.highlight).length % 2 !== 0 && index === CASTING_CALL_PACKAGES.length - 1 ? "md:col-span-2 max-w-xl mx-auto w-full" : ""}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-30 pointer-events-none`} />

                {pkg.badge && (
                  <div className="absolute top-5 right-5 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${pkg.badgeGradient} text-white shadow-md`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <CardContent className="relative p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-1">
                    {pkg.icon}
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Casting Call Package
                    </p>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground italic mb-6">{pkg.tagline}</p>

                  <div className="space-y-3 mb-8">
                    {pkg.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mt-0.5">
                          <Check className="h-3 w-3 text-orange-400" />
                        </div>
                        <span className="text-muted-foreground leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <SponsorContactButton packageName={pkg.name} price={pkg.price} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Premium Experience Packages — Beach, Yacht, Jet Ski, Pool */}
        <div className="mb-20">
          <div className="text-center mb-4">
            <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20 px-4 py-1">
              Beach · Yacht · Jet Ski · Pool Deck
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Premium Experience Sponsorships</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The Alexander Hotel sits right on the beach with the Intracoastal across the street. A sunset sand runway show, a 120ft yacht for VIP cruises and photoshoots, branded jet ski experiences, and a full pool deck takeover — these are the moments brands dream about.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {PREMIUM_EXPERIENCES.map((pkg, index) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden border ${pkg.borderColor} ${
                  pkg.highlight ? "shadow-2xl shadow-orange-500/10 md:col-span-2 max-w-2xl mx-auto w-full" : ""
                } ${!pkg.highlight && PREMIUM_EXPERIENCES.filter(p => !p.highlight).length % 2 !== 0 && index === PREMIUM_EXPERIENCES.length - 1 ? "md:col-span-2 max-w-xl mx-auto w-full" : ""}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-30 pointer-events-none`} />

                {pkg.badge && (
                  <div className="absolute top-5 right-5 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${pkg.badgeGradient} text-white shadow-md`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <CardContent className="relative p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-1">
                    {pkg.icon}
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Premium Experience
                    </p>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground italic mb-6">{pkg.tagline}</p>

                  <div className="space-y-3 mb-8">
                    {pkg.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mt-0.5">
                          <Check className="h-3 w-3 text-blue-400" />
                        </div>
                        <span className="text-muted-foreground leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <SponsorContactButton packageName={pkg.name} price={pkg.price} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Hotel Activation Packages */}
        <div className="mb-20">
          <div className="text-center mb-4">
            <Badge className="mb-4 bg-rose-500/10 text-rose-400 border-rose-500/20 px-4 py-1">
              100+ Models Staying On-Site · Full Hotel Takeover
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Hotel Activation Packages</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              100+ models are staying at The Alexander Hotel all week. That means your brand has access to them 24/7 — in their rooms, at breakfast, poolside, backstage, and everywhere in between. These activations turn the entire hotel into your brand experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            {HOTEL_PACKAGES.map((pkg, index) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden border ${pkg.borderColor} ${
                  pkg.highlight ? "shadow-2xl shadow-rose-500/10 md:col-span-2 max-w-2xl mx-auto w-full" : ""
                } ${!pkg.highlight && HOTEL_PACKAGES.filter(p => !p.highlight).length % 2 !== 0 && index === HOTEL_PACKAGES.length - 1 ? "md:col-span-2 max-w-xl mx-auto w-full" : ""}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-30 pointer-events-none`} />

                {pkg.badge && (
                  <div className="absolute top-5 right-5 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${pkg.badgeGradient} text-white shadow-md`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <CardContent className="relative p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-1">
                    {pkg.icon}
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Hotel Activation
                    </p>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground italic mb-6">{pkg.tagline}</p>

                  <div className="space-y-3 mb-8">
                    {pkg.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center mt-0.5">
                          <Check className="h-3 w-3 text-rose-400" />
                        </div>
                        <span className="text-muted-foreground leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <SponsorContactButton packageName={pkg.name} price={pkg.price} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Show Week Sponsorship Packages */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-pink-500/10 text-pink-400 border-pink-500/20 px-4 py-1">
              Tuesday–Sunday · 6 Runway Shows
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Show Week Sponsorship Packages</h2>
            <p className="text-muted-foreground">
              Choose your level of visibility — or mix and match to build a custom partnership
            </p>
            <p className="text-sm text-amber-400 font-medium mt-2">
              Official Category Sponsorships are exclusive — one brand per vertical.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {PACKAGES.map((pkg, index) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden border ${pkg.borderColor} ${
                  pkg.highlight ? "shadow-2xl shadow-yellow-500/10" : ""
                } ${PACKAGES.length % 2 !== 0 && index === PACKAGES.length - 1 ? "md:col-span-2 max-w-xl mx-auto w-full" : ""}`}
              >
                {/* Subtle gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-30 pointer-events-none`} />

                {pkg.badge && (
                  <div className="absolute top-5 right-5 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${pkg.badgeGradient} text-white shadow-md`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                )}

                <CardContent className="relative p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-1">
                    {pkg.icon}
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Sponsorship Package
                    </p>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground italic mb-6">{pkg.tagline}</p>

                  <div className="space-y-3 mb-8">
                    {pkg.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mt-0.5">
                          <Check className="h-3 w-3 text-amber-400" />
                        </div>
                        <span className="text-muted-foreground leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <SponsorContactButton packageName={pkg.name} price={pkg.price} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bundle Packages */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1">
              Save 30–55% vs. Individual Packages
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Bundle Packages</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pre-built combinations designed for maximum impact. Each bundle saves you thousands vs. buying individually — and guarantees content output.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {BUNDLES.map((bundle) => (
              <Card
                key={bundle.id}
                className={`relative overflow-hidden border ${bundle.borderColor} shadow-xl`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${bundle.color} opacity-30 pointer-events-none`} />

                <div className="absolute top-5 right-5 z-10">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${bundle.badgeGradient} text-white shadow-md`}
                  >
                    {bundle.badge}
                  </span>
                </div>

                <CardContent className="relative p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-1">
                    {bundle.icon}
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      Bundle Package
                    </p>
                  </div>
                  <h3 className="text-xl font-bold mb-1">{bundle.name}</h3>
                  <p className="text-sm text-muted-foreground italic mb-4">{bundle.tagline}</p>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold text-white">${bundle.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground line-through">${bundle.originalValue.toLocaleString()}</span>
                    <span className="text-xs text-emerald-400 font-semibold">Save ${(bundle.originalValue - bundle.price).toLocaleString()}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Includes:</p>
                    {bundle.includes.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <p className="text-xs font-semibold text-emerald-400">Guaranteed Content Output</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{bundle.contentGuarantee}</p>
                  </div>

                  <SponsorContactButton packageName={bundle.name} price={bundle.price} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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

        {/* Confirmed Model Roster */}
        {eventModels.length > 0 && (
          <div className="mb-20">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20 px-4 py-1">
                Confirmed Talent
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Models Walking Miami Swim Week
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {eventModels.length} confirmed models and counting — these are the creators who will be wearing your product, posting your brand, and walking your runway. This is who your sponsorship puts you in front of.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {eventModels.map((model: any) => (
                <Link
                  key={model.id}
                  href={`/${model.username}`}
                  target="_blank"
                  className="group block"
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
                    <Image
                      src={model.profile_photo_url}
                      alt={model.first_name || model.username}
                      fill
                      sizes="(max-width: 768px) 50vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-semibold truncate">
                        {model.first_name
                          ? `${model.first_name} ${model.last_name || ""}`.trim()
                          : model.username}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Who Should Sponsor */}
        <div className="mb-20">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-pink-500/5 p-8 md:p-12">
            <div className="absolute top-6 right-6 text-7xl opacity-10 select-none pointer-events-none">✨</div>

            <Badge className="mb-5 bg-amber-500/10 text-amber-400 border-amber-500/20 px-4 py-1">
              Perfect Fit
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 max-w-xl">
              Brands That Win at Swim Week
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-2xl">
              600+ models with social followings from 5K to 5M. They&apos;re beauty-obsessed, fashion-forward, and they share everything. When your product is in their hands, it&apos;s on their feed — and in front of their followers. These are the categories that convert.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { emoji: "☀️", category: "Sunscreen & SPF", desc: "600+ models in the Miami sun — SPF brands get massive sampling and organic social content" },
                { emoji: "💆", category: "Skincare & Medspa", desc: "Models are your ideal customer and your best influencer — direct backstage access" },
                { emoji: "💇", category: "Haircare", desc: "Your product in every model's hair backstage, in the gift bag, and on their social feeds" },
                { emoji: "🥂", category: "Spirits & Beverages", desc: "Cocktail hours, yacht cruises, pool parties — your brand in every hand, every photo" },
                { emoji: "💊", category: "Wellness & Supplements", desc: "Health-conscious models with massive followings are your target demo and your marketing channel" },
                { emoji: "💄", category: "Beauty & Makeup", desc: "Official beauty partner = backstage access to 125+ models and the UGC that comes with it" },
                { emoji: "👙", category: "Swimwear & Fashion", desc: "It's Swim Week — fashion brands get runway placement, model content, and industry press" },
                { emoji: "🏋️", category: "Fitness & Activewear", desc: "Morning wellness sessions, pool deck activations — fitness brands connect with models who live the lifestyle" },
                { emoji: "📱", category: "Tech & Apps", desc: "600+ models with phones in hand all week — app installs, tech demos, and authentic content creation" },
              ].map((item) => (
                <div key={item.category} className="p-5 rounded-2xl bg-black/20 border border-white/5">
                  <p className="text-2xl mb-2">{item.emoji}</p>
                  <p className="font-semibold text-sm mb-1">{item.category}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map((item) => (
              <div key={item.q} className="p-5 rounded-xl bg-muted/30 border border-white/5">
                <p className="font-semibold mb-2 flex items-start gap-2 text-sm">
                  <Star className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  {item.q}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed pl-6">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center p-10 md:p-14 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-pink-500/10 border border-amber-500/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Secure Your Sponsorship</h2>
          <p className="text-muted-foreground mb-4 max-w-lg mx-auto leading-relaxed">
            600+ models. 7 days. 6 shows. A full hotel takeover, beach runway, and 120ft yacht — your brand in every frame. Packages start at $500.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto mb-8">
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <p className="text-lg font-bold text-amber-400">600+</p>
              <p className="text-xs text-muted-foreground">Creators</p>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <p className="text-lg font-bold text-pink-400">7 Days</p>
              <p className="text-xs text-muted-foreground">Of Content</p>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <p className="text-lg font-bold text-violet-400">100–200+</p>
              <p className="text-xs text-muted-foreground">Guaranteed Posts</p>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <p className="text-lg font-bold text-cyan-400">$500</p>
              <p className="text-xs text-muted-foreground">Starting At</p>
            </div>
          </div>
          <a
            href="mailto:nathan@examodels.com?subject=Miami%20Swim%20Week%202026%20—%20Reserve%20My%20Spot&body=Hi%20Nathan%2C%0A%0AI%20want%20to%20secure%20a%20sponsorship%20for%20Miami%20Swim%20Week%202026.%0A%0ABrand%3A%20%0AWebsite%3A%20%0APackage(s)%20of%20interest%3A%20%0ABudget%20range%3A%20%0A%0ALooking%20forward%20to%20connecting."
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02]"
          >
            <Mail className="h-5 w-5" />
            Reserve Your Spot
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="text-sm text-muted-foreground mt-3">
            nathan@examodels.com
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Or visit{" "}
            <Link href="/shows/miami-swim-week-2026" className="text-amber-400 hover:underline">
              examodels.com/swimweek
            </Link>{" "}
            to see our full show lineup
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
