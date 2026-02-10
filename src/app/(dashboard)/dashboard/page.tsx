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
  Building2,
  Calendar,
  Mail,
  DollarSign,
  Coins,
  UserPlus,
  Activity,
  MessageCircle,
  Gavel,
  Plus,
} from "lucide-react";
import { FanDashboard } from "./FanDashboard";
import { BrandDashboard } from "./BrandDashboard";

// Helper function to format relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
      const { data: actors } = await (adminClient.from("actors") as any)
        .select("id, type")
        .in("id", uniqueClientIds);
      const actorsMap = new Map<string, { id: string; type: string }>((actors || []).map((a: any) => [a.id, a]));

      const fanIds = uniqueClientIds.filter(id => actorsMap.get(id)?.type === "fan");
      const brandIds = uniqueClientIds.filter(id => actorsMap.get(id)?.type === "brand");

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

  // Get pending offers for this model
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

  // Enrich with brand info using batch query
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

  // Get model's auctions for EXA Bids section
  const { data: modelAuctions } = await (supabase as any)
    .from("auctions")
    .select("id, title, status, current_bid, starting_price, bid_count, ends_at, category")
    .eq("model_id", model.id)
    .in("status", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(5);

  // ============================================
  // RECENT ACTIVITY FEED
  // ============================================

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { data: recentTips },
    { data: recentFollowers },
    { data: modelParticipations },
  ] = await Promise.all([
    (adminClient.from("coin_transactions") as any)
      .select("id, amount, created_at, metadata")
      .eq("actor_id", actor.id)
      .eq("action", "tip_received")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    (adminClient.from("follows") as any)
      .select("follower_id, created_at")
      .eq("following_id", actor.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    (supabase.from("conversation_participants") as any)
      .select("conversation_id, last_read_at")
      .eq("actor_id", actor.id),
  ]);

  const conversationIds = modelParticipations?.map((p: any) => p.conversation_id) || [];
  const lastReadMap = new Map<string, string | null>((modelParticipations || []).map((p: any) => [p.conversation_id, p.last_read_at]));

  let recentMessages: any[] = [];
  if (conversationIds.length > 0) {
    const { data: messages } = await (adminClient
      .from("messages") as any)
      .select("id, conversation_id, sender_id, content, created_at, is_system")
      .in("conversation_id", conversationIds)
      .neq("sender_id", actor.id)
      .eq("is_system", false)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    recentMessages = (messages || []).filter((msg: any) => {
      const lastRead = lastReadMap.get(msg.conversation_id);
      return !lastRead || new Date(msg.created_at) > new Date(lastRead);
    }).slice(0, 10);
  }

  // Enrich activity data with user info
  const tipSenderIds = (recentTips || [])
    .map((t: any) => t.metadata?.sender_id)
    .filter(Boolean);
  const followerIds = (recentFollowers || [])
    .map((f: any) => f.follower_id)
    .filter(Boolean);
  const messageSenderIds = recentMessages
    .map((m: any) => m.sender_id)
    .filter(Boolean);

  const allActivityActorIds = [...new Set([...tipSenderIds, ...followerIds, ...messageSenderIds])];

  const activityActorsMap = new Map<string, any>();
  if (allActivityActorIds.length > 0) {
    const { data: activityActors } = await (adminClient.from("actors") as any)
      .select("id, type, user_id")
      .in("id", allActivityActorIds);

    const actorTypes = new Map<string, any>((activityActors || []).map((a: any) => [a.id, a]));

    const activityFanIds = allActivityActorIds.filter(id => actorTypes.get(id)?.type === "fan");
    const activityBrandIds = allActivityActorIds.filter(id => actorTypes.get(id)?.type === "brand");
    const activityModelUserIds = (activityActors || [])
      .filter((a: any) => a.type === "model" && a.user_id)
      .map((a: any) => a.user_id);

    const [activityFans, activityBrands, activityModels] = await Promise.all([
      activityFanIds.length > 0
        ? (adminClient.from("fans") as any).select("id, display_name, username, avatar_url").in("id", activityFanIds)
        : { data: [] },
      activityBrandIds.length > 0
        ? (adminClient.from("brands") as any).select("id, company_name, logo_url").in("id", activityBrandIds)
        : { data: [] },
      activityModelUserIds.length > 0
        ? (adminClient.from("models") as any).select("id, user_id, first_name, last_name, username, profile_photo_url").in("user_id", activityModelUserIds)
        : { data: [] },
    ]);

    for (const fan of activityFans.data || []) {
      activityActorsMap.set(fan.id, {
        type: "fan",
        name: fan.display_name || fan.username || "Fan",
        avatar: fan.avatar_url
      });
    }
    for (const brand of activityBrands.data || []) {
      activityActorsMap.set(brand.id, {
        type: "brand",
        name: brand.company_name || "Brand",
        avatar: brand.logo_url
      });
    }
    for (const actorData of activityActors || []) {
      if (actorData.type === "model") {
        const matchedModel = (activityModels.data || []).find((m: any) => m.user_id === actorData.user_id);
        if (matchedModel) {
          activityActorsMap.set(actorData.id, {
            type: "model",
            name: matchedModel.first_name
              ? `${matchedModel.first_name} ${matchedModel.last_name || ""}`.trim()
              : matchedModel.username,
            avatar: matchedModel.profile_photo_url,
            username: matchedModel.username
          });
        }
      }
    }
  }

  // Build unified activity feed
  type ActivityItem = {
    id: string;
    type: "tip" | "follower" | "message";
    actor: { name: string; avatar: string | null; type: string; username?: string } | null;
    amount?: number;
    messagePreview?: string;
    conversationId?: string;
    createdAt: string;
  };

  const activityFeed: ActivityItem[] = [
    ...(recentTips || []).map((tip: any) => ({
      id: `tip-${tip.id}`,
      type: "tip" as const,
      actor: activityActorsMap.get(tip.metadata?.sender_id) || null,
      amount: tip.amount,
      createdAt: tip.created_at,
    })),
    ...(recentFollowers || []).map((follow: any) => ({
      id: `follow-${follow.follower_id}-${follow.created_at}`,
      type: "follower" as const,
      actor: activityActorsMap.get(follow.follower_id) || null,
      createdAt: follow.created_at,
    })),
    ...recentMessages.map((msg: any) => ({
      id: `msg-${msg.id}`,
      type: "message" as const,
      actor: activityActorsMap.get(msg.sender_id) || null,
      messagePreview: msg.content?.slice(0, 50) + (msg.content?.length > 50 ? "..." : ""),
      conversationId: msg.conversation_id,
      createdAt: msg.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

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
        <Card className="order-2 md:order-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Bookings
              {(pendingBookings?.length || 0) > 0 && (
                <Badge className="bg-green-500 text-white ml-2">{pendingBookings?.length}</Badge>
              )}
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

        <div className="order-1 md:order-2">
          <GigsFeed
            gigs={gigs || []}
            modelApplications={modelApplications || []}
            isApproved={model.is_approved}
          />
        </div>
      </div>

      {/* EXA Bids */}
      <Card className="border-violet-500/30 bg-gradient-to-br from-pink-500/5 to-violet-500/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-violet-500" />
            EXA Bids
            {(modelAuctions?.length || 0) > 0 && (
              <Badge className="bg-violet-500 text-white ml-2">{modelAuctions?.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bids/manage" className="text-violet-500">
                Manage
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white">
              <Link href="/bids/new">
                <Plus className="h-4 w-4 mr-1" />
                Create Listing
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(modelAuctions?.length || 0) > 0 ? (
            <div className="space-y-3">
              {modelAuctions?.map((auction: any) => (
                <Link
                  key={auction.id}
                  href={auction.status === "draft" ? `/bids/${auction.id}/edit` : `/bids/${auction.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-violet-500/30"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                    <Gavel className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{auction.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-500" />
                        {auction.current_bid || auction.starting_price} coins
                      </span>
                      <span>{auction.bid_count || 0} bids</span>
                      {auction.status === "active" && (
                        <span>Ends {new Date(auction.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={auction.status === "active"
                      ? "bg-green-500/10 text-green-600 border-green-500/30 text-xs"
                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs"
                    }
                  >
                    {auction.status === "active" ? "Live" : "Draft"}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-violet-500/10 inline-block mb-4">
                <Gavel className="h-8 w-8 text-violet-500" />
              </div>
              <p className="text-muted-foreground">You have no EXA Bids yet</p>
              <p className="text-sm text-muted-foreground mt-1">Let fans and brands compete in real-time bids for your exclusive content, experiences, and services</p>
              <Button size="sm" asChild className="mt-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white">
                <Link href="/bids/new">
                  <Plus className="h-4 w-4 mr-1" />
                  Create EXA Bid
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      {activityFeed.length > 0 && (
        <Card className="border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-violet-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-pink-500" />
              Recent Activity
              <Badge className="bg-pink-500 text-white ml-2">{activityFeed.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/chats" className="text-pink-500">
                View Chats
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityFeed.map((item) => {
                const timeAgo = getTimeAgo(item.createdAt);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/50 dark:bg-muted/50 border border-transparent"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === "tip"
                        ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20"
                        : item.type === "follower"
                          ? "bg-gradient-to-br from-pink-500/20 to-rose-500/20"
                          : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                    }`}>
                      {item.actor?.avatar ? (
                        <Image
                          src={item.actor.avatar}
                          alt={item.actor.name}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : item.type === "tip" ? (
                        <Coins className="h-5 w-5 text-amber-500" />
                      ) : item.type === "follower" ? (
                        <UserPlus className="h-5 w-5 text-pink-500" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{item.actor?.name || "Someone"}</span>
                        {item.type === "tip" && (
                          <> sent you a <span className="text-amber-500 font-semibold">{item.amount} coin</span> tip!</>
                        )}
                        {item.type === "follower" && " started following you"}
                        {item.type === "message" && " sent you a message"}
                      </p>
                      {item.type === "message" && item.messagePreview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.messagePreview}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                    </div>

                    {item.type === "message" && item.conversationId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="flex-shrink-0 text-blue-500 hover:text-blue-600"
                      >
                        <Link href={`/chats/${item.conversationId}`}>
                          Reply
                        </Link>
                      </Button>
                    )}
                    {item.type === "tip" && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 flex-shrink-0">
                        +{item.amount}
                      </Badge>
                    )}
                    {item.type === "follower" && (
                      <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/30 flex-shrink-0">
                        New
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
