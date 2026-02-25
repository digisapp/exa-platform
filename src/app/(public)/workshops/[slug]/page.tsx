import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workshops
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cover Image / Flyer */}
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-pink-500/30 via-violet-500/30 to-cyan-500/30">
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
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge className="bg-red-500 text-white text-xl px-6 py-2 border-0">
                      Sold Out
                    </Badge>
                  </div>
                )}
              </div>

              {/* Title & Details */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{workshop.title}</h1>
                {workshop.subtitle && (
                  <p className="text-xl text-muted-foreground">{workshop.subtitle}</p>
                )}

                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(workshopDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  {workshop.start_time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(`2000-01-01T${workshop.start_time}`), "h:mm a")}
                        {workshop.end_time && ` - ${format(new Date(`2000-01-01T${workshop.end_time}`), "h:mm a")}`}
                      </span>
                    </div>
                  )}
                  {(workshop.location_city || workshop.location_state) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {workshop.location_city && workshop.location_state
                          ? `${workshop.location_city}, ${workshop.location_state}`
                          : workshop.location_city || workshop.location_state}
                      </span>
                    </div>
                  )}
                  {spotsLeft !== null && spotsLeft > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{spotsLeft} spots remaining</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {workshop.description && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-3">About This Workshop</h2>
                    <div className="prose prose-sm prose-invert max-w-none">
                      {workshop.description.split("\n").map((paragraph, i) => (
                        <p key={i} className="text-muted-foreground mb-3 last:mb-0">
                          {paragraph.startsWith("**") && paragraph.endsWith("**")
                            ? <strong className="text-pink-500">{paragraph.slice(2, -2)}</strong>
                            : paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Highlights */}
              {workshop.highlights && workshop.highlights.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-4">What You&apos;ll Learn</h2>
                    <ul className="space-y-3">
                      {workshop.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* What to Bring */}
              {workshop.what_to_bring && workshop.what_to_bring.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      What to Bring
                    </h2>
                    <ul className="space-y-2">
                      {workshop.what_to_bring.map((item, i) => (
                        <li key={i} className="flex items-center gap-3 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* 3-Month Coaching Program info (runway-workshop only) */}
              {coachingWorkshopId && (
                <CoachingProgramSection />
              )}

              {/* Gallery */}
              {workshop.gallery_media && workshop.gallery_media.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Gallery
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {workshop.gallery_media.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
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
      </div>
    </CoinBalanceProvider>
  );
}
