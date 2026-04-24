export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { ModelsGrid } from "@/components/models/models-grid";
import { EventCountdown } from "@/app/(public)/shows/[slug]/event-countdown";
import { ShareButton } from "@/components/ui/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Instagram,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ApplyButton } from "@/components/gigs/ApplyButton";
import { TripApplicationForm } from "@/components/gigs/TripApplicationForm";
import { CreatorHousePaymentButton } from "@/components/gigs/CreatorHousePaymentButton";
import { MSW_2026_SCHEDULE } from "@/lib/msw-schedule";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("gigs")
    .select("title, description, cover_image_url")
    .eq("slug", slug)
    .single() as { data: { title: string; description: string | null; cover_image_url: string | null } | null };

  if (!data) {
    return { title: "Gig Not Found | EXA" };
  }

  return {
    title: `${data.title} | EXA Gigs`,
    description: data.description || `Apply for ${data.title} on EXA Models`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${data.title} | EXA Gigs`,
      description: data.description || `Apply for ${data.title} on EXA Models`,
      images: data.cover_image_url ? [{ url: data.cover_image_url }] : [],
    },
  };
}

export default async function GigDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get gig
  const { data: gig } = await supabase
    .from("gigs")
    .select("*")
    .eq("slug", slug)
    .single() as { data: any };

  if (!gig) {
    notFound();
  }

  // Check if user has already applied
  const { data: { user } } = await supabase.auth.getUser();
  let existingApplication: any = null;
  let modelId: string | null = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let favoriteModelIds: string[] = [];

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

      if (model) {
        modelId = model.id;
        const { data: app } = await supabase
          .from("gig_applications")
          .select("*, trip_number, spot_type, payment_status")
          .eq("gig_id", gig.id)
          .eq("model_id", model.id)
          .single() as { data: any };
        existingApplication = app;
      }
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }

    // Get favorites for logged-in user
    if (actor) {
      const { data: favorites } = await (supabase
        .from("follows") as any)
        .select("following_id, actor:actors!follows_following_id_fkey(user_id)")
        .eq("follower_id", actor.id) as { data: { following_id: string; actor: { user_id: string } | null }[] | null };

      if (favorites && favorites.length > 0) {
        const userIds = favorites
          .map((f) => f.actor?.user_id)
          .filter(Boolean) as string[];

        if (userIds.length > 0) {
          const { data: favModels } = await supabase
            .from("models")
            .select("id")
            .in("user_id", userIds);
          favoriteModelIds = favModels?.map((m: any) => m.id) || [];
        }
      }
    }
  }

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  const spotsLeft = gig.spots ? gig.spots - gig.spots_filled : null;
  const deadline = gig.application_deadline
    ? new Date(gig.application_deadline)
    : null;
  const isExpired = deadline && deadline < new Date();
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const canApply = gig.status === "open" && !isExpired && !isFull && !existingApplication;

  // Parse requirements
  const requirements = gig.requirements as Record<string, any> | null;

  // Format dates
  const startDate = gig.start_at ? new Date(gig.start_at) : null;
  const endDate = gig.end_at ? new Date(gig.end_at) : null;
  const dateDisplay = startDate && endDate
    ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
    : startDate
      ? format(startDate, "MMMM d, yyyy")
      : null;

  // Get confirmed models via linked event badge
  let eventModels: any[] = [];
  if (gig.event_id) {
    const { data: eventBadge } = await supabase
      .from("badges")
      .select("id")
      .eq("event_id", gig.event_id)
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
          .select("*")
          .in("id", modelIds)
          .not("profile_photo_url", "is", null);
        eventModels = fullModels || [];
      }
    }
  }

  const isMSW = slug === "miami-swim-week-2026";

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
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
      />

      <main className="container px-4 md:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/gigs"
          className="inline-flex items-center text-white/50 hover:text-pink-300 mb-6 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gigs
        </Link>

        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8">
          {gig.cover_image_url ? (
            <div className="aspect-[21/9] relative">
              <Image
                src={gig.cover_image_url}
                alt={gig.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            </div>
          ) : (
            <div className="aspect-[21/9] relative bg-gradient-to-br from-pink-500/20 via-violet-500/15 to-cyan-500/10" />
          )}

          {/* Share button */}
          <div className="absolute top-4 right-4 z-10">
            <ShareButton title={gig.title} url={`https://www.examodels.com/gigs/${slug}`} />
          </div>

          {/* Event Info Overlay — desktop */}
          <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
            <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/90 font-bold mb-2 drop-shadow-lg">
              {gig.type === "travel" ? "Travel Opportunity" : gig.type === "runway" ? "Runway Show" : "Model Gig"}
            </p>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              {gig.title}
            </h1>
            <div className="flex flex-wrap gap-3 text-white/90">
              {(gig.location_city || gig.location_state) && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  <span className="font-semibold text-sm">
                    {gig.location_name || `${gig.location_city}, ${gig.location_state}`}
                  </span>
                </div>
              )}
              {dateDisplay && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold text-sm">{dateDisplay}</span>
                </div>
              )}
              {spotsLeft !== null && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-violet-500/30 px-4 py-2 rounded-full shadow-[0_0_12px_rgba(167,139,250,0.2)]">
                  <Users className="h-4 w-4 text-violet-300" />
                  <span className="font-semibold text-sm">{spotsLeft} of {gig.spots} spots left</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile event info */}
        <div className="md:hidden mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/90 font-bold mb-1.5">
            {gig.type === "travel" ? "Travel Opportunity" : gig.type === "runway" ? "Runway Show" : "Model Gig"}
          </p>
          <h1 className="text-2xl font-bold text-white mb-3">{gig.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            {dateDisplay && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-semibold text-white">{dateDisplay}</span>
              </div>
            )}
            {(gig.location_city || gig.location_state) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <MapPin className="h-3.5 w-3.5 text-pink-400" />
                <span className="font-semibold text-white">
                  {gig.location_name || `${gig.location_city}, ${gig.location_state}`}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 order-1 space-y-6">
            {/* Description Card */}
            {(gig.description || gig.compensation_description) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
                {gig.description && (
                  <p className="text-lg md:text-xl font-medium text-white/90 mb-6 whitespace-pre-wrap leading-relaxed">
                    {gig.description}
                  </p>
                )}

                {/* Compensation highlight */}
                {gig.compensation_description && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-pink-300" />
                      <h3 className="font-semibold text-white text-sm">Cost</h3>
                    </div>
                    <p className="text-white/70 text-sm">{gig.compensation_description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Requirements Card */}
            {requirements && Object.keys(requirements).length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
                <h2 className="font-bold text-white text-lg mb-4">Requirements</h2>
                <ul className="space-y-3">
                  {requirements.min_followers && (
                    <li className="flex items-center gap-3 text-white/80">
                      <div className="p-1 rounded-full bg-green-500/15">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                      Minimum {requirements.min_followers.toLocaleString()} followers
                    </li>
                  )}
                  {requirements.locations && (
                    <li className="flex items-center gap-3 text-white/80">
                      <div className="p-1 rounded-full bg-green-500/15">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                      Based in: {requirements.locations.join(", ")}
                    </li>
                  )}
                  {requirements.height_range && (
                    <li className="flex items-center gap-3 text-white/80">
                      <div className="p-1 rounded-full bg-green-500/15">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                      Height: {requirements.height_range.min}&quot; - {requirements.height_range.max}&quot;
                    </li>
                  )}
                  {requirements.experience && (
                    <li className="flex items-center gap-3 text-white/80">
                      <div className="p-1 rounded-full bg-green-500/15">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </div>
                      {requirements.experience}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 order-2 lg:row-span-3">
            <div className="sticky top-24 space-y-4">
              {/* Countdown Timer */}
              {gig.start_at && new Date(gig.start_at) > new Date() && (
                <EventCountdown startsAt={gig.start_at} />
              )}

              {/* Happening Now indicator */}
              {gig.start_at && new Date(gig.start_at) <= new Date() && gig.end_at && new Date(gig.end_at) >= new Date() && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-emerald-300 font-bold text-sm">Happening Now</p>
                </div>
              )}

              {/* Apply Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 space-y-4">
                {existingApplication ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold mb-2">Application Status</p>
                      <Badge
                        variant={
                          existingApplication.status === "accepted" || existingApplication.status === "approved"
                            ? "default"
                            : existingApplication.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                        className={`capitalize ${
                          existingApplication.status === "accepted" || existingApplication.status === "approved"
                            ? "bg-green-500"
                            : ""
                        }`}
                      >
                        {existingApplication.status === "approved" ? "Confirmed" : existingApplication.status}
                      </Badge>
                      {existingApplication.payment_status === "paid" && (
                        <p className="text-xs text-green-400 mt-2">Payment received</p>
                      )}
                      {existingApplication.trip_number && (
                        <p className="text-xs text-white/50 mt-1">
                          Trip {existingApplication.trip_number}
                        </p>
                      )}
                    </div>

                    {gig.title?.toLowerCase().includes("creator house") &&
                     existingApplication.status === "accepted" &&
                     existingApplication.payment_status !== "paid" &&
                     modelId && (
                      <CreatorHousePaymentButton
                        applicationId={existingApplication.id}
                        gigId={gig.id}
                        modelId={modelId}
                      />
                    )}
                  </div>
                ) : gig.type === "travel" && canApply ? (
                  <TripApplicationForm
                    gigId={gig.id}
                    gigSlug={slug}
                    modelId={modelId}
                    isLoggedIn={!!user}
                  />
                ) : canApply ? (
                  <ApplyButton gigId={gig.id} modelId={modelId} />
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                    {!user ? (
                      <>
                        <p className="text-white/60 mb-3 text-sm">Sign in to apply for this gig</p>
                        <Button asChild className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl shadow-lg shadow-pink-500/25">
                          <Link href={`/signin?redirect=/gigs/${slug}`}>Sign In</Link>
                        </Button>
                      </>
                    ) : isExpired ? (
                      <p className="text-white/50">Applications closed</p>
                    ) : isFull ? (
                      <p className="text-white/50">All spots filled</p>
                    ) : (
                      <p className="text-white/50">Not accepting applications</p>
                    )}
                  </div>
                )}

                <Separator className="bg-white/10" />

                {/* Details */}
                <div className="space-y-3">
                  {gig.start_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        Date
                      </span>
                      <span className="font-medium text-white text-sm">
                        {format(new Date(gig.start_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  {deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-pink-300" />
                        Deadline
                      </span>
                      <span className={`font-medium text-sm ${isExpired ? "text-red-400" : "text-white"}`}>
                        {isExpired ? "Expired" : formatDistanceToNow(deadline, { addSuffix: true })}
                      </span>
                    </div>
                  )}
                  {spotsLeft !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-violet-300" />
                        Spots
                      </span>
                      <span className="font-medium text-white text-sm">
                        {spotsLeft} of {gig.spots} left
                      </span>
                    </div>
                  )}
                  {gig.compensation_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        Cost
                      </span>
                      <span className="font-medium capitalize text-sm">
                        {gig.compensation_type === "paid" && gig.compensation_amount > 0 ? (
                          <span className="text-green-400">
                            ${(gig.compensation_amount / 100).toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-white">{gig.compensation_type}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* MSW-specific: Designer & Sponsor CTAs */}
              {isMSW && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold px-1">Join the Show</p>
                  <Link href="/designers/miami-swim-week" className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 hover:border-violet-500/70 text-violet-200 font-semibold transition-all hover:shadow-[0_0_16px_rgba(167,139,250,0.3)]">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Designers — Show Collection
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </Link>
                  <Link href="/sponsors/miami-swim-week" className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 hover:border-cyan-500/70 text-cyan-200 font-semibold transition-all hover:shadow-[0_0_16px_rgba(34,211,238,0.3)]">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Sponsors — Partner With Us
                    </span>
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* MSW Schedule */}
          {isMSW && (
            <div className="lg:col-span-2 order-3" id="schedule">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30">
                    <Calendar className="h-5 w-5 text-pink-300" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    <span className="exa-gradient-text">EXA Shows Schedule</span>
                  </h2>
                </div>

                <div className="space-y-2">
                  {MSW_2026_SCHEDULE.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-start gap-4 p-3.5 rounded-xl transition-all ${
                        s.highlight
                          ? "border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent shadow-[0_0_14px_rgba(236,72,153,0.12)]"
                          : "bg-white/[0.03] border border-white/5"
                      }`}
                    >
                      <div className="text-center flex-shrink-0 w-14">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.dayShort}</p>
                        <p className={`text-xl font-bold leading-none ${s.highlight ? "text-pink-300" : "text-white"}`}>
                          {s.dateNum}
                        </p>
                      </div>
                      <div className="h-10 w-px bg-white/10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white mb-0.5">{s.title}</p>
                        <p className="text-xs text-white/55 leading-relaxed">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Confirmed Models */}
          {eventModels.length > 0 && (
            <div className="lg:col-span-2 order-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-pink-500/40 blur-lg opacity-50" />
                  <div className="relative p-2 rounded-xl bg-gradient-to-br from-pink-500/25 to-violet-500/25 ring-1 ring-pink-500/40">
                    <Sparkles className="h-6 w-6 text-pink-300" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold">The Lineup</p>
                  <h2 className="text-2xl font-bold text-white">
                    <span className="exa-gradient-text">Confirmed Models</span>
                  </h2>
                  <p className="text-sm text-white/60">{eventModels.length} models walking the runway</p>
                </div>
              </div>
              <ModelsGrid
                models={eventModels}
                isLoggedIn={!!user}
                favoriteModelIds={favoriteModelIds}
                actorType={actorType}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <div className="container px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/exa-logo-white.png" alt="EXA" width={80} height={32} className="h-8 w-auto" />
            <span className="text-sm text-white/50">One Platform. Models Worldwide.</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/examodels"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex items-center justify-center h-9 w-9 rounded-full bg-white/5 hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/40 text-white/60 hover:text-pink-300 hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-6">
          &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
        </p>
      </footer>
    </div>
    </CoinBalanceProvider>
  );
}
