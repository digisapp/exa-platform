"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickedSticker {
  id: string;
  url: string;
  mime_type: string;
}

interface Sticker {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  category: string | null;
  tags: string[];
  is_featured: boolean;
}

interface Props {
  onSelect: (sticker: PickedSticker) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "featured", label: "★" },
  { id: "reactions", label: "Reactions" },
  { id: "celebrations", label: "Hype" },
  { id: "love", label: "Love" },
  { id: "fire", label: "Fire" },
  { id: "miami", label: "Miami" },
  { id: "models", label: "Models" },
  { id: "effects", label: "FX" },
];

export function StickerPicker({ onSelect, onClose }: Props) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/stickers?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setStickers(d.stickers || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Defer one tick so the opening click doesn't immediately close
    const t = setTimeout(() => document.addEventListener("mousedown", onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stickers.filter((s) => {
      if (activeCategory === "featured") {
        if (!s.is_featured) return false;
      } else if (activeCategory && s.category !== activeCategory) {
        return false;
      }
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inTags = s.tags.some((t) => t.includes(q));
        if (!inName && !inTags) return false;
      }
      return true;
    });
  }, [stickers, search, activeCategory]);

  const handlePick = (s: Sticker) => {
    onSelect({ id: s.id, url: s.url, mime_type: s.mime_type });
    // Fire-and-forget telemetry
    fetch("/api/stickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    }).catch(() => {});
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[340px] rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Header: search */}
      <div className="p-2.5 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search EXA stickers…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-2 py-2 border-b border-white/10 overflow-x-auto scrollbar-none">
        {CATEGORIES.map((c) => (
          <button
            key={c.id || "all"}
            onClick={() => setActiveCategory(c.id)}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
              activeCategory === c.id
                ? "bg-pink-500/20 text-pink-300"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-h-[280px] overflow-y-auto p-2">
        {loading ? (
          <div className="py-12 text-center text-white/40">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-xs px-4">
            <Sparkles className="h-5 w-5 mx-auto mb-2 text-pink-400/60" />
            {stickers.length === 0
              ? "No EXA stickers yet. Admins can upload them in /admin/stickers."
              : "No matches."}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => handlePick(s)}
                title={s.name}
                className="aspect-square rounded-lg bg-white/5 hover:bg-white/10 hover:scale-105 transition-all p-1 flex items-center justify-center overflow-hidden border border-transparent hover:border-pink-500/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.url}
                  alt={s.name}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-white/10 text-[10px] text-white/30 flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-pink-400/60" />
        EXA original stickers
      </div>
    </div>
  );
}
