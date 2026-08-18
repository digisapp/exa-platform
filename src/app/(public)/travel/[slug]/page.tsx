import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { TripApplyCard } from "@/components/travel/TripApplyCard";
import {
  MapPin,
  Calendar,
  Users,
  Plane,
  DollarSign,
  Clock,
  ArrowLeft,
  Gift,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

export const revalidate = 120;

interface Props {
  params: Promise<{ slug: string }>;
}

async function getTrip(slug: string) {
  const supabase = await createClient();
  const { data } = (await supabase
    .from("gigs")
    .select("*")
    .eq("slug", slug)
    .eq("type", "travel")
    .eq("visibility", "public")
    .single()) as { data: any };
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getTrip(slug);
  if (!trip) return { title: "Trip Not Found — EXA Travel" };

  const location = [trip.location_city, trip.location_state].filter(Boolean).join(", ");
  const description =
    trip.description?.slice(0, 160) ||
    `${trip.title} — an EXA Travel trip${location ? ` in ${location}` : ""}. Apply now on EXA Models.`;
  return {
    title: `${trip.title} — EXA Travel`,
    description,
    alternates: { canonical: `https://www.examodels.com/travel/${trip.slug}` },
    openGraph: {
      title: `${trip.title} — EXA Travel`,
      description,
      url: `https://www.examodels.com/travel/${trip.slug}`,
      type: "website",
      siteName: "EXA Models",
      ...(trip.cover_image_url ? { images: [{ url: trip.cover_image_url }] } : {}),
    },
    twitter: {
      card: trip.cover_image_url ? "summary_large_image" : "summary",
      title: `${trip.title} — EXA Travel`,
      description,
    },
  };
}

export default async function TripDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const trip = await getTrip(slug);
  if (!trip) notFound();

  // Viewer context
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let application: { id: string; status: string; confirmed_at: string | null } | null = null;

  if (user) {
    const { data: actor } = (await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single()) as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };
    actorType = actor?.type || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      // Service client: self-read includes coin_balance, not column-granted to client roles (Phase B2)
      const { data: model } = (await createServiceRoleClient()
        .from("models")
        .select("id, username, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single()) as { data: any };
      profileData = model;
      coinBalance = model?.coin_balance ?? 0;

      if (model?.id) {
        const { data: app } = (await supabase
          .from("gig_applications")
          .select("id, status, confirmed_at")
          .eq("gig_id", trip.id)
          .eq("model_id", model.id)
          .maybeSingle()) as { data: any };
        application = app || null;
      }
    } else if (actor?.type === "fan") {
      const { data } = (await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single()) as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const location = [trip.location_city, trip.location_state].filter(Boolean).join(", ");
  const spotsLeft = trip.spots ? Math.max(0, trip.spots - (trip.spots_filled || 0)) : null;
  const deadlinePassed = trip.application_deadline
    ? new Date(trip.application_deadline) < new Date()
    : false;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isModelViewer = actorType === "model" || actorType === "admin";

  const canApply = trip.status === "open" && !deadlinePassed && !isFull;
  const closedReason =
    trip.status === "upcoming"
      ? "Applications aren't open yet — check back soon"
      : trip.status === "cancelled"
        ? "This trip has been cancelled"
        : deadlinePassed
          ? "The application deadline has passed"
          : isFull
            ? "All spots are filled"
            : trip.status !== "open"
              ? "Applications are closed"
              : null;

  const compensationLabel =
    trip.compensation_type === "paid" && trip.compensation_amount > 0
      ? `$${(trip.compensation_amount / 100).toFixed(0)} per model`
      : trip.compensation_type === "revenue_share"
        ? "Revenue share"
        : "Hosted trip";

  const galleryImages: string[] = Array.isArray(trip.gallery_images)
    ? trip.gallery_images.filter((u: unknown) => typeof u === "string")
    : [];

  // gigs.requirements is a Json column — legacy rows hold {} — only render
  // when it's actual text (an object child would crash the React render).
  const requirementsText =
    typeof trip.requirements === "string" && trip.requirements.trim()
      ? trip.requirements
      : null;

  const displayName = profileData?.display_name || profileData?.username || undefined;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-dvh bg-background">
        <Navbar
          user={
            user
              ? {
                  id: user.id,
                  email: user.email || "",
                  avatar_url:
                    profileData?.profile_photo_url || profileData?.avatar_url || undefined,
                  name: displayName,
                  username: profileData?.username || undefined,
                }
              : undefined
          }
          actorType={actorType}
        />

        <main className="container px-4 md:px-8 lg:px-16 pt-4 md:pt-8 pb-16">
          {/* Back link */}
          <Link
            href="/travel"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            EXA Travel
          </Link>

          {/* ── HERO ── */}
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden mb-8">
            <div className="aspect-[16/9] md:aspect-[21/9] relative bg-gradient-to-br from-violet-500/20 via-pink-500/10 to-cyan-500/20">
              {trip.cover_image_url ? (
                <Image
                  src={trip.cover_image_url}
                  alt={trip.title}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plane className="h-24 w-24 text-white/10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            </div>

            <div className="absolute top-4 left-4 flex gap-2">
              {trip.status === "open" ? (
                <Badge className="bg-green-500/90 text-white border-0">
                  <Plane className="h-3 w-3 mr-1" />
                  Now Booking
                </Badge>
              ) : trip.status === "upcoming" ? (
                <Badge className="bg-violet-500/90 text-white border-0">
                  <Calendar className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              ) : (
                <Badge className="bg-zinc-600/90 text-white border-0 capitalize">{trip.status}</Badge>
              )}
              {canApply && spotsLeft !== null && spotsLeft <= 3 && (
                <Badge variant="destructive" className="animate-pulse">
                  {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                </Badge>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
              <h1 className="text-2xl md:text-5xl font-bold text-white drop-shadow-lg mb-2">
                {trip.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:text-base text-white/80">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-pink-400" />
                    {location}
                  </span>
                )}
                {trip.start_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-violet-400" />
                    {format(new Date(trip.start_at), "MMM d")}
                    {trip.end_at && ` – ${format(new Date(trip.end_at), "MMM d, yyyy")}`}
                    {!trip.end_at && `, ${format(new Date(trip.start_at), "yyyy")}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* Left: description + gallery */}
            <div className="space-y-8 min-w-0">
              {trip.description && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 text-white">About This Trip</h2>
                  <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                    {trip.description}
                  </div>
                </section>
              )}

              {requirementsText && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 text-white">Requirements</h2>
                  <div className="text-zinc-300 leading-relaxed whitespace-pre-line">
                    {requirementsText}
                  </div>
                </section>
              )}

              {galleryImages.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 text-white">Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {galleryImages.map((url, i) => (
                      <div key={i} className="aspect-square relative rounded-xl overflow-hidden bg-white/5">
                        <Image
                          src={url}
                          alt={`${trip.title} photo ${i + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right: apply card + facts */}
            <div className="space-y-4 lg:sticky lg:top-24 self-start">
              <TripApplyCard
                gigId={trip.id}
                gigSlug={trip.slug}
                isLoggedIn={!!user}
                isModel={isModelViewer}
                canApply={canApply}
                closedReason={closedReason}
                application={application}
              />

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-2">
                    {trip.compensation_type === "hosted" ? (
                      <Gift className="h-4 w-4 text-pink-400" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-green-400" />
                    )}
                    Compensation
                  </span>
                  <span className="font-medium text-white">{compensationLabel}</span>
                </div>
                {spotsLeft !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-400" />
                      Spots
                    </span>
                    <span className="font-medium text-white">
                      {spotsLeft} of {trip.spots} open
                    </span>
                  </div>
                )}
                {trip.application_deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      Apply by
                    </span>
                    <span className="font-medium text-white">
                      {format(new Date(trip.application_deadline), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {trip.require_id_verification && (
                  <div className="flex items-start gap-2 pt-1 text-xs text-white/50 border-t border-white/10 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                    <span>ID verification is required before a spot can be confirmed on this trip.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
