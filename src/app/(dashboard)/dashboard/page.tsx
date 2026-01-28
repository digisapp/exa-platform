import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";

// Admin client for bypassing RLS on specific queries
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Disable caching to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GigsFeed } from "@/components/gigs/GigsFeed";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Image as ImageIcon,
  Sparkles,
  Users,
  Building2,
  Clock,
  Calendar,
  Search,
  Mail,
  DollarSign,
  Crown,
  CheckCircle2,
  Megaphone,
  BarChart3,
  Circle,
  Heart,
} from "lucide-react";
import { ModelCard } from "@/components/models/model-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BRAND_SUBSCRIPTION_TIERS } from "@/lib/stripe-config";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get actor info to determine dashboard type
  const { data: actor } = await (supabase.from("actors") as any)
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor) redirect("/fan/signup");

  // For admins, redirect to admin dashboard
  if (actor.type === "admin") {
    redirect("/admin");
  }

  // For fans, show fan dashboard
  if (actor.type === "fan") {
    return <FanDashboard actorId={actor.id} />;
  }

  // For brands, show brand dashboard
  if (actor.type === "brand") {
    return <BrandDashboard actorId={actor.id} />;
  }

  // For models, get model data
  const { data: model } = await (supabase.from("models") as any)
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/fan/signup");

  // Get pending bookings for this model - use adminClient to bypass RLS
  // Filter by pending status in JS to avoid enum issues with 'counter'
  const { data: allBookings } = await (adminClient
    .from("bookings") as any)
    .select("*")
    .eq("model_id", model.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Filter for pending/counter bookings in JS
  const pendingBookings = (allBookings || []).filter(
    (b: any) => b.status === "pending" || b.status === "counter"
  ).slice(0, 5);


  // Enrich bookings with client info using batch queries (avoiding N+1)
  if (pendingBookings && pendingBookings.length > 0) {
    const clientIds: string[] = pendingBookings
      .map((b: any) => b.client_id as string | null)
      .filter((id: string | null): id is string => id !== null && id !== undefined);
    const uniqueClientIds = [...new Set(clientIds)];

    if (uniqueClientIds.length > 0) {
      // Batch fetch all client actors
      const { data: actors } = await (adminClient.from("actors") as any)
        .select("id, type")
        .in("id", uniqueClientIds);
      const actorsMap = new Map<string, { id: string; type: string }>((actors || []).map((a: any) => [a.id, a]));

      // Separate fan and brand IDs
      const fanIds = uniqueClientIds.filter(id => actorsMap.get(id)?.type === "fan");
      const brandIds = uniqueClientIds.filter(id => actorsMap.get(id)?.type === "brand");

      // Batch fetch fans and brands
      const [fansResult, brandsResult] = await Promise.all([
        fanIds.length > 0
          ? (adminClient.from("fans") as any).select("id, display_name, avatar_url").in("id", fanIds)
          : { data: [] },
        brandIds.length > 0
          ? (adminClient.from("brands") as any).select("id, company_name, logo_url").in("id", brandIds)
          : { data: [] },
      ]);

      const fansMap = new Map((fansResult.data || []).map((f: any) => [f.id, f]));
      const brandsMap = new Map((brandsResult.data || []).map((b: any) => [b.id, b]));

      // Map data back to bookings
      for (const booking of pendingBookings) {
        if (booking.client_id) {
          const clientActor = actorsMap.get(booking.client_id);
          if (clientActor?.type === "fan") {
            const fan = fansMap.get(booking.client_id);
            booking.client = fan ? { ...fan, type: "fan" } : null;
          } else if (clientActor?.type === "brand") {
            const brand = brandsMap.get(booking.client_id);
            booking.client = brand ? { ...brand, type: "brand" } : null;
          }
        }
      }
    }
  }

  // Get pending offers for this model - use adminClient to bypass RLS issues
  // User is already authenticated above, so this is safe
  const { data: offerResponses } = await (adminClient
    .from("offer_responses") as any)
    .select(`
      id,
      status,
      offer_id,
      offers (
        id,
        title,
        event_date,
        event_time,
        location_name,
        location_city,
        compensation_type,
        compensation_amount,
        compensation_description,
        created_at,
        brand_id
      )
    `)
    .eq("model_id", model.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  // Enrich with brand info using batch query (avoiding N+1)
  const pendingOffers: any[] = [];
  if (offerResponses && offerResponses.length > 0) {
    const brandIds = [...new Set(offerResponses.map((r: any) => r.offers?.brand_id).filter(Boolean))];

    if (brandIds.length > 0) {
      const { data: brands } = await (adminClient.from("brands") as any)
        .select("id, company_name, logo_url")
        .in("id", brandIds);
      const brandsMap = new Map((brands || []).map((b: any) => [b.id, b]));

      for (const response of offerResponses) {
        if (response.offers?.brand_id) {
          response.brand = brandsMap.get(response.offers.brand_id) || null;
          pendingOffers.push(response);
        }
      }
    }
  }

  // Get open gigs
  const { data: gigs } = await (supabase
    .from("gigs") as any)
    .select("id, slug, title, type, description, location_city, location_state, start_at, compensation_type, compensation_amount, spots, spots_filled")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("start_at", { ascending: true })
    .limit(5);

  // Get model's applications
  const { data: modelApplications } = await (supabase
    .from("gig_applications") as any)
    .select("gig_id, status")
    .eq("model_id", model.id);

  const displayName = model.first_name
    ? `${model.first_name} ${model.last_name || ''}`.trim()
    : model.username;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Offers */}
      {pendingOffers.length > 0 && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              New Offers
              <Badge className="bg-blue-500 text-white ml-2">{pendingOffers.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/offers" className="text-blue-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOffers.map((response: any) => {
                const offer = response.offers;
                if (!offer) return null;
                return (
                  <Link
                    key={response.id}
                    href={`/offers/${offer.id}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-muted/50 hover:bg-white dark:hover:bg-muted transition-colors border border-transparent hover:border-blue-500/30"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {response.brand?.logo_url ? (
                        <Image
                          src={response.brand.logo_url}
                          alt={response.brand.company_name || "Brand"}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{offer.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {response.brand?.company_name || "Brand"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {offer.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(offer.event_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {(offer.compensation_type === "paid" && offer.compensation_amount) ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-3 w-3" />
                            ${offer.compensation_amount}
                          </span>
                        ) : offer.compensation_description ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-3 w-3" />
                            {offer.compensation_description}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                      New
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings & Gigs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Bookings
              {(pendingBookings?.length || 0) > 0 && (
                <Badge className="bg-green-500 text-white ml-2">{pendingBookings?.length}</Badge>
              )}
              {/* Debug: model.id */}
              <span className="text-[10px] text-muted-foreground font-mono hidden">{model.id}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bookings" className="text-green-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(pendingBookings?.length || 0) > 0 ? (
              <div className="space-y-3">
                {pendingBookings?.map((booking: any) => (
                  <Link
                    key={booking.id}
                    href="/bookings"
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-green-500/30"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center overflow-hidden">
                      {booking.client?.avatar_url || booking.client?.logo_url ? (
                        <Image
                          src={booking.client.avatar_url || booking.client.logo_url}
                          alt="Client"
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {booking.client?.company_name || booking.client?.display_name || "Client"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {" • "}
                        {booking.total_amount?.toLocaleString()} coins
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">
                      {booking.status === "counter" ? "Counter" : "Pending"}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 rounded-full bg-green-500/10 inline-block mb-4">
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">No pending bookings</p>
                <p className="text-sm text-muted-foreground mt-1">Booking requests will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gigs */}
        <GigsFeed
          gigs={gigs || []}
          modelApplications={modelApplications || []}
          isApproved={model.is_approved}
        />
      </div>

    </div>
  );
}

// Fan Dashboard Component
async function FanDashboard({ actorId }: { actorId: string }) {
  const supabase = await createClient();

  // Query favorites and featured models in parallel
  const [{ data: follows }, { data: allFeaturedModels }] = await Promise.all([
    // Get followed models
    (supabase.from("follows") as any)
      .select(`
        created_at,
        following_id,
        actors!follows_following_id_fkey (
          user_id
        )
      `)
      .eq("follower_id", actorId)
      .order("created_at", { ascending: false })
      .limit(8),
    // Get featured models (only those with uploaded profile photos)
    // Exclude Instagram CDN URLs which are low quality
    // Fetch more models and rotate selection every 3 days
    (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, availability_status
      `)
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null)
      .not("profile_photo_url", "ilike", "%cdninstagram.com%")
      .not("profile_photo_url", "ilike", "%instagram%")
      .limit(100),
  ]);

  // Get the user_ids from the followed actors
  const followedUserIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];

  // Get the favorite model profiles
  let favoriteModels: any[] = [];
  if (followedUserIds.length > 0) {
    const { data: followedModels } = await (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, availability_status
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true);

    // Order models by the original follow order
    const modelsByUserId = new Map((followedModels || []).map((m: any) => [m.user_id, m]));
    favoriteModels = followedUserIds
      .map((userId: string) => modelsByUserId.get(userId))
      .filter(Boolean);
  }

  // Seeded shuffle to rotate featured models every 3 days
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const rotationPeriod = Math.floor(daysSinceEpoch / 3);

  function seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let currentSeed = seed;
    for (let i = result.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      const j = currentSeed % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const featuredModels = seededShuffle(allFeaturedModels || [], rotationPeriod).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Favorites */}
      {favoriteModels.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              Favorites
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/following" className="text-pink-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteModels.slice(0, 4).map((model: any) => (
                <ModelCard key={model.id} model={model} showFavorite={true} isFavorited={true} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            Models
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/models" className="text-pink-500">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {featuredModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredModels.map((model: any) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No models yet</p>
              <Button asChild size="sm" className="mt-3 bg-gradient-to-r from-pink-500 to-violet-500">
                <Link href="/models">
                  Browse Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Service type labels for bookings
const BRAND_SERVICE_LABELS: Record<string, string> = {
  photoshoot_hourly: "Photoshoot",
  photoshoot_half_day: "Photoshoot (Half-Day)",
  photoshoot_full_day: "Photoshoot (Full-Day)",
  promo: "Promo",
  brand_ambassador: "Brand Ambassador",
  private_event: "Private Event",
  social_companion: "Social Companion",
  meet_greet: "Meet & Greet",
  other: "Other",
};

// Brand Dashboard Component
async function BrandDashboard({ actorId }: { actorId: string }) {
  const supabase = await createClient();

  // Get brand data
  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("id", actorId)
    .single();

  const isApproved = brand?.is_verified === true;
  const isPending = brand?.is_verified !== true;

  // Parallel queries for dashboard data
  const [
    { data: campaignsList },
    { count: campaignCount },
    { data: offersData },
    { data: upcomingBookings },
    { data: topModels },
    { data: follows },
  ] = await Promise.all([
    // Active campaigns with model counts
    (supabase.from("campaigns") as any)
      .select(`*, campaign_models(id)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false })
      .limit(3),
    // Campaign count for stats
    (supabase.from("campaigns") as any)
      .select("*", { count: "exact", head: true })
      .eq("brand_id", actorId),
    // Offers with responses
    (supabase.from("offers") as any)
      .select(`*, offer_responses(id, status, model_id, responded_at)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false }),
    // Upcoming bookings (exclude cancelled)
    (supabase.from("bookings") as any)
      .select("id, event_date, service_type, status, model_id")
      .eq("client_id", actorId)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .neq("status", "cancelled")
      .order("event_date", { ascending: true })
      .limit(5),
    // Top models for discovery (full ModelCard fields)
    (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, availability_status
      `)
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null)
      .not("profile_photo_url", "ilike", "%cdninstagram.com%")
      .not("profile_photo_url", "ilike", "%instagram%")
      .gte("admin_rating", 4)
      .order("admin_rating", { ascending: false })
      .limit(8),
    // Favorite models
    (supabase.from("follows") as any)
      .select(`
        created_at,
        following_id,
        actors!follows_following_id_fkey (
          user_id
        )
      `)
      .eq("follower_id", actorId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  // Compute derived values
  const coinBalance = brand?.coin_balance || 0;
  const activeCampaignCount = campaignCount || 0;

  // Aggregate offer responses
  const allResponses = (offersData || []).flatMap((offer: any) =>
    (offer.offer_responses || []).map((r: any) => ({
      ...r,
      offer_title: offer.title,
      offer_id: offer.id,
    }))
  );
  const pendingResponseCount = allResponses.filter((r: any) => r.status === "pending").length;
  const upcomingEventCount = (upcomingBookings || []).length;

  // Recent responses (accepted/declined/confirmed, sorted by responded_at)
  const recentResponses = allResponses
    .filter((r: any) => r.status === "accepted" || r.status === "declined" || r.status === "confirmed")
    .sort((a: any, b: any) =>
      new Date(b.responded_at || b.created_at).getTime() - new Date(a.responded_at || a.created_at).getTime()
    )
    .slice(0, 5);

  // Campaign offer summary map
  const campaignOfferMap = new Map<string, { accepted: number; pending: number }>();
  (offersData || []).forEach((offer: any) => {
    if (!offer.campaign_id) return;
    const existing = campaignOfferMap.get(offer.campaign_id) || { accepted: 0, pending: 0 };
    (offer.offer_responses || []).forEach((r: any) => {
      if (r.status === "accepted" || r.status === "confirmed") existing.accepted++;
      else if (r.status === "pending") existing.pending++;
    });
    campaignOfferMap.set(offer.campaign_id, existing);
  });

  // Batch fetch model info for bookings + responses
  const bookingModelIds = (upcomingBookings || []).map((b: any) => b.model_id).filter(Boolean);
  const responseModelIds = recentResponses.map((r: any) => r.model_id).filter(Boolean);
  const allEnrichIds = [...new Set([...bookingModelIds, ...responseModelIds])];
  let enrichModels: any[] = [];
  if (allEnrichIds.length > 0) {
    const { data } = await (supabase.from("models") as any)
      .select("id, username, first_name, last_name, profile_photo_url")
      .in("id", allEnrichIds);
    enrichModels = data || [];
  }
  const enrichMap = new Map(enrichModels.map((m: any) => [m.id, m]));

  // Subscription tier info
  const currentTier = (brand?.subscription_tier || "free") as keyof typeof BRAND_SUBSCRIPTION_TIERS;
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[currentTier] || BRAND_SUBSCRIPTION_TIERS.free;
  const monthlyCoins = tierConfig.monthlyCoins;

  // Getting Started checks
  const hasProfile = !!brand?.logo_url;
  const hasCampaign = activeCampaignCount > 0;
  const hasSentOffer = (offersData || []).length > 0;
  const completedSteps = [hasProfile, hasCampaign, hasSentOffer].filter(Boolean).length;

  const discoverModels = topModels || [];

  // Get favorite model details
  const followedUserIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];
  let favoriteModels: any[] = [];
  if (followedUserIds.length > 0) {
    const { data: followedModels } = await (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, availability_status
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true);

    // Order models by the original follow order
    const modelsByUserId = new Map((followedModels || []).map((m: any) => [m.user_id, m]));
    favoriteModels = followedUserIds
      .map((userId: string) => modelsByUserId.get(userId))
      .filter(Boolean);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{brand?.company_name ? `, ${brand.company_name}` : ""}
        </h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your account</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-violet-500/10">
                <Megaphone className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Campaigns</p>
                <p className="text-2xl font-bold">{activeCampaignCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/10">
                <Mail className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Responses</p>
                <p className="text-2xl font-bold">{pendingResponseCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
                <p className="text-2xl font-bold">{upcomingEventCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approval Notice */}
      {isPending && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-500/20">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Application Under Review</h3>
                <p className="text-muted-foreground mt-1">
                  We&apos;re reviewing your brand application. You&apos;ll receive an email once approved.
                  In the meantime, feel free to browse our models!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started Checklist */}
      {completedSteps < 3 && (
        <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-500" />
                Getting Started
              </CardTitle>
              <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-600">
                {completedSteps}/3
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/settings"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {hasProfile ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium text-sm ${hasProfile ? "line-through text-muted-foreground" : ""}`}>
                    Complete your profile
                  </p>
                  <p className="text-xs text-muted-foreground">Add your logo and company details</p>
                </div>
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {hasCampaign ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium text-sm ${hasCampaign ? "line-through text-muted-foreground" : ""}`}>
                    Create a campaign
                  </p>
                  <p className="text-xs text-muted-foreground">Organize models into campaigns</p>
                </div>
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {hasSentOffer ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium text-sm ${hasSentOffer ? "line-through text-muted-foreground" : ""}`}>
                    Send your first offer
                  </p>
                  <p className="text-xs text-muted-foreground">Reach out to models with an offer</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Widget + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subscription Widget */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-full bg-violet-500/10">
                <Crown className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="font-semibold">{tierConfig.name} Plan</p>
                <Badge variant="outline" className="text-xs mt-0.5">
                  {isApproved ? "Active" : "Pending"}
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Coin Balance</span>
                  <span className="font-medium">
                    {coinBalance.toLocaleString()}{monthlyCoins > 0 ? ` / ${monthlyCoins.toLocaleString()}` : ""}
                  </span>
                </div>
                {monthlyCoins > 0 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((coinBalance / monthlyCoins) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              {currentTier !== "enterprise" && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/brands/subscription">Upgrade Plan</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <p className="font-semibold mb-4">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/models"
                className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-colors group"
              >
                <div className="p-2 rounded-full bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
                  <Search className="h-4 w-4 text-pink-500" />
                </div>
                <span className="font-medium text-sm">Browse Models</span>
              </Link>
              <Link
                href="/campaigns"
                className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 hover:border-violet-500/40 transition-colors group"
              >
                <div className="p-2 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                  <Megaphone className="h-4 w-4 text-violet-500" />
                </div>
                <span className="font-medium text-sm">Campaigns</span>
              </Link>
              <Link
                href="/brands/offers"
                className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-colors group"
              >
                <div className="p-2 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Mail className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-medium text-sm">View Offers</span>
              </Link>
              <Link
                href="/brands/analytics"
                className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-colors group"
              >
                <div className="p-2 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                </div>
                <span className="font-medium text-sm">Analytics</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns + Recent Responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-500" />
              Active Campaigns
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/campaigns" className="text-violet-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(campaignsList || []).length > 0 ? (
              <div className="space-y-3">
                {(campaignsList || []).map((campaign: any) => {
                  const modelCount = campaign.campaign_models?.length || 0;
                  const offerSummary = campaignOfferMap.get(campaign.id);
                  return (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: campaign.color || "#ec4899" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {modelCount} {modelCount === 1 ? "model" : "models"}
                          {offerSummary && (offerSummary.accepted > 0 || offerSummary.pending > 0) && (
                            <>
                              {" · "}
                              {offerSummary.accepted > 0 && (
                                <span className="text-green-500">{offerSummary.accepted} accepted</span>
                              )}
                              {offerSummary.accepted > 0 && offerSummary.pending > 0 && ", "}
                              {offerSummary.pending > 0 && (
                                <span className="text-amber-500">{offerSummary.pending} pending</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-violet-500/10 inline-block mb-3">
                  <Megaphone className="h-6 w-6 text-violet-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No campaigns yet</p>
                <Button asChild size="sm">
                  <Link href="/campaigns">Create Campaign</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Responses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Recent Responses
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/brands/offers" className="text-blue-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentResponses.length > 0 ? (
              <div className="space-y-3">
                {recentResponses.map((response: any) => {
                  const model = enrichMap.get(response.model_id);
                  const displayName = model?.first_name
                    ? `${model.first_name} ${model.last_name || ""}`.trim()
                    : model?.username || "Model";
                  return (
                    <div key={response.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={model?.profile_photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{response.offer_title}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          response.status === "accepted" || response.status === "confirmed"
                            ? "text-green-500 border-green-500/30 bg-green-500/5"
                            : "text-red-500 border-red-500/30 bg-red-500/5"
                        }
                      >
                        {response.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-blue-500/10 inline-block mb-3">
                  <Mail className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Responses to your offers will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            Upcoming Events
          </CardTitle>
          {upcomingEventCount > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bookings" className="text-green-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(upcomingBookings || []).length > 0 ? (
            <div className="space-y-3">
              {(upcomingBookings || []).map((booking: any) => {
                const model = enrichMap.get(booking.model_id);
                const displayName = model?.first_name
                  ? `${model.first_name} ${model.last_name || ""}`.trim()
                  : model?.username || "Model";
                return (
                  <div key={booking.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={model?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {model?.username ? (
                        <Link
                          href={`/${model.username}`}
                          className="font-medium text-sm hover:text-cyan-500 truncate block"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <p className="font-medium text-sm truncate">{displayName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {BRAND_SERVICE_LABELS[booking.service_type] || booking.service_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(booking.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-3 rounded-full bg-green-500/10 inline-block mb-3">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Favorites */}
      {favoriteModels.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              Favorites
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/following" className="text-pink-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteModels.slice(0, 4).map((model: any) => (
                <ModelCard key={model.id} model={model} showFavorite={true} isFavorited={true} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discover Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            Discover Models
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/models" className="text-cyan-500">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {discoverModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {discoverModels.slice(0, 8).map((model: any) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Explore our top models</p>
              <Button asChild className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                <Link href="/models">
                  <Users className="mr-2 h-4 w-4" />
                  Browse All Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
