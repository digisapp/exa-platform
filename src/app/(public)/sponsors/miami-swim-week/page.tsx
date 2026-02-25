export const revalidate = 60;

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  Sparkles,
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
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor Miami Swim Week 2026 | EXA Models",
  description:
    "Partner with EXA Models at Miami Swim Week 2026 (May 26–31, The National Hotel Miami Beach). Sponsorship packages for brands — runway visibility, activations, gift bags, and more.",
  openGraph: {
    title: "Sponsor Miami Swim Week 2026 | EXA Models",
    description:
      "Get your brand in front of thousands of fashion, beauty, and lifestyle consumers at Miami Swim Week 2026. Packages from $2,000 to $20,000.",
  },
};

const VENUE = "The National Hotel Miami Beach";

const PACKAGES = [
  {
    id: "presenting",
    name: "Presenting Sponsor",
    tagline: "Miami Swim Week 2026 Presented by [Your Brand]",
    price: 20000,
    badge: "Most Impactful",
    badgeGradient: "from-yellow-500 to-amber-500",
    borderColor: "border-yellow-500/30",
    highlight: true,
    color: "from-yellow-500/20 to-amber-500/10",
    icon: <Trophy className="h-5 w-5 text-yellow-400" />,
    features: [
      "Top billing — \u201cPresented by [Brand]\u201d across all event materials",
      "Logo on all 6 runway backdrops (every show)",
      "2-minute branded video played at Opening Night",
      "Full-week brand activation booth at The National Hotel",
      "10 VIP passes to all shows",
      "Dedicated EXA model brand ambassador for the week",
      "Product placement in 200+ model & VIP gift bags",
      "3 dedicated EXA social media features (pre, during, post-event)",
      "Logo on event website, email blasts & press kits",
      "Backstage content access & photo opportunity",
      "Full photo & video rights from all shows",
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
      "Brand activation booth at The National Hotel",
      "6 VIP passes per show",
      "1 show-opening brand moment (logo card + PA mention)",
      "EXA model brand ambassador (3 days)",
      "Product placement in all model gift bags",
      "2 dedicated EXA social media features",
      "Logo on event website & email blasts",
    ],
  },
  {
    id: "official-category",
    name: "Official Category Sponsor",
    tagline: "\u201cOfficial Skincare / Beverage / Wellness Partner\u201d",
    price: 7500,
    badge: "Exclusive",
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
    ],
  },
  {
    id: "gold",
    name: "Gold Sponsor",
    tagline: "Runway logo placement + weekend activation",
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
    ],
  },
  {
    id: "red-carpet-wall",
    name: "Red Carpet Promo Wall",
    tagline: "Your brand in every photo taken at the event",
    price: 4000,
    badge: "Max Photo Exposure",
    badgeGradient: "from-red-500 to-rose-500",
    borderColor: "border-red-500/30",
    highlight: false,
    color: "from-red-500/10 to-rose-500/5",
    icon: <Frame className="h-5 w-5 text-red-400" />,
    features: [
      "Fully branded step-and-repeat backdrop — your logo wall-to-wall",
      "Every model, guest, and photographer shoots in front of it",
      "Maximum organic reach — every shared photo features your brand",
      "Logo in 100% of official event photography",
      "Positioned at the main entrance for full show-week exposure",
      "4 VIP passes",
      "Logo on event website",
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
    ],
  },
  {
    id: "brand-activation",
    name: "Brand Activation Booth",
    tagline: "Pop-up experience at The National Hotel",
    price: 2500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-teal-500/20",
    highlight: false,
    color: "from-teal-500/10 to-cyan-500/5",
    icon: <ShoppingBag className="h-5 w-5 text-teal-400" />,
    features: [
      "Branded pop-up space at The National Hotel during Swim Week",
      "Reach attendees, press, buyers, and models in person",
      "Product sampling, demos, or sales — your call",
      "2 VIP passes",
      "Logo on event website",
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
    ],
  },
  {
    id: "photo-video",
    name: "Media Sponsor",
    tagline: "Brand placement in all official show photography",
    price: 1500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-sky-500/20",
    highlight: false,
    color: "from-sky-500/10 to-blue-500/5",
    icon: <Camera className="h-5 w-5 text-sky-400" />,
    features: [
      "Brand logo/product visible in all official runway photos & video",
      "Content delivered for your social & marketing use",
      "1 dedicated model content shoot with your product",
      "Social media tag from EXA",
      "Logo on event website",
    ],
  },
];

const STATS = [
  { value: "6", label: "Runway Shows" },
  { value: "90+", label: "Professional Models" },
  { value: "May 26–31", label: "Swim Week 2026" },
  { value: "Miami Beach", label: "The National Hotel" },
];

