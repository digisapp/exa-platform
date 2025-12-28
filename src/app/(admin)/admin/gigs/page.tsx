"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Sparkles,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface Opportunity {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  location_city: string;
  location_state: string;
  start_at: string;
  compensation_type: string;
  compensation_amount: number;
  spots: number;
  spots_filled: number;
  status: string;
  created_at: string;
}

interface Application {
  id: string;
  opportunity_id: string;
  model_id: string;
  status: string;
  applied_at: string;
  model: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string;
  };
}

export default function AdminGigsPage() {
  const [gigs, setGigs] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGig, setSelectedGig] = useState<string | null>(null);
  const [processingApp, setProcessingApp] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    type: "show",
    description: "",
    location_city: "",
    location_state: "",
    start_at: "",
    compensation_type: "paid",
    compensation_amount: 0,
    spots: 10,
  });

  useEffect(() => {
    loadGigs();
  }, []);

  useEffect(() => {
    if (selectedGig) {
      loadApplications(selectedGig);
    }
  }, [selectedGig]);

  async function loadGigs() {
    setLoading(true);
    const { data } = await (supabase
      .from("opportunities") as any)
      .select("*")
      .order("created_at", { ascending: false });
    setGigs(data || []);
    setLoading(false);
  }

  async function loadApplications(gigId: string) {
    const { data } = await (supabase
      .from("opportunity_applications") as any)
      .select(`
        *,
        model:models(id, username, first_name, last_name, profile_photo_url)
      `)
      .eq("opportunity_id", gigId)
      .order("applied_at", { ascending: false });
    setApplications(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      // Generate slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
        "-" + Date.now().toString(36);

      const { error } = await (supabase
        .from("opportunities") as any)
        .insert({
          ...formData,
          slug,
          status: "open",
          visibility: "public",
          compensation_amount: formData.compensation_amount * 100, // Convert to cents
        });

      if (error) throw error;

      toast.success("Gig created successfully!");
      setShowCreateForm(false);
      setFormData({
        title: "",
        type: "show",
        description: "",
        location_city: "",
        location_state: "",
        start_at: "",
        compensation_type: "paid",
        compensation_amount: 0,
        spots: 10,
      });
      loadGigs();
    } catch (error) {
      console.error("Error creating gig:", error);
      toast.error("Failed to create gig");
    } finally {
      setCreating(false);
    }
  }

  async function handleApplicationAction(appId: string, action: "accepted" | "rejected") {
    setProcessingApp(appId);
    try {
      const app = applications.find(a => a.id === appId);
      if (!app) return;

      // Update application status
      const { error } = await (supabase
        .from("opportunity_applications") as any)
        .update({
          status: action,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", appId);

      if (error) throw error;

      // If accepted, send notification via chat
      if (action === "accepted" && app.model) {
        const gig = gigs.find(g => g.id === app.opportunity_id);

        // Get admin's actor id
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminActor } = await supabase
            .from("actors")
            .select("id")
            .eq("user_id", user.id)
            .single() as { data: { id: string } | null };

          // Get model's actor id
          const { data: modelActor } = await supabase
            .from("actors")
            .select("id")
            .eq("user_id", app.model.id)
            .eq("type", "model")
            .single() as { data: { id: string } | null };

          if (adminActor && modelActor) {
            // Create or get conversation
            const { data: existingConv } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("actor_id", adminActor.id) as { data: { conversation_id: string }[] | null };

            let conversationId: string | null = null;

            if (existingConv) {
              for (const cp of existingConv) {
                const { data: hasModel } = await supabase
                  .from("conversation_participants")
                  .select("actor_id")
                  .eq("conversation_id", cp.conversation_id)
                  .eq("actor_id", modelActor.id)
                  .single();
                if (hasModel) {
                  conversationId = cp.conversation_id;
                  break;
                }
              }
            }

            if (!conversationId) {
              const { data: newConv } = await (supabase
                .from("conversations") as any)
                .insert({ type: "direct" })
                .select()
                .single();
              if (newConv) {
                conversationId = newConv.id;
                await (supabase.from("conversation_participants") as any).insert([
                  { conversation_id: conversationId, actor_id: adminActor.id },
                  { conversation_id: conversationId, actor_id: modelActor.id },
                ]);
              }
            }

            if (conversationId) {
              await (supabase.from("messages") as any).insert({
                conversation_id: conversationId,
                sender_id: adminActor.id,
                content: `Congratulations! You've been accepted for "${gig?.title || "a gig"}". We'll be in touch with more details soon!`,
                is_system: false,
              });
            }
          }
        }
      }

      toast.success(action === "accepted" ? "Model accepted!" : "Application declined");
      loadApplications(app.opportunity_id);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setProcessingApp(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manage Gigs</h1>
            <p className="text-muted-foreground">Create and manage opportunities for models</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Gig
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Gig</CardTitle>
            <CardDescription>Fill in the details for the new opportunity</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Fashion Week Show"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show">Show</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="hosting">Hosting</SelectItem>
                      <SelectItem value="fun">Fun</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the opportunity..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    placeholder="Miami"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.location_state}
                    onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                    placeholder="FL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compensation">Compensation Type</Label>
                  <Select
                    value={formData.compensation_type}
                    onValueChange={(v) => setFormData({ ...formData, compensation_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="tfp">TFP (Trade for Print)</SelectItem>
                      <SelectItem value="perks">Perks</SelectItem>
                      <SelectItem value="exposure">Exposure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    value={formData.compensation_amount}
                    onChange={(e) => setFormData({ ...formData, compensation_amount: parseInt(e.target.value) || 0 })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spots">Spots Available</Label>
                  <Input
                    id="spots"
                    type="number"
                    min="1"
                    value={formData.spots}
                    onChange={(e) => setFormData({ ...formData, spots: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Gig
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Gigs List with Applications */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gigs Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              All Gigs ({gigs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {gigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No gigs created yet</p>
              </div>
            ) : (
              gigs.map((gig) => (
                <div
                  key={gig.id}
                  onClick={() => setSelectedGig(gig.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedGig === gig.id
                      ? "border-pink-500 bg-pink-500/10"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{gig.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant="outline" className="capitalize">{gig.type}</Badge>
                        <Badge variant={gig.status === "open" ? "default" : "secondary"}>
                          {gig.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{gig.spots_filled || 0}/{gig.spots} spots</p>
                      {gig.start_at && (
                        <p className="text-muted-foreground">
                          {new Date(gig.start_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {(gig.location_city || gig.location_state) && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {gig.location_city}, {gig.location_state}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Applications Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Applications {selectedGig && `(${applications.length})`}
            </CardTitle>
            <CardDescription>
              {selectedGig
                ? `Showing applications for: ${gigs.find(g => g.id === selectedGig)?.title}`
                : "Select a gig to view applications"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {!selectedGig ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a gig to view applications</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No applications yet</p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                      {app.model?.profile_photo_url ? (
                        <img
                          src={app.model.profile_photo_url}
                          alt={app.model.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          {app.model?.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/${app.model?.username}`}
                        className="font-medium hover:text-pink-500"
                      >
                        {app.model?.first_name} {app.model?.last_name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        @{app.model?.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplicationAction(app.id, "rejected")}
                          disabled={processingApp === app.id}
                        >
                          {processingApp === app.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplicationAction(app.id, "accepted")}
                          disabled={processingApp === app.id}
                        >
                          {processingApp === app.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Badge
                        variant={app.status === "accepted" ? "default" : "secondary"}
                        className={app.status === "accepted" ? "bg-green-500" : ""}
                      >
                        {app.status === "accepted" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {app.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
