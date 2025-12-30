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
  Building2,
  Mail,
  Globe,
  Instagram,
  Coins,
  CreditCard,
  Heart,
  UserPlus,
  BarChart3,
  Banknote,
  Calendar,
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

  // Get total transactions count
  const { count: totalTransactions } = await supabase
    .from("coin_transactions")
    .select("*", { count: "exact", head: true });

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
          <Button variant="outline" asChild className="text-green-500 border-green-500/50 hover:bg-green-500/10">
            <Link href="/admin/payouts">
              <Banknote className="h-4 w-4 mr-2" />
              Payouts
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

      {/* Stats - Only 4 boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalModels?.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Models</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/10">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFans?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Total Fans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Coins className="h-6 w-6 text-yellow-500" />
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
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CreditCard className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTransactions?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="model-apps" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2">
          <TabsTrigger value="model-apps">
            <UserPlus className="h-4 w-4 mr-2" />
            Model Apps ({pendingModelApps || 0})
          </TabsTrigger>
          <TabsTrigger value="brands">
            <Building2 className="h-4 w-4 mr-2" />
            Brands ({pendingBrands || 0})
          </TabsTrigger>
        </TabsList>

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
                      {/* DOB and Height */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {app.date_of_birth && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">DOB:</span>
                            <span>{new Date(app.date_of_birth).toLocaleDateString()}</span>
                            <span className="text-muted-foreground">
                              ({Math.floor((new Date().getTime() - new Date(app.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs)
                            </span>
                          </div>
                        )}
                        {app.height && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Height:</span>
                            <span>{app.height}</span>
                          </div>
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
