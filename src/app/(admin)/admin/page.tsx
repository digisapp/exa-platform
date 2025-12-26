import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Sparkles,
  Trophy,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Settings,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage models, opportunities, and applications</p>
        </div>
        <Button asChild>
          <Link href="/admin/opportunities/new">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Opportunity
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground">Pending Approval</p>
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
                <p className="text-sm text-muted-foreground">Opportunities</p>
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
      </div>

      {/* Main Content */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="applications">
            <Clock className="h-4 w-4 mr-2" />
            Pending Applications ({pendingApplications})
          </TabsTrigger>
          <TabsTrigger value="models">
            <Users className="h-4 w-4 mr-2" />
            Recent Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>Review and approve model applications</CardDescription>
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
                          {app.model?.name || app.model?.username} → {app.opportunity?.title}
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </div>
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
              <CardTitle>Recent Models</CardTitle>
              <CardDescription>Newly joined models</CardDescription>
            </CardHeader>
            <CardContent>
              {recentModels && recentModels.length > 0 ? (
                <div className="space-y-4">
                  {recentModels.map((model: any) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold">
                          {model.name?.charAt(0) || model.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{model.name || model.username}</p>
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
                          <Link href={`/models/${model.username}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No models yet
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/opportunities"
              className="p-4 rounded-lg border hover:border-primary/50 transition-all text-center"
            >
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-pink-500" />
              <p className="font-medium">Manage Opportunities</p>
            </Link>
            <Link
              href="/admin/models"
              className="p-4 rounded-lg border hover:border-primary/50 transition-all text-center"
            >
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Manage Models</p>
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