const FAQS = [
  {
    q: "Who attends Miami Swim Week?",
    a: "Buyers, press, fashion editors, influencers, models, photographers, and thousands of consumers passionate about swimwear, beauty, and lifestyle. It's one of the most high-energy fashion weeks in the US.",
  },
  {
    q: "What categories are a good fit for sponsoring?",
    a: "Any brand targeting fashion-forward, beauty-conscious, or health-focused consumers. Top performing categories: skincare, sunscreen, medspa, wellness/supplements, spirits, beverages, haircare, and beauty.",
  },
  {
    q: "Can I customize a package?",
    a: "Absolutely. If you have a specific activation in mind or want to mix elements across tiers, reach out and we'll put together a custom proposal.",
  },
  {
    q: "Do I need to be in Miami?",
    a: "For booth activations, yes — you or a brand rep should be present. For gift bag, media, and logo-only packages, we handle everything and ship your materials home.",
  },
  {
    q: "What's the deadline?",
    a: "Sponsorship slots are limited — especially Official Category Sponsor (only one per vertical) and the Presenting Sponsor (exclusive). We recommend reaching out as early as possible.",
  },
  {
    q: "How do we get started?",
    a: "Email nathan@examodels.com with your brand name and the package you're interested in. We'll send a sponsorship deck and get you set up.",
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

export default function SponsorMswPage() {
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
          <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-4 py-1.5 text-sm font-semibold tracking-wide">
            For Brands & Sponsors
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Sponsor EXA&apos;s Miami Swim Week
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-5 max-w-2xl leading-relaxed">
            Put your brand on the runway. Reach fashion, beauty & lifestyle consumers where they live.
          </p>
          <div className="flex flex-wrap gap-3 text-white/90">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-sm">{VENUE}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span className="font-medium text-sm">May 26–31, 2026</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <Users className="h-4 w-4 text-pink-400" />
              <span className="font-medium text-sm">6 Runway Shows</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 md:px-8 py-14">

        {/* Pitch */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20 px-4 py-1">
            Sponsorship Opportunity
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Put Your Brand on the Runway
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            EXA Models is producing 6 runway shows at Miami Swim Week 2026. We&apos;re inviting select brands to partner with us — from runway backdrop logos to full-week activations, gift bag placements, and official category exclusives.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-5 rounded-2xl bg-muted/30 border border-white/5">
              <p className="text-2xl md:text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sponsorship Packages */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Sponsorship Packages</h2>
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
              Our audience is fashion-forward, beauty-obsessed, and high-spend. These are the categories that consistently perform best at runway events like ours.
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {[
                { emoji: "☀️", category: "Sunscreen & SPF", desc: "Models and attendees live in the sun — SPF brands are a natural fit" },
                { emoji: "💆", category: "Skincare & Medspa", desc: "Backstage beauty partners get direct model and influencer exposure" },
                { emoji: "💇", category: "Haircare", desc: "Your product in every model's hair and in the gift bag" },
                { emoji: "🥂", category: "Spirits & Beverages", desc: "Cocktail hour sponsorships put your brand in every hand at the party" },
                { emoji: "💊", category: "Wellness & Supplements", desc: "Health-conscious models and buyers are your target demo" },
                { emoji: "💄", category: "Beauty & Makeup", desc: "Official beauty partners get the most backstage and content exposure" },
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

        {/* What's Included Breakdown */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">What Every Sponsor Gets</h2>
            <p className="text-muted-foreground">No matter which package you choose</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {[
              { icon: <Sparkles className="h-4 w-4 text-amber-400" />, title: "Access to 90+ Professional Models", desc: "All confirmed for Swim Week 2026 — your brand reaches real talent with real audiences", color: "border-amber-500/20 bg-amber-500/5" },
              { icon: <Camera className="h-4 w-4 text-sky-400" />, title: "Event Photography & Video Exposure", desc: "All sponsor logos and activations captured in official event photography", color: "border-sky-500/20 bg-sky-500/5" },
              { icon: <Megaphone className="h-4 w-4 text-pink-400" />, title: "EXA Social Media Reach", desc: "Featured across EXA's Instagram", color: "border-pink-500/20 bg-pink-500/5" },
              { icon: <Users className="h-4 w-4 text-violet-400" />, title: "VIP Crowd Access", desc: "Buyers, influencers, press, and fashion insiders — high-value, high-intent attendees", color: "border-violet-500/20 bg-violet-500/5" },
            ].map((item) => (
              <div key={item.title} className={`flex items-start gap-4 px-5 py-4 rounded-2xl border ${item.color}`}>
                <div className="p-2 rounded-xl bg-black/20 flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EXA TV Section */}
        <div className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20">
              <svg className="h-6 w-6 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">See Our Shows</h2>
              <p className="text-sm text-muted-foreground">Watch past EXA runway shows &amp; events</p>
            </div>
          </div>

          <Link
            href="https://examodels.com/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl overflow-hidden border border-violet-500/20 hover:border-violet-500/50 transition-all shadow-xl hover:shadow-violet-500/10"
          >
            <div className="relative aspect-video bg-black">
              <iframe
                src="https://www.youtube.com/embed/Iu68o0MCuvw?mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
                title="EXA TV — Past Runway Shows"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/25 transition-all shadow-2xl">
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-500/10 to-pink-500/10">
              <div>
                <p className="font-bold text-sm">Watch on EXA TV</p>
                <p className="text-xs text-muted-foreground mt-0.5">Past runway shows, backstage, and more</p>
              </div>
              <ArrowRight className="h-5 w-5 text-violet-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
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
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Sponsor?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Email us with your brand name and the package you&apos;re interested in. We&apos;ll send a sponsorship deck and get you set up fast.
          </p>
          <a
            href="mailto:nathan@examodels.com?subject=Miami%20Swim%20Week%202026%20Sponsorship&body=Hi%20Nathan%2C%0A%0AI'm%20interested%20in%20sponsoring%20Miami%20Swim%20Week%202026.%0A%0ABrand%3A%20%0AWebsite%3A%20%0APackage%20of%20interest%3A%20%0A%0ALooking%20forward%20to%20connecting."
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02]"
          >
            <Mail className="h-5 w-5" />
            nathan@examodels.com
            <ArrowRight className="h-4 w-4" />
          </a>
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
