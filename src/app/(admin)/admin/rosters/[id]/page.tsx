"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Copy, Check, ExternalLink, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, ChevronsUp, X, Search, Plus, Save, Instagram, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";

interface RosterModel {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  state: string | null;
  height: string | null;
  hair_color: string | null;
  dob: string | null;
  is_verified?: boolean | null;
  instagram_name: string | null;
  instagram_followers: number | null;
}

interface RosterMeta {
  id: string;
  share_token: string;
  title: string;
  client_name: string | null;
  note: string | null;
  view_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

function name(m: RosterModel) {
  return [m.first_name, m.last_name].filter(Boolean).join(" ").trim() || m.username;
}

function formatFollowers(n: number | null): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

// "@user · 24 · 5'9" · Blonde · CA" — sub-line shown under a model's name (admin only)
function metaLine(m: RosterModel): string {
  const age = ageFromDob(m.dob);
  const parts = [age != null ? `${age}` : null, m.height, m.hair_color, m.state].filter(Boolean);
  return `@${m.username}${parts.length ? " · " + parts.join(" · ") : ""}`;
}

function Avatar({ m, size = 44 }: { m: RosterModel; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}>
      {m.profile_photo_url && !err ? (
        <img src={m.profile_photo_url} alt={name(m)} className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        <span className="text-sm font-bold">{name(m).charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export default function RosterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<RosterMeta | null>(null);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [note, setNote] = useState("");
  const [models, setModels] = useState<RosterModel[]>([]);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add-models search
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<RosterModel[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  // Current member ids, kept in a ref so the search effect doesn't re-fetch on every reorder.
  const memberIdsRef = useRef<Set<string>>(new Set());
  memberIdsRef.current = new Set(models.map((m) => m.id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rosters/${id}`);
      if (!res.ok) throw new Error();
      const { roster, models: m } = await res.json();
      setMeta(roster);
      setTitle(roster.title);
      setClientName(roster.client_name || "");
      setNote(roster.note || "");
      setModels(m || []);
      setDirty(false);
    } catch {
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const urlFor = () =>
    meta && typeof window !== "undefined" ? `${window.location.origin}/roster/${meta.share_token}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(urlFor());
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  // ----- membership mutations -----
  const move = (i: number, dir: -1 | 1) => {
    setModels((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };
  const moveTop = (i: number) => {
    setModels((prev) => {
      if (i <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.unshift(item);
      return next;
    });
    setDirty(true);
  };
  const removeModel = (mid: string) => {
    setModels((prev) => prev.filter((m) => m.id !== mid));
    setDirty(true);
  };
  const addModel = (m: RosterModel) => {
    setModels((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    setDirty(true);
    setAddResults((prev) => prev.filter((x) => x.id !== m.id));
  };

  // ----- add search (reuses the admin models API) -----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!addQuery.trim()) { setAddResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setAddLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1", pageSize: "20", search: addQuery,
          approval: "approved", status: "active", claim: "all",
          sortField: "instagram_followers", sortDirection: "desc",
        });
        const res = await fetch(`/api/admin/models?${params}`);
        const { models: found } = await res.json();
        setAddResults((found || []).filter((m: RosterModel) => !memberIdsRef.current.has(m.id)));
      } catch {
        setAddResults([]);
      } finally {
        setAddLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [addQuery]);

  // Drop any result that is now in the roster (without re-fetching).
  useEffect(() => {
    setAddResults((prev) => prev.filter((r) => !memberIdsRef.current.has(r.id)));
  }, [models]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ----- save -----
  const save = async () => {
    if (!title.trim()) { toast.error("Title can't be empty"); return; }
    if (models.length === 0) { toast.error("Add at least one model"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/rosters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, client_name: clientName, note,
          model_ids: models.map((m) => m.id),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error); }
      toast.success("Roster saved");
      setDirty(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleRevoke = async () => {
    if (!meta) return;
    try {
      const res = await fetch(`/api/admin/rosters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoked: !meta.revoked_at }),
      });
      if (!res.ok) throw new Error();
      toast.success(meta.revoked_at ? "Re-activated" : "Revoked");
      load();
    } catch { toast.error("Failed to update"); }
  };

  const deleteRoster = async () => {
    if (!meta) return;
    if (!window.confirm(`Delete "${meta.title}"? This permanently removes the shared link.`)) return;
    try {
      const res = await fetch(`/api/admin/rosters/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Roster deleted");
      router.push("/admin/rosters");
    } catch { toast.error("Failed to delete"); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!meta) {
    return (
      <div className="container px-8 py-8">
        <p className="text-muted-foreground">Roster not found. <Link href="/admin/rosters" className="text-pink-500 hover:underline">Back to rosters</Link></p>
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 lg:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/rosters"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Edit roster</h1>
            <p className="text-muted-foreground text-sm">{models.length} models · {meta.view_count} views</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={urlFor()} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Preview</a>
          </Button>
          <Button onClick={save} disabled={saving || !dirty}
            className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* Share link */}
      <Card>
        <CardContent className="pt-6 flex items-center gap-2">
          <Input readOnly value={urlFor()} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button variant="outline" size="icon" onClick={copyLink} title="Copy link">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleRevoke}
            className={meta.revoked_at ? "text-green-500 border-green-500/40" : "text-amber-500 border-amber-500/40"}>
            {meta.revoked_at ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            {meta.revoked_at ? "Re-activate" : "Revoke"}
          </Button>
          <Button variant="outline" size="sm" onClick={deleteRoster} className="text-red-500 border-red-500/40">
            <Trash2 className="h-4 w-4 mr-1" />Delete
          </Button>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client">Client name</Label>
            <Input id="client" value={clientName} placeholder="Optional" onChange={(e) => { setClientName(e.target.value); setDirty(true); }} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="note">Note for client</Label>
            <Textarea id="note" rows={2} value={note} placeholder="Optional intro shown at the top of the roster page"
              onChange={(e) => { setNote(e.target.value); setDirty(true); }} />
          </div>
        </CardContent>
      </Card>

      {/* Add models */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Add models</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search by name, username, email…" value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)} />
            {addLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          {addResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
              {addResults.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 hover:bg-muted/50">
                  <Avatar m={m} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{name(m)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {metaLine(m)}
                    </p>
                  </div>
                  {formatFollowers(m.instagram_followers) && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-pink-500 shrink-0" title="Instagram followers">
                      <Instagram className="h-3.5 w-3.5" />{formatFollowers(m.instagram_followers)}
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => addModel(m)} className="text-pink-500 border-pink-500/40">
                    <Plus className="h-4 w-4 mr-1" />Add
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: to bulk-add by attributes (e.g. all blonde 5&apos;9&quot;+), use <Link href="/admin/models" className="text-pink-500 hover:underline">Models</Link> → filter → select → Create roster.
          </p>
        </CardContent>
      </Card>

      {/* Model list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Models in this roster</span>
            <Badge variant="outline">{models.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No models yet — add some above.</p>
          ) : (
            <div className="border rounded-lg divide-y">
              {models.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-2.5">
                  <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">{i + 1}</span>
                  <Avatar m={m} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {name(m)}
                      {m.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-pink-400" />}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {metaLine(m)}
                    </p>
                  </div>
                  {m.instagram_name && (
                    <a href={`https://instagram.com/${m.instagram_name.replace(/^@/, "").replace(/\s+/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-pink-500 hover:text-pink-400 hidden sm:flex items-center gap-1 shrink-0" title={`@${m.instagram_name.replace(/^@/, "")} on Instagram`}>
                      <Instagram className="h-4 w-4" />
                      {formatFollowers(m.instagram_followers) && (
                        <span className="text-xs tabular-nums">{formatFollowers(m.instagram_followers)}</span>
                      )}
                    </a>
                  )}
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveTop(i)} disabled={i === 0} title="Move to top">
                      <ChevronsUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === models.length - 1} title="Move down">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => removeModel(m.id)} title="Remove">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky save bar when dirty */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="flex items-center gap-3 bg-background border rounded-full shadow-lg px-4 py-2">
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
            <Button size="sm" onClick={save} disabled={saving}
              className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
