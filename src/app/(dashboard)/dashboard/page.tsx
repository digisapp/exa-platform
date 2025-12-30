import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GigsFeed } from "@/components/gigs/GigsFeed";
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
  Eye,
  Camera,
  ExternalLink,
  TrendingUp,
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

  // Get stats
  const { count: followerCount } = await (supabase
    .from("follows") as any)
    .select("*", { count: "exact", head: true })
    .eq("following_id", actor.id);

  const { count: portfolioCount } = await supabase
    .from("media_assets")
    .select("*", { count: "exact", head: true })
    .eq("model_id", model.id)
    .in("asset_type", ["portfolio", "video"]);

  const { count: ppvCount } = await supabase
    .from("premium_content")
    .select("*", { count: "exact", head: true })
    .eq("model_id", model.id)
    .eq("is_active", true)
    .gt("coin_price", 0);

  // Get total page views
  const { data: viewsData } = await (supabase
    .from("page_views") as any)
    .select("view_count")
    .eq("model_id", model.id)
    .single();

  const totalViews = (viewsData as { view_count: number } | null)?.view_count || 0;

  // Get open opportunities
  const { data: opportunities } = await (supabase
    .from("opportunities") as any)
    .select("id, slug, title, type, description, location_city, location_state, start_at, compensation_type, compensation_amount, spots, spots_filled")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("start_at", { ascending: true })
    .limit(5);

  // Get model's applications
  const { data: modelApplications } = await (supabase
    .from("opportunity_applications") as any)
    .select("opportunity_id, status")
    .eq("model_id", model.id);

  // Get recent activity
  const { data: pointHistory } = await (supabase
    .from("point_transactions") as any)
    .select("id, action, points, created_at")
    .eq("model_id", model.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: coinHistory } = await (supabase
    .from("coin_transactions") as any)
    .select("id, action, amount, created_at")
    .eq("actor_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(5);

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
    .slice(0, 6);

  const displayName = model.first_name
    ? `${model.first_name} ${model.last_name || ''}`.trim()
    : model.username;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-pink-500/30 bg-gradient-to-br from-pink-500/20 to-violet-500/20">
            {model.profile_photo_url ? (
              <Image
                src={model.profile_photo_url}
                alt={displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {model.first_name || model.username}!</h1>
            <p className="text-muted-foreground">@{model.username}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${model.username}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Profile
          </Link>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-500/20">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{followerCount || 0}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-xs text-muted-foreground">Profile Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-violet-500/20">
                <Camera className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{portfolioCount || 0}</p>
                <p className="text-xs text-muted-foreground">Portfolio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Lock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ppvCount || 0}</p>
                <p className="text-xs text-muted-foreground">PPV Content</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Gigs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        item.type === "coins"
                          ? item.action === "tip_received" ? "bg-pink-500/20" :
                            item.action === "content_sale" ? "bg-violet-500/20" : "bg-amber-500/20"
                          : "bg-green-500/20"
                      }`}>
                        {item.type === "coins" ? (
                          item.action === "tip_received" ? (
                            <Heart className="h-4 w-4 text-pink-500" />
                          ) : item.action === "content_sale" ? (
                            <Lock className="h-4 w-4 text-violet-500" />
                          ) : (
                            <Coins className="h-4 w-4 text-amber-500" />
                          )
                        ) : (
                          item.action === "photo_upload" || item.action === "portfolio_photo" ? (
                            <ImageIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <Trophy className="h-4 w-4 text-green-500" />
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
                    <span className={`font-bold text-sm ${
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
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-muted inline-block mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">Upload content to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gigs */}
        <GigsFeed
          opportunities={opportunities || []}
          modelApplications={modelApplications || []}
          isApproved={model.is_approved}
        />
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

  // Get user data
  const { data: { user } } = await supabase.auth.getUser();

  // Get coin balance
  let coinBalance = 0;
  if (actorType === "fan") {
    const { data: fan } = await supabase
      .from("fans")
      .select("coin_balance, display_name")
      .eq("id", actorId)
      .single() as { data: { coin_balance: number; display_name: string | null } | null };
    coinBalance = fan?.coin_balance || 0;
  }

  // Get user's favorite models
  const { data: favorites } = await (supabase
    .from("follows") as any)
    .select("following_id, created_at")
    .eq("follower_id", actorId)
    .order("created_at", { ascending: false })
    .limit(10);

  const favoriteIds = favorites?.map((f: any) => f.following_id) || [];

  // Get the model profiles for favorited users
  let favoriteModels: any[] = [];
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
        .select("id, username, first_name, last_name, profile_photo_url, city, state, show_location, user_id")
        .in("user_id", userIds)
        .eq("is_approved", true);
      favoriteModels = models || [];
    }
  }

  // Get featured/trending models for discovery
  const { data: featuredModels } = await (supabase
    .from("models") as any)
    .select("id, username, first_name, last_name, profile_photo_url, city, state, show_location, user_id")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(8);

  // Filter out models already favorited
  const favoritedUserIds = favoriteModels.map(m => m.user_id);
  const discoverModels = (featuredModels || []).filter(
    (m: any) => !favoritedUserIds.includes(m.user_id)
  );

  // Get recent coin transactions
  const { data: coinHistory } = await (supabase
    .from("coin_transactions") as any)
    .select("id, action, amount, created_at")
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get unread message count
  const { count: unreadCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .neq("sender_id", actorId);

  const isBrand = actorType === "brand";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Discover and connect with amazing models</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/chats">
              <MessageCircle className="mr-2 h-4 w-4" />
              Chats
            </Link>
          </Button>
          <Button asChild className={isBrand ? "bg-blue-500 hover:bg-blue-600" : "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"}>
            <Link href="/models">
              <Users className="mr-2 h-4 w-4" />
              Browse Models
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats for Fans */}
      {actorType === "fan" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Coins className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{coinBalance}</p>
                  <p className="text-xs text-muted-foreground">Coin Balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-pink-500/20">
                  <Heart className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{favoriteModels.length}</p>
                  <p className="text-xs text-muted-foreground">Favorites</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 col-span-2 md:col-span-1">
            <CardContent className="pt-6">
              <Link href="/coins" className="flex items-center gap-3 group">
                <div className="p-2 rounded-full bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors">
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold group-hover:text-violet-500 transition-colors">Get More Coins</p>
                  <p className="text-xs text-muted-foreground">Unlock exclusive content</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-violet-500 transition-colors" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Favorites Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className={`h-5 w-5 ${isBrand ? "text-blue-500" : "text-pink-500"} fill-current`} />
            Your Favorites
          </CardTitle>
          {favoriteModels.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/models" className={isBrand ? "text-blue-500" : "text-pink-500"}>
                Find More
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {favoriteModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favoriteModels.map((model: any) => {
                const displayName = model.first_name
                  ? `${model.first_name} ${model.last_name || ''}`.trim()
                  : model.username;
                return (
                  <Link
                    key={model.id}
                    href={`/${model.username}`}
                    className="group"
                  >
                    <div className={`rounded-xl p-3 border bg-card hover:shadow-lg transition-all ${isBrand ? "hover:border-blue-500/50" : "hover:border-pink-500/50"}`}>
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
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 inline-block mb-4">
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Discover amazing models and add them to your favorites</p>
              <Button asChild className={isBrand ? "bg-blue-500 hover:bg-blue-600" : "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"}>
                <Link href="/models">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Discover Models
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discover & Activity */}
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
              <div className="space-y-2">
                {discoverModels.slice(0, 4).map((model: any) => {
                  const displayName = model.first_name
                    ? `${model.first_name} ${model.last_name || ''}`.trim()
                    : model.username;
                  return (
                    <Link
                      key={model.id}
                      href={`/${model.username}`}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-transparent ${isBrand ? "hover:border-blue-500/30" : "hover:border-pink-500/30"}`}
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
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-muted inline-block mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
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
              <div className="space-y-2">
                {coinHistory.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.action === "tip_sent" ? "bg-pink-500/20" :
                        tx.action === "content_purchase" ? "bg-violet-500/20" :
                        tx.action === "coin_purchase" ? "bg-green-500/20" : "bg-amber-500/20"
                      }`}>
                        {tx.action === "tip_sent" ? (
                          <Heart className="h-4 w-4 text-pink-500" />
                        ) : tx.action === "content_purchase" ? (
                          <Lock className="h-4 w-4 text-violet-500" />
                        ) : tx.action === "coin_purchase" ? (
                          <Coins className="h-4 w-4 text-green-500" />
                        ) : (
                          <Coins className="h-4 w-4 text-amber-500" />
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
                    <span className={`font-bold text-sm ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                      <span className="flex items-center gap-1">
                        {tx.amount >= 0 ? "+" : ""}{tx.amount}
                        <Coins className="h-3 w-3" />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-muted inline-block mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
