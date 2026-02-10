import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModelCard } from "@/components/models/model-card";
import { BRAND_SUBSCRIPTION_TIERS } from "@/lib/stripe-config";
import {
  ArrowRight,
  Sparkles,
  Users,
  Clock,
  Calendar,
  Search,
  Mail,
  Crown,
  CheckCircle2,
  Megaphone,
  BarChart3,
  Circle,
  Heart,
} from "lucide-react";

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

export async function BrandDashboard({ actorId }: { actorId: string }) {
  const supabase = await createClient();

  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("id", actorId)
    .single();

  const isApproved = brand?.is_verified === true;
  const isPending = brand?.is_verified !== true;

  const [
    { data: campaignsList },
    { count: campaignCount },
    { data: offersData },
    { data: upcomingBookings },
    { data: topModels },
    { data: follows },
  ] = await Promise.all([
    (supabase.from("campaigns") as any)
      .select(`*, campaign_models(id)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false })
      .limit(3),
    (supabase.from("campaigns") as any)
      .select("*", { count: "exact", head: true })
      .eq("brand_id", actorId),
    (supabase.from("offers") as any)
      .select(`*, offer_responses(id, status, model_id, responded_at)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false }),
    (supabase.from("bookings") as any)
      .select("id, event_date, service_type, status, model_id")
      .eq("client_id", actorId)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .neq("status", "cancelled")
      .order("event_date", { ascending: true })
      .limit(5),
    (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null)
      .not("profile_photo_url", "ilike", "%cdninstagram.com%")
      .not("profile_photo_url", "ilike", "%instagram%")
      .gte("admin_rating", 4)
      .order("admin_rating", { ascending: false })
      .limit(8),
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

  const coinBalance = brand?.coin_balance || 0;
  const activeCampaignCount = campaignCount || 0;

  const allResponses = (offersData || []).flatMap((offer: any) =>
    (offer.offer_responses || []).map((r: any) => ({
      ...r,
      offer_title: offer.title,
      offer_id: offer.id,
    }))
  );
  const pendingResponseCount = allResponses.filter((r: any) => r.status === "pending").length;
  const upcomingEventCount = (upcomingBookings || []).length;

  const recentResponses = allResponses
    .filter((r: any) => r.status === "accepted" || r.status === "declined" || r.status === "confirmed")
    .sort((a: any, b: any) =>
      new Date(b.responded_at || b.created_at).getTime() - new Date(a.responded_at || a.created_at).getTime()
    )
    .slice(0, 5);

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

  const currentTier = (brand?.subscription_tier || "free") as keyof typeof BRAND_SUBSCRIPTION_TIERS;
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[currentTier] || BRAND_SUBSCRIPTION_TIERS.free;
  const monthlyCoins = tierConfig.monthlyCoins;

  const hasProfile = !!brand?.logo_url;
  const hasCampaign = activeCampaignCount > 0;
  const hasSentOffer = (offersData || []).length > 0;
  const completedSteps = [hasProfile, hasCampaign, hasSentOffer].filter(Boolean).length;

  const discoverModels = topModels || [];

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
        is_verified, is_featured, last_active_at
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="p-2.5 rounded-full bg-pink-500/10">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Favorites</p>
                <p className="text-2xl font-bold">{favoriteModels.length}</p>
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
                <p className="text-sm text-muted-foreground">Upcoming Shows</p>
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
            Upcoming Shows
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
      {favoriteModels.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
              Favorites
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/favorites" className="text-pink-500">
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
      ) : (
        <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-violet-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/10">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Save your favorite models</h3>
                <p className="text-sm text-muted-foreground">
                  Click the heart icon on models you work with frequently for quick access.
                </p>
              </div>
              <Button asChild size="sm" className="bg-gradient-to-r from-pink-500 to-violet-500">
                <Link href="/models">
                  Browse Models
                </Link>
              </Button>
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
