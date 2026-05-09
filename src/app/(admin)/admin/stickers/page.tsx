"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Star,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Search,
  X,
} from "lucide-react";

interface Sticker {
  id: string;
  name: string;
  description: string | null;
  url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  tags: string[];
  category: string | null;
  model_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  use_count: number;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  "reactions",
  "celebrations",
  "models",
  "effects",
  "stamps",
  "miami",
  "love",
  "fire",
];

export default function AdminStickersPage() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Upload form state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stickers");
      const data = await res.json();
      setStickers(data.stickers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stickers.filter((s) => {
      if (filterActive === "active" && !s.is_active) return false;
      if (filterActive === "inactive" && s.is_active) return false;
      if (filterCategory && s.category !== filterCategory) return false;
      if (q) {
        const inName = s.name.toLowerCase().includes(q);
        const inTags = s.tags.some((t) => t.includes(q));
        if (!inName && !inTags) return false;
      }
      return true;
    });
  }, [stickers, search, filterCategory, filterActive]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    if (!name) {
      const cleaned = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      setName(cleaned);
    }
    e.target.value = "";
  };

  const resetForm = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setName("");
    setDescription("");
    setCategory("");
    setTags("");
    setIsFeatured(false);
    setError(null);
  };

  const onUpload = async () => {
    if (!file) {
      setError("Pick a file first");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim());
      if (description.trim()) fd.append("description", description.trim());
      if (category) fd.append("category", category);
      if (tags.trim()) fd.append("tags", tags.trim());
      if (isFeatured) fd.append("isFeatured", "true");

      const res = await fetch("/api/admin/stickers", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (s: Sticker) => {
    await fetch(`/api/admin/stickers/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.is_active }),
    });
    setStickers((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x))
    );
  };

  const toggleFeatured = async (s: Sticker) => {
    await fetch(`/api/admin/stickers/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !s.is_featured }),
    });
    setStickers((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_featured: !s.is_featured } : x))
    );
  };

  const onDelete = async (s: Sticker) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/stickers/${s.id}`, { method: "DELETE" });
    if (res.ok) setStickers((prev) => prev.filter((x) => x.id !== s.id));
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto pb-32">
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-pink-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">EXA Stickers</h1>
          <p className="text-sm text-white/50">
            Brand-native GIF & sticker library for the Live Wall.
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-4 w-4 text-pink-400" />
          <h2 className="text-sm font-semibold text-white">Upload sticker</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
          {/* File picker / preview */}
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-[180px] h-[180px] rounded-xl border-2 border-dashed border-white/15 bg-black/30 flex items-center justify-center overflow-hidden hover:border-pink-500/40 transition-colors"
            >
              {filePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filePreview} alt="preview" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center text-white/40 text-xs px-2">
                  <Upload className="h-5 w-5 mx-auto mb-1" />
                  Click to choose<br />GIF / WebP / PNG
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/gif,image/webp,image/png,image/jpeg,image/apng"
              onChange={onFileChange}
              className="hidden"
            />
            {file && (
              <button
                onClick={resetForm}
                className="mt-2 text-xs text-white/50 hover:text-white/80 flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-white/60 mb-1 block">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Crown Glow"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/40"
              >
                <option value="">— None —</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Tags (comma-separated)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="fire, hearts, miami"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-white/60 mb-1 block">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Internal note"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="featured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/40"
              />
              <label htmlFor="featured" className="text-sm text-white/70">
                Feature in picker
              </label>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                onClick={onUpload}
                disabled={uploading || !file}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload sticker"}
              </button>
              {error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or tag…"
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as any)}
          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <span className="text-xs text-white/40 ml-auto">
          {filtered.length} of {stickers.length}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-white/40">
          <Loader2 className="h-6 w-6 animate-spin inline" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-white/40 text-sm">
          No stickers yet. Upload your first above.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`group relative rounded-xl border ${
                s.is_active ? "border-white/10" : "border-red-500/20 opacity-60"
              } bg-black/40 overflow-hidden`}
            >
              <div className="aspect-square bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)] flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={s.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-xs font-medium text-white truncate" title={s.name}>
                    {s.name}
                  </div>
                  {s.is_featured && (
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>{s.category || "—"}</span>
                  <span>{s.use_count} uses</span>
                </div>
              </div>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <button
                  onClick={() => toggleFeatured(s)}
                  title={s.is_featured ? "Unfeature" : "Feature"}
                  className="h-7 w-7 rounded-md bg-black/80 border border-white/10 flex items-center justify-center hover:border-amber-400/40"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${s.is_featured ? "text-amber-400 fill-amber-400" : "text-white/60"}`}
                  />
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  title={s.is_active ? "Deactivate" : "Activate"}
                  className="h-7 w-7 rounded-md bg-black/80 border border-white/10 flex items-center justify-center hover:border-emerald-400/40"
                >
                  {s.is_active ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-white/60" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(s)}
                  title="Delete"
                  className="h-7 w-7 rounded-md bg-black/80 border border-white/10 flex items-center justify-center hover:border-red-400/40"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
