"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera,
  Search,
  RefreshCw,
  Users,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

interface CompCardModel {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  instagram_name: string | null;
  city: string | null;
  state: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  eye_color: string | null;
  hair_color: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  profile_photo_url: string | null;
  comp_card_exported_at: string;
}

export default function CompCardLeadsPage() {
  const [models, setModels] = useState<CompCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comp-card-exports");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const filtered = models.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.first_name || "").toLowerCase().includes(q) ||
      (m.last_name || "").toLowerCase().includes(q) ||
      (m.username || "").toLowerCase().includes(q) ||
      (m.instagram_name || "").toLowerCase().includes(q) ||
      (m.city || "").toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    const headers = [
      "Name", "Username", "Instagram", "City", "State",
      "Height", "Bust", "Waist", "Hips", "Eyes", "Hair",
      "Dress", "Shoes", "Exported At",
    ];
    const rows = filtered.map((m) => [
      [m.first_name, m.last_name].filter(Boolean).join(" "),
      m.username || "",
      m.instagram_name ? `@${m.instagram_name}` : "",
      m.city || "",
      m.state || "",
      m.height || "",
      m.bust || "",
      m.waist || "",
      m.hips || "",
      m.eye_color || "",
      m.hair_color || "",
      m.dress_size || "",
      m.shoe_size || "",
      new Date(m.comp_card_exported_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comp-card-models-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Comp Card Exports
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadModels}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{models.length}</p>
            <p className="text-xs text-muted-foreground">Models exported a comp card</p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Models */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No models found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {m.profile_photo_url ? (
                    <Image
                      src={m.profile_photo_url}
                      alt=""
                      width={48}
                      height={48}
                      className="rounded-full object-cover w-12 h-12 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Name + profile link */}
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">
                        {[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}
                      </p>
                      {m.username && (
                        <Link
                          href={`/${m.username}`}
                          target="_blank"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      {m.username && <span>@{m.username}</span>}
                      {m.instagram_name && <span>IG: @{m.instagram_name}</span>}
                      {(m.city || m.state) && (
                        <span>{[m.city, m.state].filter(Boolean).join(", ")}</span>
                      )}
                    </div>

                    {/* Measurements */}
                    {(m.height || m.bust || m.waist || m.hips) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground pt-1">
                        {m.height && <span>H: {m.height}</span>}
                        {m.bust && <span>B: {m.bust}</span>}
                        {m.waist && <span>W: {m.waist}</span>}
                        {m.hips && <span>Hp: {m.hips}</span>}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(m.comp_card_exported_at).toLocaleDateString()}{" "}
                    {new Date(m.comp_card_exported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
