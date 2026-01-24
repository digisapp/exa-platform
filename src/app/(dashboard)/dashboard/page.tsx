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
  Trophy,
  ArrowRight,
  Lock,
  Coins,
  Heart,
  Image as ImageIcon,
  Activity,
  Sparkles,
  Users,
  MessageCircle,
  MapPin,
  TrendingUp,
  Building2,
  Clock,
  Calendar,
  Star,
  Search,
  Briefcase,
  Mail,
  DollarSign,
  FolderHeart,
} from "lucide-react";

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
    <div className="max-w-5xl mx-auto space-y-6">
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

  // Get approved models for enriching content
  const { data: allModels } = await (supabase
    .from("models") as any)
    .select("id, username, first_name, last_name, profile_photo_url")
    .eq("is_approved", true);

  const modelsMap = new Map((allModels || []).map((m: any) => [m.id, m]));

  // Get portfolio content from all approved models for discovery feed
  const { data: portfolioContent } = await (supabase
    .from("media_assets") as any)
    .select("id, url, media_type, title, created_at, model_id")
    .eq("visibility", "public")
    .eq("media_type", "image")
    .order("created_at", { ascending: false })
    .limit(12);

  // Enrich content with model info, filter to only models that are approved
  const discoveryContent = (portfolioContent || [])
    .map((c: any) => ({
      ...c,
      model: modelsMap.get(c.model_id) || null
    }))
    .filter((c: any) => c.model !== null);

  // Get featured models for the models section (only those with uploaded profile photos)
  // Exclude Instagram CDN URLs which are low quality
  // Fetch more models and rotate selection every 3 days
  const { data: allFeaturedModels } = await (supabase
    .from("models") as any)
    .select("id, username, first_name, last_name, profile_photo_url, city, state, show_location")
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null)
    .not("profile_photo_url", "ilike", "%cdninstagram.com%")
    .not("profile_photo_url", "ilike", "%instagram%")
    .limit(100);

  // Seeded shuffle to rotate featured models every 3 days
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const rotationPeriod = Math.floor(daysSinceEpoch / 3); // Changes every 3 days

  function seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let currentSeed = seed;
    for (let i = result.length - 1; i > 0; i--) {
      // Simple seeded random using linear congruential generator
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      const j = currentSeed % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const featuredModels = seededShuffle(allFeaturedModels || [], rotationPeriod).slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Visual Discovery Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-violet-500" />
            Discover
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/models" className="text-pink-500">
              View All Models
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {discoveryContent.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {discoveryContent.map((content: any) => (
                <Link
                  key={content.id}
                  href={`/${content.model?.username}`}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-violet-500/20 to-pink-500/20"
                >
                  {content.url && (
                    <Image
                      src={content.url}
                      alt={content.title || "Content"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">
                      {content.model?.first_name || content.model?.username}
                    </p>
                    <p className="text-white/70 text-xs truncate">@{content.model?.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No content yet</p>
              <Button asChild size="sm" className="mt-3 bg-gradient-to-r from-pink-500 to-violet-500">
                <Link href="/models">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Browse Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            Featured Models
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/models" className="text-pink-500">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {(featuredModels || []).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(featuredModels || []).slice(0, 8).map((model: any) => {
                const modelDisplayName = model.first_name
                  ? `${model.first_name} ${model.last_name || ''}`.trim()
                  : model.username;
                return (
                  <Link
                    key={model.id}
                    href={`/${model.username}`}
                    className="group"
                  >
                    <div className="rounded-xl p-3 border bg-card hover:shadow-lg transition-all hover:border-pink-500/50">
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                        {model.profile_photo_url ? (
                          <Image
                            src={model.profile_photo_url}
                            alt={modelDisplayName}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform"
                            unoptimized={model.profile_photo_url.includes('cdninstagram.com')}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl">👤</span>
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{modelDisplayName}</p>
                      <p className="text-xs text-pink-500">@{model.username}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-muted inline-block mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No models yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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

  // Get user's saved/favorited models
  const { data: favorites } = await (supabase
    .from("follows") as any)
    .select("following_id, created_at")
    .eq("follower_id", actorId)
    .order("created_at", { ascending: false })
    .limit(10);

  const favoriteIds = favorites?.map((f: any) => f.following_id) || [];

  // Get the model profiles for favorited users
  let savedModels: any[] = [];
  if (favoriteIds.length > 0) {
    const { data: actorData } = await (supabase
      .from("actors") as any)
      .select("id, user_id")
      .in("id", favoriteIds)
      .eq("type", "model");

    if (actorData && actorData.length > 0) {
      const userIds = actorData.map((a: any) => a.user_id);
      const { data: models } = await (supabase
        .from("models") as any)
        .select(`
          id, username, first_name, last_name, profile_photo_url, city, state, show_location, user_id,
          photoshoot_hourly_rate, promo_hourly_rate, brand_ambassador_daily_rate
        `)
        .in("user_id", userIds)
        .eq("is_approved", true);
      savedModels = models || [];
    }
  }

  // Get top rated models for discovery (only those with uploaded profile photos)
  // Exclude Instagram CDN URLs which are low quality
  const { data: topModels } = await (supabase
    .from("models") as any)
    .select(`
      id, username, first_name, last_name, profile_photo_url, city, state, show_location, user_id, admin_rating,
      photoshoot_hourly_rate, promo_hourly_rate, brand_ambassador_daily_rate
    `)
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null)
    .not("profile_photo_url", "ilike", "%cdninstagram.com%")
    .not("profile_photo_url", "ilike", "%instagram%")
    .gte("admin_rating", 4)
    .order("admin_rating", { ascending: false })
    .limit(8);

  // Filter out already saved models
  const savedUserIds = savedModels.map(m => m.user_id);
  const discoverModels = (topModels || []).filter(
    (m: any) => !savedUserIds.includes(m.user_id)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-colors max-w-sm">
        <CardContent className="py-3 px-4">
          <Link href="/bookings" className="flex items-center gap-3 group">
            <div className="p-2 rounded-full bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <Briefcase className="h-5 w-5 text-green-500" />
            </div>
            <p className="font-semibold group-hover:text-green-500 transition-colors flex-1">Bookings</p>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-500 transition-colors" />
          </Link>
        </CardContent>
      </Card>

      {/* Favorite Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
            Following
          </CardTitle>
          {savedModels.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/following" className="text-pink-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {savedModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {savedModels.map((model: any) => {
                const displayName = model.first_name
                  ? `${model.first_name} ${model.last_name || ''}`.trim()
                  : model.username;
                // Get rate display - prefer hourly, fallback to daily
                const hourlyRates = [
                  model.photoshoot_hourly_rate,
                  model.promo_hourly_rate,
                ].filter((r): r is number => r != null && r > 0);
                const lowestHourly = hourlyRates.length > 0 ? Math.min(...hourlyRates) : null;
                const dailyRate = model.brand_ambassador_daily_rate > 0 ? model.brand_ambassador_daily_rate : null;
                return (
                  <Link
                    key={model.id}
                    href={`/${model.username}`}
                    className="group"
                  >
                    <div className="rounded-xl p-3 border bg-card hover:shadow-lg transition-all hover:border-cyan-500/50">
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                        {model.profile_photo_url ? (
                          <Image
                            src={model.profile_photo_url}
                            alt={displayName}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform"
                            unoptimized={model.profile_photo_url.includes('cdninstagram.com')}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl">👤</span>
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm truncate">{displayName}</p>
                      <p className="text-xs text-cyan-500">@{model.username}</p>
                      {lowestHourly !== null ? (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          From {lowestHourly} <Coins className="h-3 w-3" />/hr
                        </p>
                      ) : dailyRate !== null ? (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          From {dailyRate} <Coins className="h-3 w-3" />/day
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 inline-block mb-4">
                <Star className="h-8 w-8 text-cyan-500" />
              </div>
              <h3 className="font-semibold mb-2">No saved models yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Save models you&apos;re interested in booking</p>
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                <Link href="/models">
                  <Search className="mr-2 h-4 w-4" />
                  Find Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discover Models */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            Models
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discoverModels.slice(0, 4).map((model: any) => {
                const displayName = model.first_name
                  ? `${model.first_name} ${model.last_name || ''}`.trim()
                  : model.username;
                // Get rate display - prefer hourly, fallback to daily
                const hourlyRates = [
                  model.photoshoot_hourly_rate,
                  model.promo_hourly_rate,
                ].filter((r): r is number => r != null && r > 0);
                const lowestHourly = hourlyRates.length > 0 ? Math.min(...hourlyRates) : null;
                const dailyRate = model.brand_ambassador_daily_rate > 0 ? model.brand_ambassador_daily_rate : null;
                return (
                  <Link
                    key={model.id}
                    href={`/${model.username}`}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-cyan-500/30"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex-shrink-0">
                      {model.profile_photo_url ? (
                        <Image
                          src={model.profile_photo_url}
                          alt={displayName}
                          fill
                          className="object-cover"
                          unoptimized={model.profile_photo_url.includes('cdninstagram.com')}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{displayName}</p>
                      <p className="text-sm text-cyan-500">@{model.username}</p>
                      {model.show_location && (model.city || model.state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {lowestHourly !== null ? (
                        <p className="text-sm font-medium text-cyan-500 flex items-center gap-1">{lowestHourly} <Coins className="h-3 w-3" />/hr</p>
                      ) : dailyRate !== null ? (
                        <p className="text-sm font-medium text-cyan-500 flex items-center gap-1">{dailyRate} <Coins className="h-3 w-3" />/day</p>
                      ) : null}
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                    </div>
                  </Link>
                );
              })}
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
