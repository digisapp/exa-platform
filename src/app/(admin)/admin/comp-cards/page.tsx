"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Instagram,
  Loader2,
  RefreshCw,
  Star,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Admin comp card covers: auto-generated Instagram-ready fronts (1080x1350)
 * for every 4★/5★ model, rendered by /api/admin/comp-cards/card. Front only —
 * username + profile URL, never real names or measurements (these get posted
 * publicly). Download → post on @examodels + collab-tag the model.
 */

interface CardModel {
  id: string;
  username: string | null;
  profile_photo_url: string | null;
  admin_rating: number | null;
  instagram_name: string | null;
}

type StarFilter = "all" | "5" | "4";

function cardUrl(m: CardModel, scale: number) {
  const params = new URLSearchParams({
    photo: m.profile_photo_url || "",
    username: m.username || "",
    scale: String(scale),
  });
  return `/api/admin/comp-cards/card?${params.toString()}`;
}

export default function AdminCompCardsPage() {
  const [models, setModels] = useState<CardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StarFilter>("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from("models") as any)
        .select("id, username, profile_photo_url, admin_rating, instagram_name")
        .in("admin_rating", [4, 5])
        .is("deleted_at", null)
        .not("profile_photo_url", "is", null)
        .not("username", "is", null)
        .order("admin_rating", { ascending: false })
        .order("username", { ascending: true });
      if (error) throw error;
      setModels(data || []);
    } catch (err) {
      console.error("Error loading models:", err);
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = models.filter(
    (m) => filter === "all" || m.admin_rating === Number(filter)
  );

  const handleDownload = async (m: CardModel) => {
    setDownloading(m.id);
    try {
      const res = await fetch(cardUrl(m, 2));
      if (!res.ok) throw new Error("Render failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exa-comp-card-${m.username}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Download failed — long-press the image to save instead");
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyCaption = async (m: CardModel) => {
    const ig = m.instagram_name ? ` @${m.instagram_name.replace(/^@/, "")}` : "";
    const caption = `✨ EXA Spotlight:${ig ? ` ${ig.trim()}` : ` ${m.username}`}\n\nexamodels.com/${m.username}`;
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Caption copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="container px-4 md:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Star className="h-7 w-7 text-yellow-400" />
              Comp Card Covers
            </h1>
            <p className="text-muted-foreground">
              Instagram-ready fronts for {models.length} top-rated models · download, post, collab-tag
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "5", "4"] as StarFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : `${f}★`}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground py-24 text-center">
          No {filter !== "all" ? `${filter}-star ` : ""}models with photos found.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              {/* Long-press on iPhone saves this image directly */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardUrl(m, 1)}
                alt={`Comp card for ${m.username}`}
                loading="lazy"
                className="w-full aspect-[4/5] object-cover bg-black"
              />
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/${m.username}`}
                    target="_blank"
                    className="text-sm font-medium truncate hover:underline flex items-center gap-1"
                  >
                    {m.username}
                    <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  </Link>
                  <span className="text-xs text-yellow-400 flex-shrink-0">
                    {"★".repeat(m.admin_rating || 0)}
                  </span>
                </div>
                {m.instagram_name && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Instagram className="h-3 w-3 flex-shrink-0" />
                    @{m.instagram_name.replace(/^@/, "")}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(m)}
                    disabled={downloading === m.id}
                  >
                    {downloading === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span className="ml-1">Save</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyCaption(m)}
                    title="Copy Instagram caption"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
