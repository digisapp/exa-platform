"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Copy, Check, ExternalLink, Trash2, Eye, EyeOff,
  Users, Share2,
} from "lucide-react";
import { toast } from "sonner";

interface Roster {
  id: string;
  share_token: string;
  title: string;
  client_name: string | null;
  note: string | null;
  view_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  model_count: number;
}

export default function AdminRostersPage() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rosters");
      if (!res.ok) throw new Error();
      const { rosters: data } = await res.json();
      setRosters(data || []);
    } catch {
      toast.error("Failed to load rosters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const urlFor = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/roster/${token}` : `/roster/${token}`;

  const copyLink = (r: Roster) => {
    navigator.clipboard.writeText(urlFor(r.share_token));
    setCopiedId(r.id);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRevoke = async (r: Roster) => {
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/rosters/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoked: !r.revoked_at }),
      });
      if (!res.ok) throw new Error();
      toast.success(r.revoked_at ? "Roster re-activated" : "Roster revoked");
      load();
    } catch {
      toast.error("Failed to update roster");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (r: Roster) => {
    if (!window.confirm(`Delete "${r.title}"? This permanently removes the shared link.`)) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/rosters/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Roster deleted");
      setRosters((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      toast.error("Failed to delete roster");
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (r: Roster) => {
    if (r.revoked_at) return <Badge variant="outline" className="text-red-500 border-red-500/40">Revoked</Badge>;
    if (r.expires_at && new Date(r.expires_at) < new Date())
      return <Badge variant="outline" className="text-amber-500 border-amber-500/40">Expired</Badge>;
    return <Badge variant="outline" className="text-green-500 border-green-500/40">Active</Badge>;
  };

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/models"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <Share2 className="h-7 w-7 text-pink-500" />
          <div>
            <h1 className="text-3xl font-bold">Client Rosters</h1>
            <p className="text-muted-foreground">{rosters.length} roster{rosters.length === 1 ? "" : "s"} shared with clients</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : rosters.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No rosters yet</p>
            <p className="text-sm mt-1">Go to <Link href="/admin/models" className="text-pink-500 hover:underline">Models</Link>, select models, and click &quot;Create roster&quot;.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rosters.map((r) => {
            const input = urlFor(r.share_token);
            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {r.title}
                        {statusBadge(r)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {r.client_name ? <span className="text-pink-400">{r.client_name}</span> : "No client name"}
                        {" · "}{r.model_count} model{r.model_count === 1 ? "" : "s"}
                        {" · "}<Eye className="inline h-3 w-3 mb-0.5" /> {r.view_count} view{r.view_count === 1 ? "" : "s"}
                        {" · "}created {new Date(r.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input readOnly value={input} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                    <Button variant="outline" size="icon" onClick={() => copyLink(r)} title="Copy link">
                      {copiedId === r.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                      <a href={input} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />Open
                      </a>
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => toggleRevoke(r)}
                      disabled={busyId === r.id}
                      className={r.revoked_at ? "text-green-500 border-green-500/40 hover:bg-green-500/10" : "text-amber-500 border-amber-500/40 hover:bg-amber-500/10"}
                    >
                      {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : r.revoked_at ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      {r.revoked_at ? "Re-activate" : "Revoke"}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => remove(r)}
                      disabled={busyId === r.id}
                      className="text-red-500 border-red-500/40 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  </div>
                  {r.note && <p className="text-sm text-muted-foreground italic">&ldquo;{r.note}&rdquo;</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
