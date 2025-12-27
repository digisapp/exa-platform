import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  ArrowRight,
  Lock,
  Coins,
  Heart,
  Image as ImageIcon,
  Activity,
  Sparkles,
  Calendar,
  Users,
  MessageCircle,
  MapPin,
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

  if (!actor) redirect("/onboarding");

  // For fans and brands, show the fan/brand dashboard
  if (actor.type === "fan" || actor.type === "brand") {
    return <FanBrandDashboard actorId={actor.id} actorType={actor.type} />;
  }

  // For models/admins, get model data
  const { data: model } = await (supabase.from("models") as any)
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/onboarding");

  // Get recent opportunities
  const { data: opportunities } = await (supabase
    .from("opportunities") as any)
    .select("id, slug, title, brand_name, location, event_date, is_active")
    .eq("is_active", true)
    .order("event_date", { ascending: true })
    .limit(3);

  // Get recent activity - combine point transactions and coin transactions
  const { data: pointHistory } = await (supabase
    .from("point_transactions") as any)
    .select("id, action, points, created_at")
    .eq("model_id", model.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: coinHistory } = await (supabase
    .from("coin_transactions") as any)
    .select("id, action, amount, created_at")
    .eq("actor_id", model.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Combine and sort all activity
  const recentActivity = [
    ...(pointHistory || []).map((tx: any) => ({
      id: tx.id,
      type: "points" as const,
      action: tx.action,
      value: tx.points,
      created_at: tx.created_at,
    })),
    ...(coinHistory || []).map((tx: any) => ({
      id: tx.id,
      type: "coins" as const,
      action: tx.action,
      value: tx.amount,
      created_at: tx.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Recent Activity & Gigs - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        item.type === "coins"
                          ? "bg-yellow-500/20"
                          : "bg-pink-500/20"
                      }`}>
                        {item.type === "coins" ? (
                          item.action === "tip_received" ? (
                            <Heart className="h-4 w-4 text-pink-500" />
                          ) : item.action === "content_sale" ? (
                            <Lock className="h-4 w-4 text-violet-500" />
                          ) : (
                            <Coins className="h-4 w-4 text-yellow-500" />
                          )
                        ) : (
                          item.action === "photo_upload" ? (
                            <ImageIcon className="h-4 w-4 text-pink-500" />
                          ) : (
                            <Trophy className="h-4 w-4 text-pink-500" />
                          )
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize text-sm">{item.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      item.value >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {item.type === "coins" ? (
                        <span className="flex items-center gap-1">
                          {item.value >= 0 ? "+" : ""}{item.value}
                          <Coins className="h-3 w-3" />
                        </span>
                      ) : (
                        `+${item.value} pts`
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gigs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              Gigs
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/gigs" className="text-pink-500">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {opportunities && opportunities.length > 0 ? (
              <div className="space-y-3">
                {opportunities.map((opp: any) => (
                  <Link
                    key={opp.id}
                    href={`/opportunities/${opp.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                        <Sparkles className="h-4 w-4 text-pink-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{opp.title}</p>
                        <p className="text-xs text-muted-foreground">{opp.brand_name}</p>
                      </div>
                    </div>
                    {opp.event_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(opp.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No gigs available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Fan/Brand Dashboard Component
async function FanBrandDashboard({
  actorId,
  actorType
}: {
  actorId: string;
  actorType: "fan" | "brand";
}) {
  const supabase = await createClient();

  // Get models this user follows
  const { data: follows } = await (supabase
    .from("follows") as any)
    .select("following_id, created_at")
    .eq("follower_id", actorId)
    .order("created_at", { ascending: false })
    .limit(10);

  const followingIds = follows?.map((f: any) => f.following_id) || [];

  // Get the model profiles for followed users
  let followedModels: any[] = [];
  if (followingIds.length > 0) {
    // Get actors that are models
    const { data: actorData } = await (supabase
      .from("actors") as any)
      .select("id, user_id")
      .in("id", followingIds)
      .eq("type", "model");

    if (actorData && actorData.length > 0) {
      const userIds = actorData.map((a: any) => a.user_id);
      const { data: models } = await (supabase
        .from("models") as any)
        .select("id, username, first_name, last_name, profile_photo_url, city, state, show_location, user_id")
        .in("user_id", userIds)
        .eq("is_approved", true);
      followedModels = models || [];
    }
  }

  // Get featured/trending models for discovery
  const { data: featuredModels } = await (supabase
    .from("models") as any)
    .select("id, username, first_name, last_name, profile_photo_url, city, state, show_location, user_id")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(8);

  // Filter out models already followed
  const followedUserIds = followedModels.map(m => m.user_id);
  const discoverModels = (featuredModels || []).filter(
    (m: any) => !followedUserIds.includes(m.user_id)
  );

  // Get recent coin transactions
  const { data: coinHistory } = await (supabase
    .from("coin_transactions") as any)
    .select("id, action, amount, created_at")
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(5);

  const isBrand = actorType === "brand";

  return (
    <div className="space-y-6">
      {/* Following Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className={`h-5 w-5 ${isBrand ? "text-blue-500" : "text-pink-500"}`} />
            Following
          </CardTitle>
          {followedModels.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/messages" className={isBrand ? "text-blue-500" : "text-pink-500"}>
                <MessageCircle className="mr-1 h-4 w-4" />
                Messages
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {followedModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {followedModels.map((model: any) => {
                const displayName = model.first_name
                  ? `${model.first_name} ${model.last_name || ''}`.trim()
                  : model.username;
                return (
                  <Link
                    key={model.id}
                    href={`/${model.username}`}
                    className="group"
                  >
                    <div className={`glass-card rounded-xl p-3 hover:scale-105 transition-transform border ${isBrand ? "hover:border-blue-500/50" : "hover:border-pink-500/50"}`}>
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-gradient-to-br from-pink-500/20 to-violet-500/20">
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
                      <p className={`text-xs ${isBrand ? "text-blue-500" : "text-pink-500"}`}>@{model.username}</p>
                      {model.show_location && (model.city || model.state) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">You&apos;re not following anyone yet</p>
              <Button asChild className={isBrand ? "bg-blue-500 hover:bg-blue-600" : "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"}>
                <Link href="/models">
                  <Users className="mr-2 h-4 w-4" />
                  Discover Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discover & Activity - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discover Models */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className={`h-5 w-5 ${isBrand ? "text-blue-500" : "text-pink-500"}`} />
              Discover
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/models" className={isBrand ? "text-blue-500" : "text-pink-500"}>
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {discoverModels.length > 0 ? (
              <div className="space-y-3">
                {discoverModels.slice(0, 4).map((model: any) => {
                  const displayName = model.first_name
                    ? `${model.first_name} ${model.last_name || ''}`.trim()
                    : model.username;
                  return (
                    <Link
                      key={model.id}
                      href={`/${model.username}`}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent ${isBrand ? "hover:border-blue-500/30" : "hover:border-pink-500/30"}`}
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
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
                            <span className="text-xl">👤</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{displayName}</p>
                        <p className={`text-xs ${isBrand ? "text-blue-500" : "text-pink-500"}`}>@{model.username}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No new models to discover</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coinHistory && coinHistory.length > 0 ? (
              <div className="space-y-3">
                {coinHistory.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-yellow-500/20">
                        {tx.action === "tip_sent" ? (
                          <Heart className="h-4 w-4 text-pink-500" />
                        ) : tx.action === "content_purchase" ? (
                          <Lock className="h-4 w-4 text-violet-500" />
                        ) : tx.action === "coin_purchase" ? (
                          <Coins className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Coins className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize text-sm">{tx.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                      <span className="flex items-center gap-1">
                        {tx.amount >= 0 ? "+" : ""}{tx.amount}
                        <Coins className="h-3 w-3" />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
