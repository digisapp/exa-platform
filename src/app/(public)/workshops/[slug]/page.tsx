import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  CheckCircle,
  Briefcase,
  Camera,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";
import { WorkshopCheckout } from "./workshop-checkout";
import { CoachingProgramSection } from "./coaching-program-section";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Workshop {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  location_address: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  price_cents: number;
  original_price_cents: number | null;
  spots_available: number | null;
  spots_sold: number;
  highlights: string[] | null;
  what_to_bring: string[] | null;
  gallery_media: string[] | null;
  instructors: string[] | null;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await (supabase as any)
    .from("workshops")
    .select("title, description, meta_title, meta_description, cover_image_url")
    .eq("slug", slug)
    .single() as { data: Workshop | null };

  if (!data) {
    return { title: "Workshop Not Found | EXA" };
  }

  const title = data.meta_title || `${data.title} | EXA Models`;
  const description = data.meta_description || data.description || `Join us for ${data.title}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.examodels.com/workshops/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.examodels.com/workshops/${slug}`,
      type: "website",
      siteName: "EXA Models",
      images: data.cover_image_url ? [{ url: data.cover_image_url, width: 1200, height: 630, alt: data.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  };
}

export default async function WorkshopPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get workshop
  const { data: workshop } = await (supabase as any)
    .from("workshops")
    .select("*")
    .eq("slug", slug)
    .single() as { data: Workshop | null };

  if (!workshop) {
    notFound();
  }

  // Get current user info for navbar
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

  // Fetch coaching program if this is the runway-workshop page
  let coachingWorkshopId: string | null = null;
  if (slug === "runway-workshop") {
    const { data: coachingData } = await (supabase as any)
      .from("workshops")
      .select("id")
      .eq("slug", "3-month-runway-coaching")
      .single() as { data: { id: string } | null };
    coachingWorkshopId = coachingData?.id ?? null;
  }

  // Calculate availability
  const spotsLeft = workshop.spots_available
    ? workshop.spots_available - workshop.spots_sold
    : null;
  const isSoldOut = spotsLeft !== null && spotsLeft <= 0;
  const workshopDate = new Date(workshop.date);

  const workshopJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: workshop.title,
    description: workshop.description || `Join us for ${workshop.title} — a professional model training workshop by EXA Models.`,
    url: `https://www.examodels.com/workshops/${workshop.slug}`,
    ...(workshop.cover_image_url && { image: workshop.cover_image_url }),
    startDate: workshop.date,
    ...(workshop.start_time && { startDate: `${workshop.date}T${workshop.start_time}` }),
    ...(workshop.end_time && { endDate: `${workshop.date}T${workshop.end_time}` }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: workshop.location_name || `${workshop.location_city || "Miami"}, ${workshop.location_state || "FL"}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: workshop.location_address || undefined,
        addressLocality: workshop.location_city || "Miami",
        addressRegion: workshop.location_state || "FL",
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "EXA Models",
      url: "https://www.examodels.com",
    },
    offers: {
      "@type": "Offer",
      url: `https://www.examodels.com/workshops/${workshop.slug}`,
      price: (workshop.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: isSoldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  };

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(workshopJsonLd) }}
        />
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

        <main className="container px-4 md:px-8 py-8">
          {/* Back Link */}
          <Link
            href="/workshops"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 text-xs font-semibold text-white/70 hover:text-pink-300 transition-all mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Workshops
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cover Image / Flyer */}
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-br from-pink-500/30 via-violet-500/30 to-cyan-500/30">
                {workshop.cover_image_url ? (
                  <Image
                    src={workshop.cover_image_url}
                    alt={workshop.title}
                    width={800}
                    height={1000}
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="w-full h-auto"
                    priority
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center">
                    <span className="text-8xl">👠</span>
                  </div>
                )}
                {isSoldOut && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="px-6 py-2 rounded-full bg-rose-500 text-white text-xl font-bold shadow-[0_0_24px_rgba(244,63,94,0.6)]">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Details */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/90 font-bold mb-2">
                  Workshop
                </p>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
                  <span className="exa-gradient-text">{workshop.title}</span>
                </h1>
                {workshop.subtitle && (
                  <p className="text-xl text-white/70">{workshop.subtitle}</p>
                )}

                {/* Quick Info */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-pink-400" />
                    <span className="font-semibold text-white">{format(workshopDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  {workshop.start_time && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-semibold text-white">
                        {format(new Date(`2000-01-01T${workshop.start_time}`), "h:mm a")}
                        {workshop.end_time && ` - ${format(new Date(`2000-01-01T${workshop.end_time}`), "h:mm a")}`}
                      </span>
                    </div>
                  )}
                  {(workshop.location_city || workshop.location_state) && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-violet-400" />
                      <span className="font-semibold text-white">
                        {workshop.location_city && workshop.location_state
                          ? `${workshop.location_city}, ${workshop.location_state}`
                          : workshop.location_city || workshop.location_state}
                      </span>
                    </div>
                  )}
                  {spotsLeft !== null && spotsLeft > 0 && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
                      spotsLeft <= 5
                        ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : "bg-white/5 border-white/10"
                    }`}>
                      <Users className={`h-3.5 w-3.5 ${spotsLeft <= 5 ? "text-amber-300" : "text-emerald-400"}`} />
                      <span className={`font-semibold ${spotsLeft <= 5 ? "text-amber-200" : "text-white"}`}>
                        {spotsLeft <= 5 ? `Only ${spotsLeft} spots left!` : `${spotsLeft} spots remaining`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {workshop.description && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold mb-3">
                    About this workshop
                  </p>
                  <div className="prose prose-sm prose-invert max-w-none">
                    {workshop.description.split("\n").map((paragraph, i) => (
                      <p key={i} className="text-white/70 mb-3 last:mb-0 leading-relaxed">
                        {paragraph.startsWith("**") && paragraph.endsWith("**")
                          ? <strong className="text-pink-300">{paragraph.slice(2, -2)}</strong>
                          : paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlights */}
              {workshop.highlights && workshop.highlights.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 to-emerald-500/3 backdrop-blur-sm p-6">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-4">
                    What you&apos;ll learn
                  </p>
                  <ul className="space-y-3">
                    {workshop.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-white/80">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What to Bring */}
              {workshop.what_to_bring && workshop.what_to_bring.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6">
                  <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-white">
                    <div className="p-1.5 rounded-lg bg-pink-500/15 ring-1 ring-pink-500/30">
                      <Briefcase className="h-4 w-4 text-pink-300" />
                    </div>
                    What to Bring
                  </h2>
                  <ul className="space-y-2">
                    {workshop.what_to_bring.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-white/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.7)] shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3-Month Coaching Program info (runway-workshop only) */}
              {coachingWorkshopId && (
                <CoachingProgramSection />
              )}

              {/* Gallery */}
              {workshop.gallery_media && workshop.gallery_media.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold mb-2">
                    Memories
                  </p>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                    <div className="p-1.5 rounded-lg bg-violet-500/15 ring-1 ring-violet-500/30">
                      <Camera className="h-4 w-4 text-violet-300" />
                    </div>
                    Gallery
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {workshop.gallery_media.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5 group hover:ring-pink-500/40 hover:shadow-[0_0_16px_rgba(236,72,153,0.3)] transition-all">
                        {url.match(/\.(mp4|mov)$/i) ? (
                          <video
                            src={url}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={url}
                            alt={`${workshop.title} gallery ${i + 1}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Checkout */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <WorkshopCheckout
                  workshop={{
                    id: workshop.id,
                    title: workshop.title,
                    priceCents: workshop.price_cents,
                    originalPriceCents: workshop.original_price_cents,
                    spotsLeft: spotsLeft,
                    isSoldOut: isSoldOut,
                  }}
                  coachingWorkshopId={coachingWorkshopId}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
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
