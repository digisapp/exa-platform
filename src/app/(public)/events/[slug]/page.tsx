import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
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
  Instagram,
  Sparkles,
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

  // Get confirmed models for this event
  // First, get gigs linked to this event (by event_id or by title match)
  const { data: eventGigs } = await supabase
    .from("gigs")
    .select("id")
    .or(`event_id.eq.${event.id},title.ilike.%${event.short_name || event.name}%`) as { data: { id: string }[] | null };

  const gigIds = eventGigs?.map(g => g.id) || [];

  // Then get accepted applications for those gigs
  const { data: confirmedModels } = gigIds.length > 0
    ? await supabase
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
            affiliate_code,
            instagram_name,
            instagram_followers,
            height,
            focus_tags,
            is_verified,
            is_featured
          )
        `)
        .eq("status", "accepted")
        .in("gig_id", gigIds) as { data: any[] | null }
    : { data: null };

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

          {/* Event Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 pointer-events-none">
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
              {uniqueModels.length > 0 && (
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Users className="h-5 w-5 text-violet-400" />
                  <span className="font-medium">{uniqueModels.length} Confirmed Models</span>
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
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            {event.description && (
              <div className="glass-card rounded-2xl p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">🌴</span> About This Event
                </h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-lg">
                  {event.description}
                </p>
              </div>
            )}

            {/* Confirmed Models */}
            {uniqueModels.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                    <Sparkles className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Confirmed Models</h2>
                    <p className="text-sm text-muted-foreground">{uniqueModels.length} models walking the runway</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uniqueModels.map((model: any) => {
                    const displayName = model.first_name || model.username;
                    const focusLabels: Record<string, string> = {
                      fashion: "Fashion", commercial: "Commercial", fitness: "Fitness", athlete: "Athlete",
                      swimwear: "Swimwear", beauty: "Beauty", editorial: "Editorial",
                      ecommerce: "E-Comm", promo: "Promo", luxury: "Luxury", lifestyle: "Lifestyle"
                    };

                    return (
                      <Link
                        key={model.id}
                        href={`/${model.username}`}
                        className="group"
                      >
                        <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full">
                          {/* Image with Hover Overlay */}
                          <div className="aspect-[3/4] relative bg-gradient-to-br from-[#FF69B4]/20 to-[#9400D3]/20 overflow-hidden">
                            {model.profile_photo_url ? (
                              <Image
                                src={model.profile_photo_url}
                                alt={displayName}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                unoptimized={model.profile_photo_url.includes('cdninstagram.com')}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-6xl">👤</span>
                              </div>
                            )}

                            {/* Level Badge */}
                            {(model.is_verified || model.is_featured) && (
                              <div className="absolute top-3 right-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  model.is_verified ? "level-verified" : "level-pro"
                                }`}>
                                  {model.is_verified ? "✓ Verified" : "⭐ Featured"}
                                </span>
                              </div>
                            )}

                            {/* Bottom Name Bar - Always Visible */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8">
                              <h3 className="font-semibold text-white truncate">{displayName}</h3>
                              <p className="text-sm text-[#00BFFF]">@{model.username}</p>
                            </div>

                            {/* Hover Overlay with Details */}
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
                              <div className="space-y-2">
                                <h3 className="font-semibold text-white text-lg">{displayName}</h3>
                                <p className="text-sm text-[#00BFFF]">@{model.username}</p>

                                {(model.city || model.state) && (
                                  <div className="flex items-center gap-1 text-sm text-white/80">
                                    <MapPin className="h-3.5 w-3.5 text-[#FF69B4]" />
                                    {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                                  </div>
                                )}

                                {model.instagram_name && (
                                  <div className="flex items-center gap-1 text-sm text-white/80">
                                    <Instagram className="h-3.5 w-3.5" />
                                    @{model.instagram_name}
                                    {model.instagram_followers && (
                                      <span className="text-white/60 ml-1">
                                        ({(model.instagram_followers / 1000).toFixed(1)}K)
                                      </span>
                                    )}
                                  </div>
                                )}

                                {model.height && (
                                  <p className="text-sm text-white/80">{model.height}</p>
                                )}

                                {/* Focus Tags */}
                                {model.focus_tags && model.focus_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {model.focus_tags.slice(0, 3).map((tag: string) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-pink-500/30 to-violet-500/30 text-white border border-white/20"
                                      >
                                        {focusLabels[tag] || tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
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
                  credentials: 'same-origin',
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
    </CoinBalanceProvider>
  );
}
