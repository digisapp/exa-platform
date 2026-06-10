"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Instagram, MapPin, BadgeCheck, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface RosterModel {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  height: string | null;
  hair_color: string | null;
  eye_color: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  city: string | null;
  state: string | null;
  focus_tags: string[] | null;
  is_verified: boolean | null;
  instagram_name: string | null;
  instagram_followers: number | null;
  tiktok_username: string | null;
  tiktok_followers: number | null;
  photos: string[];
}

function displayName(m: RosterModel) {
  const n = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return n || m.username;
}

function location(m: RosterModel) {
  return [m.city, m.state].filter(Boolean).join(", ");
}

function igUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "").replace(/\s+/g, "")}`;
}
function ttUrl(handle: string) {
  return `https://tiktok.com/@${handle.replace(/^@/, "").replace(/\s+/g, "")}`;
}
function formatFollowers(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function heroImage(m: RosterModel) {
  return m.profile_photo_url || m.photos[0] || null;
}

function MeasureRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-white/10 text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

export function RosterGallery({
  title, clientName, note, models,
}: {
  title: string;
  clientName: string | null;
  note: string | null;
  models: RosterModel[];
}) {
  const [active, setActive] = useState<RosterModel | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  const open = (m: RosterModel) => { setActive(m); setPhotoIdx(0); };
  const gallery = active ? (active.photos.length ? active.photos : [heroImage(active)].filter(Boolean) as string[]) : [];
  const nextPhoto = () => setPhotoIdx((i) => (i + 1) % gallery.length);
  const prevPhoto = () => setPhotoIdx((i) => (i - 1 + gallery.length) % gallery.length);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-gradient-to-b from-pink-500/10 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Link href="/" className="inline-block mb-5" aria-label="EXA Models home">
            <Image src="/exa-logo-white.png" alt="EXA Models" width={120} height={48} className="h-10 w-auto" priority />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
          <div className="mt-2 text-white/60">
            {clientName && <span>Prepared for {clientName} · </span>}
            {models.length} model{models.length === 1 ? "" : "s"}
          </div>
          {note && <p className="mt-4 max-w-2xl text-white/70">{note}</p>}
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {models.length === 0 ? (
          <p className="text-white/50 text-center py-20">This roster is empty.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {models.map((m) => {
              const hero = heroImage(m);
              return (
                <button
                  key={m.id}
                  onClick={() => open(m)}
                  className="group text-left rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors"
                >
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-pink-500/10 to-violet-500/10 overflow-hidden">
                    {hero ? (
                      <img src={hero} alt={displayName(m)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/30">
                        {displayName(m).charAt(0).toUpperCase()}
                      </div>
                    )}
                    {m.is_verified && (
                      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur rounded-full p-1">
                        <BadgeCheck className="h-4 w-4 text-pink-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold truncate flex items-center gap-1">{displayName(m)}</p>
                    <p className="text-xs text-white/50 truncate">
                      {[m.height, m.hair_color].filter(Boolean).join(" · ") || location(m) || " "}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <footer className="mt-16 pt-8 border-t border-white/10 text-center text-white/40 text-sm">
          Curated by EXA Models · To book any of these models, reply to your EXA contact.
        </footer>
      </main>

      {/* Detail lightbox */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#0d0d14] border-white/10 text-white">
          {active && (
            <div className="grid md:grid-cols-2 max-h-[90vh] overflow-y-auto">
              {/* Photo viewer */}
              <div className="relative bg-black aspect-[3/4] md:aspect-auto md:min-h-[500px]">
                {gallery.length > 0 ? (
                  <>
                    <img src={gallery[photoIdx]} alt={displayName(active)} className="w-full h-full object-cover" />
                    {gallery.length > 1 && (
                      <>
                        <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-3 py-1 text-xs">
                          {photoIdx + 1} / {gallery.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white/20">
                    {displayName(active).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-6 space-y-5">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    {displayName(active)}
                    {active.is_verified && <BadgeCheck className="h-5 w-5 text-pink-400" />}
                  </DialogTitle>
                  {location(active) && (
                    <p className="text-white/50 flex items-center gap-1 mt-1 text-sm">
                      <MapPin className="h-3.5 w-3.5" />{location(active)}
                    </p>
                  )}
                </div>

                {/* Social links first — clients want to reach Instagram/TikTok fast */}
                <div className="flex flex-col gap-2">
                  {active.instagram_name && (
                    <a href={igUrl(active.instagram_name)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 transition-colors">
                      <span className="flex items-center gap-2 font-medium"><Instagram className="h-4 w-4 text-pink-400" />Instagram</span>
                      <span className="text-white/60 text-sm">
                        @{active.instagram_name.replace(/^@/, "")}
                        {formatFollowers(active.instagram_followers) && ` · ${formatFollowers(active.instagram_followers)}`}
                      </span>
                    </a>
                  )}
                  {active.tiktok_username && (
                    <a href={ttUrl(active.tiktok_username)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                      <span className="flex items-center gap-2 font-medium">TikTok</span>
                      <span className="text-white/60 text-sm">
                        @{active.tiktok_username.replace(/^@/, "")}
                        {formatFollowers(active.tiktok_followers) && ` · ${formatFollowers(active.tiktok_followers)}`}
                      </span>
                    </a>
                  )}
                </div>

                <div>
                  <MeasureRow label="Height" value={active.height} />
                  <MeasureRow label="Bust" value={active.bust} />
                  <MeasureRow label="Waist" value={active.waist} />
                  <MeasureRow label="Hips" value={active.hips} />
                  <MeasureRow label="Dress" value={active.dress_size} />
                  <MeasureRow label="Shoe" value={active.shoe_size} />
                  <MeasureRow label="Hair" value={active.hair_color} />
                  <MeasureRow label="Eyes" value={active.eye_color} />
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setActive(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 rounded-full p-1.5 z-10">
            <X className="h-4 w-4" />
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
