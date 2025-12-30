import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApproveRejectButtons } from "@/components/admin/AdminActions";
import {
  Users,
  Sparkles,
  Trophy,
  Clock,
  Building2,
  Mail,
  Globe,
  Instagram,
  Coins,
  CreditCard,
  Heart,
  UserPlus,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Check if admin
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get stats
  const { count: totalModels } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true });

  const { count: pendingApplications } = await supabase
    .from("opportunity_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Get brand inquiries
  const { data: brandInquiries } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("subscription_tier", "inquiry")
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: pendingBrands } = await (supabase
    .from("brands") as any)
    .select("*", { count: "exact", head: true })
    .eq("subscription_tier", "inquiry");

  // Get model applications
  const { count: pendingModelApps } = await (supabase
    .from("model_applications") as any)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: modelApplications } = await (supabase
    .from("model_applications") as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  // Get coin stats
  const { count: totalFans } = await supabase
    .from("fans")
    .select("*", { count: "exact", head: true });

  const { data: modelBalances } = await supabase
    .from("models")
    .select("coin_balance") as { data: { coin_balance: number }[] | null };

  const { data: fanBalances } = await supabase
    .from("fans")
    .select("coin_balance") as { data: { coin_balance: number }[] | null };

  const totalCoins = (modelBalances?.reduce((sum, m) => sum + (m.coin_balance || 0), 0) || 0) +
                     (fanBalances?.reduce((sum, f) => sum + (f.coin_balance || 0), 0) || 0);

  // Get recent transactions count
  const { count: recentTransactions } = await supabase
    .from("coin_transactions")
    .select("*", { count: "exact", head: true });

  // Get growth stats (last 7 days and 30 days)
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: modelsThisWeek } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  const { count: modelsThisMonth } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthAgo);

  const { count: fansThisWeek } = await supabase
    .from("fans")
    .select("*", { count: "exact", head: true })
    .gte("created_at", weekAgo);

  const { count: fansThisMonth } = await supabase
    .from("fans")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthAgo);

  // Get coin transaction stats
  const { data: weeklyTransactions } = await supabase
    .from("coin_transactions")
    .select("amount, action")
    .gte("created_at", weekAgo) as { data: { amount: number; action: string }[] | null };

  const weeklySpent = weeklyTransactions?.filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/traffic">
              <BarChart3 className="h-4 w-4 mr-2" />
              Traffic
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/community">
              <Users className="h-4 w-4 mr-2" />
              Community
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/gigs">
              <Sparkles className="h-4 w-4 mr-2" />
              Manage Gigs
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalModels}</p>
                <p className="text-sm text-muted-foreground">Total Models</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Trophy className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingApplications}</p>
                <p className="text-sm text-muted-foreground">Pending Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/20">
                <Coins className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCoins.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <Heart className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFans || 0}</p>
                <p className="text-sm text-muted-foreground">Fans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CreditCard className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentTransactions || 0}</p>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="model-apps">
            <UserPlus className="h-4 w-4 mr-2" />
            Model Apps ({pendingModelApps || 0})
          </TabsTrigger>
          <TabsTrigger value="brands">
            <Building2 className="h-4 w-4 mr-2" />
            Brands ({pendingBrands || 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Growth Stats */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span>Models This Week</span>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardDescription>
                <CardTitle className="text-3xl flex items-baseline gap-2">
                  +{modelsThisWeek || 0}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {modelsThisMonth || 0} this month
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Total: {totalModels?.toLocaleString()} models
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span>Fans This Week</span>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardDescription>
                <CardTitle className="text-3xl flex items-baseline gap-2">
                  +{fansThisWeek || 0}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {fansThisMonth || 0} this month
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Total: {totalFans?.toLocaleString()} fans (Goal: 1M)
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                    style={{ width: `${Math.min(((totalFans || 0) / 1000000) * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span>Coins in Circulation</span>
                  <Coins className="h-4 w-4 text-yellow-500" />
                </CardDescription>
                <CardTitle className="text-3xl">
                  {totalCoins.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {weeklySpent > 0 ? `${weeklySpent} spent this week` : "No spending this week"}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span>Pending Actions</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardDescription>
                <CardTitle className="text-3xl">
                  {(pendingModelApps || 0) + (pendingApplications || 0) + (pendingBrands || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>{pendingModelApps || 0} model applications</div>
                  <div>{pendingApplications || 0} gig applications</div>
                  <div>{pendingBrands || 0} brand inquiries</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Progress */}
          <Card>
            <CardHeader>
              <CardTitle>2025 Goals Progress</CardTitle>
              <CardDescription>Track your platform growth targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    Models
                  </span>
                  <span>{totalModels?.toLocaleString()} / 5,000</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.min(((totalModels || 0) / 5000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {((((totalModels || 0) / 5000) * 100).toFixed(1))}% of goal
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Fans
                  </span>
                  <span>{totalFans?.toLocaleString()} / 1,000,000</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all"
                    style={{ width: `${Math.min(((totalFans || 0) / 1000000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {((((totalFans || 0) / 1000000) * 100).toFixed(3))}% of goal
                </p>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="model-apps">
          <Card>
            <CardHeader>
              <CardTitle>Model Applications</CardTitle>
              <CardDescription>Review fans who want to become verified models</CardDescription>
            </CardHeader>
            <CardContent>
              {modelApplications && modelApplications.length > 0 ? (
                <div className="space-y-4">
                  {modelApplications.map((app: any) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                            {app.display_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{app.display_name}</p>
                            <p className="text-sm text-muted-foreground">{app.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {app.instagram_username && (
                          <a
                            href={`https://instagram.com/${app.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400 hover:text-pink-300 transition-colors"
                          >
                            <Instagram className="h-4 w-4" />
                            @{app.instagram_username}
                          </a>
                        )}
                        {app.tiktok_username && (
                          <a
                            href={`https://tiktok.com/@${app.tiktok_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white hover:text-white/80 transition-colors"
                          >
                            <span className="font-bold">T</span>
                            @{app.tiktok_username}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </span>
                        <ApproveRejectButtons id={app.id} type="model_application" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  No pending model applications
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands">
          <Card>
            <CardHeader>
              <CardTitle>Brand Inquiries</CardTitle>
              <CardDescription>Partnership requests from brands</CardDescription>
            </CardHeader>
            <CardContent>
              {brandInquiries && brandInquiries.length > 0 ? (
                <div className="space-y-4">
                  {brandInquiries.map((brand: any) => (
                    <div
                      key={brand.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            {brand.company_name?.charAt(0).toUpperCase() || "B"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{brand.company_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {brand.contact_name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/50">
                          Inquiry
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{brand.email}</span>
                        </div>
                        {brand.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline truncate">
                              Website
                            </a>
                          </div>
                        )}
                        {brand.form_data?.industry && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{brand.form_data.industry}</span>
                          </div>
                        )}
                        {brand.form_data?.budget_range && (
                          <div className="text-muted-foreground">
                            Budget: {brand.form_data.budget_range.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                      {brand.bio && (
                        <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded">
                          {brand.bio}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(brand.created_at).toLocaleDateString()}
                        </span>
                        <ApproveRejectButtons id={brand.id} type="brand" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  No brand inquiries yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
