"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Users,
  Search,
  Loader2,
  Instagram,
  Clock,
  CheckCircle,
  RefreshCw,
  Copy,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UnclaimedModel {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  instagram_name: string | null;
  instagram_followers: number | null;
  profile_photo_url: string | null;
  created_at: string;
  user_id: string | null;
  claimed_at: string | null;
  invite_sent_at: string | null;
}

export function ModelOutreachPanel() {
  const [models, setModels] = useState<UnclaimedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasEmailFilter, setHasEmailFilter] = useState<string>("all");
  const [hasInstagramFilter, setHasInstagramFilter] = useState<string>("all");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<string>("all");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadModels() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("models")
      .select(
        "id, username, first_name, last_name, email, instagram_name, instagram_followers, profile_photo_url, created_at, user_id, claimed_at, invite_sent_at"
      )
      .is("user_id", null)
      .is("claimed_at", null)
      .not("email", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load unclaimed models");
      console.error(error);
    } else {
      setModels(data || []);
    }
    setLoading(false);
  }

  const getDisplayName = (model: UnclaimedModel): string => {
    if (model.first_name || model.last_name) {
      return [model.first_name, model.last_name].filter(Boolean).join(" ");
    }
    return model.username || "Unknown";
  };

  const filteredModels = models.filter((model) => {
    const displayName = getDisplayName(model).toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      displayName.includes(q) ||
      (model.email?.toLowerCase().includes(q) ?? false) ||
      (model.instagram_name?.toLowerCase().includes(q) ?? false);

    const matchesEmail =
      hasEmailFilter === "all" ||
      (hasEmailFilter === "yes" && !!model.email) ||
      (hasEmailFilter === "no" && !model.email);

    const matchesInstagram =
      hasInstagramFilter === "all" ||
      (hasInstagramFilter === "yes" && !!model.instagram_name) ||
      (hasInstagramFilter === "no" && !model.instagram_name);

    const matchesInvite =
      inviteStatusFilter === "all" ||
      (inviteStatusFilter === "not_contacted" && !model.invite_sent_at) ||
      (inviteStatusFilter === "contacted" && !!model.invite_sent_at);

    return matchesSearch && matchesEmail && matchesInstagram && matchesInvite;
  });

  const stats = {
    total: models.length,
    withEmail: models.filter((m) => !!m.email).length,
    withInstagram: models.filter((m) => !!m.instagram_name).length,
    contacted: models.filter((m) => !!m.invite_sent_at).length,
  };

  const toggleSelection = (id: string) => {
    setSelectedModels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedModels.size === filteredModels.length) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(filteredModels.map((m) => m.id)));
    }
  };

  const selectNext100 = () => {
    const unselected = filteredModels.filter(
      (m) => !selectedModels.has(m.id) && !m.invite_sent_at
    );
    const next100 = unselected.slice(0, 100);
    setSelectedModels(new Set(next100.map((m) => m.id)));
  };

  const copyEmails = () => {
    const selectedEmailModels = models.filter(
      (m) => selectedModels.has(m.id) && m.email
    );
    if (selectedEmailModels.length === 0) {
      toast.error("No selected models have email addresses");
      return;
    }
    const emails = selectedEmailModels.map((m) => m.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success(`Copied ${selectedEmailModels.length} email(s) to clipboard`);
  };

  const exportCSV = () => {
    const selectedItems = models.filter((m) => selectedModels.has(m.id));
    if (selectedItems.length === 0) {
      toast.error("No models selected");
      return;
    }
    const headers = ["Name", "Email", "Instagram", "Followers", "Created"];
    const rows = selectedItems.map((m) => [
      getDisplayName(m),
      m.email || "",
      m.instagram_name || "",
      m.instagram_followers?.toString() || "",
      m.created_at ? format(new Date(m.created_at), "yyyy-MM-dd") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unclaimed-models-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedItems.length} model(s)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Unclaimed models from Nov 4, 2025 import (no user account, has email)
        </p>
        <Button variant="outline" size="sm" onClick={loadModels}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Users className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Unclaimed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withEmail}</p>
                <p className="text-sm text-muted-foreground">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Instagram className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withInstagram}</p>
                <p className="text-sm text-muted-foreground">With Instagram</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contacted}</p>
                <p className="text-sm text-muted-foreground">Contacted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, IG..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={hasEmailFilter} onValueChange={setHasEmailFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Has Email" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Email</SelectItem>
              <SelectItem value="yes">Has Email</SelectItem>
              <SelectItem value="no">No Email</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hasInstagramFilter} onValueChange={setHasInstagramFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Has Instagram" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instagram</SelectItem>
              <SelectItem value="yes">Has Instagram</SelectItem>
              <SelectItem value="no">No Instagram</SelectItem>
            </SelectContent>
          </Select>
          <Select value={inviteStatusFilter} onValueChange={setInviteStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Invite Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_contacted">Not Contacted</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedModels.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedModels(new Set())}
            >
              Clear ({selectedModels.size})
            </Button>
            <Button variant="outline" size="sm" onClick={copyEmails}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Emails
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Model List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {filteredModels.length} Model{filteredModels.length !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectNext100}>
                Select Next 100
              </Button>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedModels.size === filteredModels.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                className={`p-4 rounded-lg border transition-colors ${
                  selectedModels.has(model.id)
                    ? "border-pink-500 bg-pink-500/5"
                    : "border-border hover:border-pink-500/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedModels.has(model.id)}
                    onChange={() => toggleSelection(model.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />

                  {model.profile_photo_url && (
                    <img
                      src={model.profile_photo_url}
                      alt={getDisplayName(model)}
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{getDisplayName(model)}</h3>
                      {model.invite_sent_at ? (
                        <Badge className="bg-emerald-500 text-white text-xs">
                          Contacted
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500 text-white text-xs">
                          Not Contacted
                        </Badge>
                      )}
                      {model.instagram_followers && model.instagram_followers > 10000 && (
                        <Badge variant="secondary" className="text-xs">
                          {model.instagram_followers >= 1000000
                            ? `${(model.instagram_followers / 1000000).toFixed(1)}M`
                            : `${(model.instagram_followers / 1000).toFixed(1)}K`}{" "}
                          followers
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {model.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {model.email}
                        </span>
                      )}
                      {model.instagram_name && (
                        <a
                          href={`https://instagram.com/${model.instagram_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-pink-500"
                        >
                          <Instagram className="h-3.5 w-3.5" />@
                          {model.instagram_name}
                        </a>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Added {format(new Date(model.created_at), "MMM d, yyyy")}
                      </span>
                    </div>

                    {model.invite_sent_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Invite sent:{" "}
                        {format(new Date(model.invite_sent_at), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No unclaimed models found matching your filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
