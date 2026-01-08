import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  Users,
  Ticket,
  ArrowLeft,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

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
    return { title: "Event Not Found | EXA" };
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
  const { ref } = await searchParams;
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

  // Get confirmed models for this event
  const { data: confirmedModels } = await supabase
    .from("gig_applications")
    .select(`
      model_id,
      reviewed_at,
      models!inner (
        id,
        username,
        first_name,
        last_name,
        profile_photo_url,
        city,
        state,
        affiliate_code
      ),
      gigs!inner (
        event_id
      )
    `)
    .eq("status", "accepted")
    .eq("gigs.event_id", event.id) as { data: any[] | null };

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

  // Unique models (dedupe by id)
  const uniqueModels = confirmedModels
    ? Array.from(new Map(confirmedModels.map((m: any) => [m.models.id, m.models])).values())
    : [];

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

      <main className="container px-4 md:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden mb-8">
          {event.cover_image_url ? (
            <div className="aspect-[21/9] relative">
              <img
                src={event.cover_image_url}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>
          ) : (
            <div className="aspect-[21/9] bg-gradient-to-br from-pink-500/30 via-violet-500/30 to-cyan-500/30" />
          )}

          {/* Event Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <Badge className="mb-3 bg-pink-500/80 text-white border-0">
              {event.short_name} {event.year}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {event.name}
            </h1>
            <div className="flex flex-wrap gap-4 text-white/90">
              {(event.location_city || event.location_state) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>
                    {event.location_city && event.location_state
                      ? `${event.location_city}, ${event.location_state}`
                      : event.location_city || event.location_state}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{dateDisplay}</span>
              </div>
              {uniqueModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{uniqueModels.length} Confirmed Models</span>
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {event.description && (
              <div>
                <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Confirmed Models */}
            {uniqueModels.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Confirmed Models</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uniqueModels.map((model: any) => (
                    <Link
                      key={model.id}
                      href={`/${model.username}`}
                      className="group"
                    >
                      <Card className="overflow-hidden transition-all group-hover:ring-2 group-hover:ring-pink-500/50 group-hover:shadow-lg group-hover:shadow-pink-500/10">
                        <div className="aspect-square relative bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                          {model.profile_photo_url ? (
                            <img
                              src={model.profile_photo_url}
                              alt={model.first_name || model.username}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              👤
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium truncate">
                            {model.first_name
                              ? `${model.first_name} ${model.last_name || ""}`.trim()
                              : model.username}
                          </p>
                          {model.city && model.state && (
                            <p className="text-xs text-muted-foreground truncate">
                              {model.city}, {model.state}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Ticket Card */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-6 text-white text-center">
                  <Ticket className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="text-xl font-bold mb-1">Get Tickets</h3>
                  <p className="text-white/80 text-sm">
                    Don&apos;t miss this amazing event
                  </p>
                </div>
                <CardContent className="p-6 space-y-4">
                  {event.ticket_price_cents && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Starting from</p>
                      <p className="text-3xl font-bold">
                        ${(event.ticket_price_cents / 100).toFixed(0)}
                      </p>
                    </div>
                  )}

                  {ticketUrl ? (
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                      size="lg"
                    >
                      <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                        <Ticket className="h-5 w-5 mr-2" />
                        Buy Tickets
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full"
                      size="lg"
                    >
                      Tickets Coming Soon
                    </Button>
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    {referringModel
                      ? `Your purchase supports ${referringModel.first_name || referringModel.username}!`
                      : "Support your favorite models by using their referral link"}
                  </p>
                </CardContent>
              </Card>

              {/* Event Details Card */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold">Event Details</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Dates
                      </span>
                      <span className="font-medium">{dateDisplay}</span>
                    </div>

                    {(event.location_city || event.location_state) && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </span>
                        <span className="font-medium">
                          {event.location_city && event.location_state
                            ? `${event.location_city}, ${event.location_state}`
                            : event.location_city || event.location_state}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Points
                      </span>
                      <span className="font-medium text-pink-500">
                        +{event.points_awarded} for walking
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Confirmed
                      </span>
                      <span className="font-medium">
                        {uniqueModels.length} models
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Affiliate Tracking Script */}
      {ref && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                fetch('/api/affiliate/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    affiliateCode: '${ref}',
                    eventId: '${event.id}',
                    source: 'event_page'
                  })
                });
              })();
            `,
          }}
        />
      )}
    </div>
  );
}
