import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApproveRejectButtons, ModelApprovalButton, ConvertToFanButton } from "@/components/admin/AdminActions";
import { AdminSearch } from "@/components/admin/AdminSearch";
import {
  Users,
  Sparkles,
  Trophy,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  Building2,
  Palette,
  Camera,
  Mail,
  Globe,
  Instagram,
  Coins,
  CreditCard,
  Heart,
  UserPlus,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
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

  const { count: approvedModels } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", true);

  const { count: pendingModels } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", false);

  const { count: totalOpportunities } = await supabase
    .from("opportunities")
    .select("*", { count: "exact", head: true });

  const { count: pendingApplications } = await supabase
    .from("opportunity_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Get recent applications
  const { data: recentApplications } = await supabase
    .from("opportunity_applications")
    .select(`
      *,
      model:models(username, name),
      opportunity:opportunities(title)
    `)
    .eq("status", "pending")
    .order("applied_at", { ascending: false })
    .limit(10);

  // Get recent models
  const { data: recentModels } = await supabase
    .from("models")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

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

  // Get designer signups
  const { data: designerSignups } = await (supabase
    .from("designers") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: pendingDesigners } = await (supabase
    .from("designers") as any)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Get media signups
  const { data: mediaSignups } = await (supabase
    .from("media") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: pendingMedia } = await (supabase
    .from("media") as any)
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

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

  // Get recent fans for the Fans tab
  const { data: recentFans } = await supabase
    .from("fans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50) as { data: { id: string; user_id: string; display_name: string | null; email: string | null; coin_balance: number; created_at: string }[] | null };

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

  const weeklyRevenue = weeklyTransactions?.filter(t => t.action === "purchase")
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const weeklySpent = weeklyTransactions?.filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage models, gigs, and applications</p>
        </div>
        <Button asChild>
          <Link href="/admin/gigs">
            <Sparkles className="h-4 w-4 mr-2" />
            Manage Gigs
          </Link>
        </Button>
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
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingModels}</p>
                <p className="text-sm text-muted-foreground">Pending Models</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/10">
                <Sparkles className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOpportunities}</p>
                <p className="text-sm text-muted-foreground">Gigs</p>
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

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-500/10">
                <Building2 className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingBrands || 0}</p>
                <p className="text-sm text-muted-foreground">Brand Inquiries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Palette className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingDesigners || 0}</p>
                <p className="text-sm text-muted-foreground">Designer Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Camera className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingMedia || 0}</p>
                <p className="text-sm text-muted-foreground">Media Apps</p>
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
          <TabsTrigger value="applications">
            <Clock className="h-4 w-4 mr-2" />
            Gig Apps ({pendingApplications})
          </TabsTrigger>
          <TabsTrigger value="models">
            <Users className="h-4 w-4 mr-2" />
            Models
          </TabsTrigger>
          <TabsTrigger value="fans">
            <Heart className="h-4 w-4 mr-2" />
            Fans ({totalFans || 0})
          </TabsTrigger>
          <TabsTrigger value="brands">
            <Building2 className="h-4 w-4 mr-2" />
            Brands ({pendingBrands || 0})
          </TabsTrigger>
          <TabsTrigger value="designers">
            <Palette className="h-4 w-4 mr-2" />
            Designers ({pendingDesigners || 0})
          </TabsTrigger>
          <TabsTrigger value="media">
            <Camera className="h-4 w-4 mr-2" />
            Media ({pendingMedia || 0})
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

          {/* Quick Stats Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Model Approval Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-500">
                  {totalModels && totalModels > 0
                    ? Math.round(((approvedModels || 0) / totalModels) * 100)
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {approvedModels} approved / {totalModels} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Gigs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-pink-500">
                  {totalOpportunities}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {pendingApplications} pending applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-500">
                  {recentTransactions || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  All-time coin transactions
                </p>
              </CardContent>
            </Card>
          </div>
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

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>Review and approve gig applications</CardDescription>
            </CardHeader>
            <CardContent>
              {recentApplications && recentApplications.length > 0 ? (
                <div className="space-y-4">
                  {recentApplications.map((app: any) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">
                          {app.model?.first_name ? `${app.model.first_name} ${app.model.last_name || ""}`.trim() : app.model?.username} → {app.opportunity?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Applied {new Date(app.applied_at).toLocaleDateString()}
                        </p>
                        {app.note && (
                          <p className="text-sm text-muted-foreground mt-1">
                            &quot;{app.note}&quot;
                          </p>
                        )}
                      </div>
                      <ApproveRejectButtons id={app.id} type="application" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending applications
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Models</CardTitle>
              <CardDescription>Search and manage models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AdminSearch type="models" placeholder="Search by name, username, or email..." />
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Recent Models</h4>
              {recentModels && recentModels.length > 0 ? (
                <div className="space-y-4">
                  {recentModels.map((model: any) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold">
                          {model.first_name?.charAt(0) || model.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium">
                            {model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{model.username} • {model.city}, {model.state}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={model.is_approved ? "default" : "secondary"}>
                          {model.is_approved ? "Approved" : "Pending"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {model.points_cached} pts
                        </span>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/${model.username}`}>View</Link>
                        </Button>
                        <ModelApprovalButton id={model.id} isApproved={model.is_approved} />
                        <ConvertToFanButton
                          id={model.id}
                          modelName={model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No models yet
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fans">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Fans</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Goal: 1,000,000 fans
                </span>
              </CardTitle>
              <CardDescription>
                {totalFans?.toLocaleString() || 0} total fans on the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AdminSearch type="fans" placeholder="Search by name or email..." />
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Recent Fans</h4>
              {recentFans && recentFans.length > 0 ? (
                <div className="space-y-3">
                  {recentFans.map((fan: any) => (
                    <div
                      key={fan.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/50 to-violet-500/50 flex items-center justify-center text-white font-bold">
                          {(fan.display_name || fan.email || "F")?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {fan.display_name || "Fan"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fan.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Coins className="h-4 w-4" />
                          <span className="font-semibold">{fan.coin_balance || 0}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  No fans yet
                </div>
              )}
              </div>
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

        <TabsContent value="designers">
          <Card>
            <CardHeader>
              <CardTitle>Designer Applications</CardTitle>
              <CardDescription>Fashion designers wanting to partner</CardDescription>
            </CardHeader>
            <CardContent>
              {designerSignups && designerSignups.length > 0 ? (
                <div className="space-y-4">
                  {designerSignups.map((designer: any) => (
                    <div
                      key={designer.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                            {designer.first_name?.charAt(0).toUpperCase() || "D"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {designer.first_name} {designer.last_name}
                            </p>
                            <p className="text-sm text-purple-400">{designer.brand_name}</p>
                          </div>
                        </div>
                        <Badge variant={designer.status === "pending" ? "secondary" : "default"}>
                          {designer.status || "Pending"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{designer.email}</span>
                        </div>
                        {designer.city && designer.state && (
                          <div className="text-muted-foreground">
                            {designer.city}, {designer.state}
                          </div>
                        )}
                        {designer.specialization && (
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{designer.specialization}</span>
                          </div>
                        )}
                        {designer.years_experience && (
                          <div className="text-muted-foreground">
                            Experience: {designer.years_experience} years
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {designer.website_url && (
                          <a href={designer.website_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-background/50 text-cyan-500 hover:underline flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Website
                          </a>
                        )}
                        {designer.instagram_url && (
                          <a href={designer.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-background/50 text-pink-500 hover:underline flex items-center gap-1">
                            <Instagram className="h-3 w-3" /> Instagram
                          </a>
                        )}
                        {designer.portfolio_url && (
                          <a href={designer.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-background/50 text-purple-500 hover:underline flex items-center gap-1">
                            <Palette className="h-3 w-3" /> Portfolio
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(designer.created_at).toLocaleDateString()}
                        </span>
                        <ApproveRejectButtons id={designer.id} type="designer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  No designer applications yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Professional Applications</CardTitle>
              <CardDescription>Photographers and videographers</CardDescription>
            </CardHeader>
            <CardContent>
              {mediaSignups && mediaSignups.length > 0 ? (
                <div className="space-y-4">
                  {mediaSignups.map((media: any) => (
                    <div
                      key={media.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                            {media.first_name?.charAt(0).toUpperCase() || "M"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">
                              {media.first_name} {media.last_name}
                            </p>
                            <p className="text-sm text-yellow-500 capitalize">
                              {media.media_type?.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={media.status === "pending" ? "secondary" : "default"}>
                          {media.status || "Pending"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{media.email}</span>
                        </div>
                        {media.city && media.state && (
                          <div className="text-muted-foreground">
                            {media.city}, {media.state}
                          </div>
                        )}
                        {media.specializations && (
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{media.specializations}</span>
                          </div>
                        )}
                        {media.years_experience && (
                          <div className="text-muted-foreground">
                            Experience: {media.years_experience} years
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {media.website_url && (
                          <a href={media.website_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-background/50 text-cyan-500 hover:underline flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Website
                          </a>
                        )}
                        {media.instagram_url && (
                          <a href={media.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-background/50 text-pink-500 hover:underline flex items-center gap-1">
                            <Instagram className="h-3 w-3" /> Instagram
                          </a>
                        )}
                        {media.portfolio_url && (
                          <a href={media.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded bg-background/50 text-yellow-500 hover:underline flex items-center gap-1">
                            <Camera className="h-3 w-3" /> Portfolio
                          </a>
                        )}
                      </div>
                      {media.available_for_shows && (
                        <div className="flex items-center gap-2 text-xs text-green-500">
                          <CheckCircle className="h-3 w-3" />
                          Available for EXA shows
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(media.created_at).toLocaleDateString()}
                        </span>
                        <ApproveRejectButtons id={media.id} type="media" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  No media applications yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Link
              href="/admin/opportunities"
              className="p-4 rounded-lg border hover:border-primary/50 transition-all text-center"
            >
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-pink-500" />
              <p className="font-medium">Gigs</p>
            </Link>
            <Link
              href="/admin/models"
              className="p-4 rounded-lg border hover:border-primary/50 transition-all text-center"
            >
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Models</p>
            </Link>
            <Link
              href="/admin/fans"
              className="p-4 rounded-lg border hover:border-pink-500/50 transition-all text-center"
            >
              <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="font-medium">Fans</p>
            </Link>
            <Link
              href="/admin/transactions"
              className="p-4 rounded-lg border hover:border-yellow-500/50 transition-all text-center"
            >
              <Coins className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="font-medium">Transactions</p>
            </Link>
            <Link
              href="/admin/analytics"
              className="p-4 rounded-lg border hover:border-primary/50 transition-all text-center"
            >
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Analytics</p>
            </Link>
            <Link
              href="/admin/settings"
              className="p-4 rounded-lg border hover:border-primary/50 transition-all text-center"
            >
              <Settings className="h-8 w-8 mx-auto mb-2 text-gray-500" />
              <p className="font-medium">Settings</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
