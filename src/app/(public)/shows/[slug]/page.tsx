export const revalidate = 60; // Revalidate every 60 seconds

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { ModelsGrid } from "@/components/models/models-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  Ticket,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";
import { TicketCheckout } from "./ticket-checkout";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("name, description, meta_title, meta_description, cover_image_url")
    .eq("slug", slug)
    .single() as { data: any };

  if (!data) {
    return { title: "Show Not Found | EXA" };
  }

  return {
    title: data.meta_title || `${data.name} | EXA Models`,
    description: data.meta_description || data.description || `Join us at ${data.name}`,
    openGraph: {
      title: data.meta_title || `${data.name} | EXA Models`,
      description: data.meta_description || data.description || `Join us at ${data.name}`,
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref: rawRef } = await searchParams;
  // Sanitize ref to prevent XSS - affiliate codes should only be alphanumeric with underscores/hyphens
  const ref = rawRef?.replace(/[^a-zA-Z0-9_-]/g, '') || undefined;
  const supabase = await createClient();

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single() as { data: any };

  if (!event) {
    notFound();
  }

  // Fetch ticket tiers if internal tickets are enabled
  let ticketTiers: any[] = [];
  if (event.tickets_enabled) {
    const now = new Date();
    const { data: tiers } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    ticketTiers = (tiers || []).map((tier: any) => {
      const available = tier.quantity_available === null
        ? null
        : Math.max(0, tier.quantity_available - tier.quantity_sold);

      const isSaleActive =
        (!tier.sale_starts_at || new Date(tier.sale_starts_at) <= now) &&
        (!tier.sale_ends_at || new Date(tier.sale_ends_at) >= now);

      return {
        ...tier,
        available,
        isSoldOut: available === 0,
        isSaleActive,
      };
    });
  }

  const hasInternalTickets = event.tickets_enabled && ticketTiers.length > 0;

  // Get confirmed models via event badge
  // Each event has a linked badge - models with that badge are confirmed
  const { data: eventBadge } = await supabase
    .from("badges")
    .select("id")
    .eq("event_id", event.id)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .single() as { data: { id: string } | null };

  let eventModels: any[] = [];
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

  // If there's a referral code (ref), track the affiliate click
  let referringModel = null;
  if (ref) {
    const { data: model } = await supabase
      .from("models")
      .select("id, username, first_name, last_name")
      .eq("affiliate_code", ref)
      .single() as { data: any };

    if (model) {
      referringModel = model;
    }
  }

  // Get current user info for navbar
  const { data: { user } } = await supabase.auth.getUser();
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

  // Format dates
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const dateDisplay = startDate && endDate
    ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
    : startDate
      ? format(startDate, "MMMM d, yyyy")
      : "TBA";

  // Build ticket URL with affiliate tracking
  const ticketUrl = event.ticket_url
    ? ref
      ? `${event.ticket_url}${event.ticket_url.includes("?") ? "&" : "?"}ref=${ref}`
      : event.ticket_url
    : null;

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
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Hero Section with YouTube Video */}
        <div className="relative rounded-3xl overflow-hidden mb-8">
          <div className="aspect-video relative">
            <iframe
              src="https://www.youtube.com/embed/Iu68o0MCuvw?autoplay=1&mute=1&loop=1&playlist=Iu68o0MCuvw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
              title={event.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Event Info Overlay — desktop only */}
          <div className="hidden md:block absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
            <Badge className="mb-4 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-4 py-1.5 text-sm font-semibold">
              {event.short_name} {event.year}
            </Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              {event.name}
            </h1>
            <div className="flex flex-wrap gap-4 md:gap-6 text-white/90">
              {(event.location_city || event.location_state) && (
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  <MapPin className="h-5 w-5 text-pink-400" />
                  <span className="font-medium">
                    {event.location_city && event.location_state
                      ? `${event.location_city}, ${event.location_state}`
                      : event.location_city || event.location_state}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                <Calendar className="h-5 w-5 text-cyan-400" />
                <span className="font-medium">{dateDisplay}</span>
              </div>
              {eventModels.length > 0 && (
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Users className="h-5 w-5 text-violet-400" />
                  <span className="font-medium">{eventModels.length} Confirmed Models</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referral Banner */}
        {referringModel && (
          <Card className="mb-8 bg-gradient-to-r from-pink-500/10 to-violet-500/10 border-pink-500/20">
            <CardContent className="py-4">
              <p className="text-center text-sm">
                You were referred by{" "}
                <Link href={`/${referringModel.username}`} className="font-semibold text-pink-500 hover:underline">
                  {referringModel.first_name
                    ? `${referringModel.first_name} ${referringModel.last_name || ""}`.trim()
                    : referringModel.username}
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Shop Promo Banner — Swim Week only */}
        {slug === "miami-swim-week-2026" && (
          <Card className="mb-8 overflow-hidden bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border-pink-500/20">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <Badge className="mb-3 bg-pink-500">Miami Swim Week · May 26–31, 2026</Badge>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Wear the runway. Own the moment.</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Shop exclusive pieces direct from Miami Swim Week designers.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                    <Link href="/shop">
                      Shop the Collection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Description - always first */}
          <div className="lg:col-span-2 order-1">
            {event.description && (
              <div className="glass-card rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">🌴</span> About This Show
                </h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar - second on mobile, right column on desktop spanning both rows */}
          <div className="lg:col-span-1 order-2 lg:row-span-2">
            <div className="sticky top-24 space-y-4">
              {/* Ticket Button with Popup */}
              {hasInternalTickets ? (
                <TicketCheckout
                  tiers={ticketTiers}
                  eventName={event.name}
                  referringModelName={
                    referringModel
                      ? referringModel.first_name || referringModel.username
                      : undefined
                  }
                />
              ) : ticketUrl ? (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg py-6 rounded-xl shadow-lg shadow-pink-500/25"
                >
                  <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                    <Ticket className="h-6 w-6 mr-2" />
                    Get Tickets
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              ) : (
                <Button
                  disabled
                  size="lg"
                  className="w-full text-lg py-6 rounded-xl"
                >
                  <Ticket className="h-6 w-6 mr-2" />
                  Tickets Coming Soon
                </Button>
              )}

              {/* Shop Button — Swim Week only */}
              {slug === "miami-swim-week-2026" && (
                <Button asChild size="lg" variant="outline" className="w-full rounded-xl border-pink-500/40 hover:border-pink-500 hover:text-pink-500">
                  <Link href="/shop">
                    <ShoppingBag className="h-5 w-5 mr-2 text-pink-500" />
                    Shop Swim Week Designers
                  </Link>
                </Button>
              )}

              {/* Sponsor Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Sponsored By</h3>
                  <a
                    href="https://digis.cc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-white/10 hover:border-pink-500/30 transition-all hover:scale-[1.02]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">D</span>
                    </div>
                    <div>
                      <p className="font-semibold">Digis</p>
                      <p className="text-xs text-muted-foreground">digis.cc</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </a>
                </CardContent>
              </Card>
              {/* Designers Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Designers</h3>
                  <div className="flex items-center justify-center p-4 rounded-xl bg-muted/50 border border-dashed border-white/10">
                    <p className="text-sm text-muted-foreground">TBA</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Confirmed Models - third on mobile (after sidebar), left column on desktop */}
          {eventModels.length > 0 && (
            <div className="lg:col-span-2 order-3">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                  <Sparkles className="h-6 w-6 text-pink-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Confirmed Models</h2>
                  <p className="text-sm text-muted-foreground">{eventModels.length} models walking the runway</p>
                </div>
              </div>
              {user ? (
                <ModelsGrid
                  models={eventModels}
                  isLoggedIn={!!user}
                  favoriteModelIds={favoriteModelIds}
                  actorType={actorType}
                />
              ) : (
                <div className="relative">
                  {/* Show first row of models unblurred as a teaser */}
                  <ModelsGrid
                    models={eventModels.slice(0, 4)}
                    isLoggedIn={false}
                    favoriteModelIds={[]}
                    actorType={null}
                  />
                  {/* Blurred remaining models + overlay */}
                  {eventModels.length > 4 && (
                    <div className="relative mt-4 overflow-hidden rounded-2xl">
                      <div className="blur-lg pointer-events-none select-none" aria-hidden="true">
                        <ModelsGrid
                          models={eventModels.slice(4, 12)}
                          isLoggedIn={false}
                          favoriteModelIds={[]}
                          actorType={null}
                        />
                      </div>
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                        <Users className="h-10 w-10 text-pink-500 mb-3" />
                        <h3 className="text-xl font-bold mb-2">
                          +{eventModels.length - 4} More Confirmed Models
                        </h3>
                        <p className="text-muted-foreground mb-5 max-w-md">
                          Sign in to view all confirmed models for this show
                        </p>
                        <div className="flex gap-3">
                          <Button asChild variant="outline" className="rounded-xl">
                            <Link href="/signin">Sign In</Link>
                          </Button>
                          <Button asChild className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
                            <Link href="/signup">Sign Up Free</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Overlay for when there are 4 or fewer models */}
                  {eventModels.length <= 4 && (
                    <div className="mt-6 text-center p-6 rounded-2xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
                      <p className="text-muted-foreground mb-4">Sign in to follow models and get updates</p>
                      <div className="flex gap-3 justify-center">
                        <Button asChild variant="outline" className="rounded-xl">
                          <Link href="/signin">Sign In</Link>
                        </Button>
                        <Button asChild className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
                          <Link href="/signup">Sign Up Free</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Affiliate Tracking Script - ref is sanitized at top of component to alphanumeric/underscore/hyphen only */}
      {ref && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                fetch('/api/affiliate/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin',
                  body: JSON.stringify({
                    affiliateCode: ${JSON.stringify(ref)},
                    eventId: ${JSON.stringify(event.id)},
                    source: 'event_page'
                  })
                });
              })();
            `,
          }}
        />
      )}
    </div>
    </CoinBalanceProvider>
  );
}
