export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
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
} from "lucide-react";
import { CheckoutButtons } from "./checkout-buttons";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Partnerships — Miami Swim Week 2026 | EXA Models",
  description:
    "Book your brand's runway show at Miami Swim Week 2026 (May 26–31, Miami, FL). Choose from Opening Night, Day 2, Day 3, or Daytime Show packages with professional EXA Models talent.",
  openGraph: {
    title: "Brand Partnerships — Miami Swim Week 2026 | EXA Models",
    description:
      "Secure your runway show slot at Miami Swim Week 2026. Opening Night ($3,500), Day 2 ($2,500), Day 3 ($1,500), Daytime Show ($1,000). Pay in full or 3-month plan.",
  },
};

const PACKAGES = [
  {
    id: "opening-show" as const,
    name: "Opening Show",
    date: "May 26, 2026",
    price: 3500,
    installment: 1167,
    badge: "Most Prestigious",
    badgeGradient: "from-yellow-500 to-amber-500",
    borderColor: "border-yellow-500/30",
    highlight: true,
    features: [
      "Premier opening night runway show",
      "Maximum media & influencer coverage",
      "Priority placement in show lineup",
      "Professional photo & video documentation",
      "EXA Models talent coordination",
      "Access to full confirmed model roster",
    ],
  },
  {
    id: "day-2" as const,
    name: "Day 2 Show",
    date: "May 27, 2026",
    price: 2500,
    installment: 834,
    badge: null,
    badgeGradient: "",
    borderColor: "border-pink-500/20",
    highlight: false,
    features: [
      "Full runway show on Day 2",
      "Strong media & buyer attendance",
      "Show lineup placement",
      "Professional photo & video documentation",
      "EXA Models talent coordination",
      "Access to full confirmed model roster",
    ],
  },
  {
    id: "day-3" as const,
    name: "Day 3 Show",
    date: "May 28, 2026",
    price: 1500,
    installment: 500,
    badge: null,
    badgeGradient: "",
    borderColor: "border-pink-500/20",
    highlight: false,
    features: [
      "Full runway show on Day 3",
      "Closing weekend momentum",
      "Show lineup placement",
      "Professional photo & video documentation",
      "EXA Models talent coordination",
      "Access to full confirmed model roster",
    ],
  },
  {
    id: "daytime-show" as const,
    name: "Daytime Show",
    date: "Thursday, May 28",
    price: 1000,
    installment: 334,
    badge: "Best Value",
    badgeGradient: "from-cyan-500 to-teal-500",
    borderColor: "border-cyan-500/20",
    highlight: false,
    features: [
      "Boutique daytime runway showcase",
      "Intimate buyer & press audience",
      "Afternoon runway presentation",
      "Professional talent lineup",
      "EXA Models talent coordination",
      "Access to full confirmed model roster",
    ],
  },
];

const PERKS = [
  { icon: "🎬", title: "Media Coverage", body: "Industry press, influencers & buyers in attendance" },
  { icon: "📸", title: "Professional Models", body: "Curated roster of runway-ready talent" },
  { icon: "🏖️", title: "Miami Setting", body: "The world's premier swim & resort fashion event" },
];

const FAQS = [
  {
    q: "What's included with my show package?",
    a: "Each package includes EXA Models talent coordination, access to our confirmed model roster with measurements, professional runway presentation, and full photo & video documentation of your show.",
  },
  {
    q: "How does the 3-month payment plan work?",
    a: "Your cost is split into 3 equal monthly installments billed automatically to your card. Your show slot is fully secured from the moment your first payment clears.",
  },
  {
    q: "How many models walk in each show?",
    a: "The number of models depends on your collection size and show format. Our team will work with you after booking to determine the perfect lineup for your brand.",
  },
  {
    q: "Can I choose which models walk for my brand?",
    a: "Yes! Once booked, you'll receive access to our confirmed model profiles and measurements to select the perfect fit for your collection.",
  },
  {
    q: "What's the deadline to book?",
    a: "Show slots are limited and selling fast. We recommend booking as soon as possible to secure your preferred date.",
  },
];

export default async function MswBrandPage() {
  // Fetch confirmed models (same query as the main show page)
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
          <Badge className="mb-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-4 py-1.5 text-sm font-semibold tracking-wide">
            For Brands &amp; Designers
          </Badge>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Miami Swim Week 2026
          </h1>
          <p className="text-white/90 text-lg md:text-xl mb-5 max-w-2xl leading-relaxed">
            Book your runway show. Showcase your collection. Own the moment.
          </p>
          <div className="flex flex-wrap gap-3 text-white/90">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <MapPin className="h-4 w-4 text-pink-400" />
              <span className="font-medium text-sm">Miami, FL</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span className="font-medium text-sm">May 26–31, 2026</span>
            </div>
            {eventModels.length > 0 && (
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                <Users className="h-4 w-4 text-violet-400" />
                <span className="font-medium text-sm">{eventModels.length} Confirmed Models</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="container px-4 md:px-8 py-14">

        {/* Pitch Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="mb-4 bg-pink-500/10 text-pink-400 border-pink-500/20 px-4 py-1">
            Partnership Opportunity
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Put Your Brand on the Runway
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            EXA Models is producing runway shows at Miami Swim Week 2026, featuring our curated roster of professional talent. We&apos;re inviting select swimwear, resortwear, and lingerie brands to showcase their collections on our runway — in front of press, buyers, and influencers from around the world.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PERKS.map((item) => (
              <div
                key={item.title}
                className="text-center p-6 rounded-2xl bg-muted/30 border border-white/5"
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <p className="font-semibold mb-1">{item.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Show Packages */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Choose Your Show</h2>
            <p className="text-muted-foreground">
              Pay in full or split your investment over 3 months
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {PACKAGES.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative overflow-hidden border ${pkg.borderColor} ${
                  pkg.highlight ? "shadow-2xl shadow-yellow-500/10" : ""
                }`}
              >
                {pkg.badge && (
                  <div className="absolute top-5 right-5 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${pkg.badgeGradient} text-white shadow-md`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                )}
                <CardContent className="p-6 md:p-8">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                    {pkg.date}
                  </p>
                  <h3 className="text-2xl font-bold mb-5">{pkg.name}</h3>

                  <div className="space-y-3 mb-7">
                    {pkg.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                          <Check className="h-3 w-3 text-pink-400" />
                        </div>
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <CheckoutButtons
                    pkg={pkg.id}
                    fullPrice={pkg.price}
                    installmentPrice={pkg.installment}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Confirmed Models */}
        {eventModels.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                <Sparkles className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Confirmed Models</h2>
                <p className="text-sm text-muted-foreground">
                  {eventModels.length} professional models walking our runway
                </p>
              </div>
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={model.profile_photo_url}
                      alt={model.first_name || model.username}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map((item) => (
              <div
                key={item.q}
                className="p-5 rounded-xl bg-muted/30 border border-white/5"
              >
                <p className="font-semibold mb-2 flex items-start gap-2 text-sm">
                  <Star className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                  {item.q}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed pl-6">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center p-10 md:p-14 rounded-3xl bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10 border border-pink-500/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Questions? Let&apos;s Talk.</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Email our partnerships team directly for custom packages or any questions about Miami Swim Week 2026.
          </p>
          <a
            href="mailto:partnerships@examodels.com"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-pink-500/25 hover:scale-[1.02]"
          >
            <Mail className="h-5 w-5" />
            partnerships@examodels.com
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-5 text-sm text-muted-foreground">
            Or view the{" "}
            <Link href="/shows/miami-swim-week-2026" className="text-pink-400 hover:underline">
              Miami Swim Week show page
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
