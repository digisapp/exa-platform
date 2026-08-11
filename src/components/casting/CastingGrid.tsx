"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, User, Instagram } from "lucide-react";

export interface CastingCard {
  applicationId: string;
  username: string;
  photoUrl: string | null;
  height: string | null;
  instagramHandle: string | null;
  instagramFollowers: number | null;
  tiktokHandle: string | null;
  tiktokFollowers: number | null;
  liked: boolean;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default function CastingGrid({
  token,
  cards,
}: {
  token: string;
  cards: CastingCard[];
}) {
  const [liked, setLiked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(cards.map((c) => [c.applicationId, c.liked]))
  );

  const likedCount = Object.values(liked).filter(Boolean).length;

  async function toggleHeart(applicationId: string) {
    const next = !liked[applicationId];
    setLiked((prev) => ({ ...prev, [applicationId]: next }));
    try {
      const res = await fetch("/api/casting/heart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, applicationId, liked: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure so the saved state is never misrepresented
      setLiked((prev) => ({ ...prev, [applicationId]: !next }));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">
          {cards.length} model{cards.length !== 1 ? "s" : ""} available
        </p>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
            likedCount > 0
              ? "bg-pink-500/15 text-pink-300 border-pink-500/30"
              : "bg-white/[0.03] text-white/40 border-white/10"
          }`}
        >
          <Heart className={`h-4 w-4 ${likedCount > 0 ? "fill-pink-400 text-pink-400" : ""}`} />
          {likedCount} selected
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((card) => {
          const isLiked = !!liked[card.applicationId];
          return (
            <div
              key={card.applicationId}
              className={`relative rounded-2xl overflow-hidden border transition-all ${
                isLiked
                  ? "border-pink-500/60 shadow-[0_0_20px_rgba(236,72,153,0.25)]"
                  : "border-white/[0.08] hover:border-white/20"
              }`}
            >
              <a
                href={`/${card.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-[3/4] relative bg-gradient-to-br from-pink-500/15 to-violet-500/15"
              >
                {card.photoUrl ? (
                  <Image
                    src={card.photoUrl}
                    alt={card.username}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-16 w-16 text-white/15" />
                  </div>
                )}
              </a>
              {/* Info overlay: sibling of the photo link so the social chips
                  can be links themselves; clicks pass through to the photo
                  except on the chips. */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-10 pb-2.5 px-3 pointer-events-none">
                <p className="font-semibold text-white text-sm truncate">
                  @{card.username}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {card.height && (
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                      {card.height}
                    </span>
                  )}
                  {card.instagramHandle && (
                    <a
                      href={`https://instagram.com/${card.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-500/30 text-pink-100 text-[10px] font-medium border border-pink-400/30 hover:bg-pink-500/50 transition-colors"
                    >
                      <Instagram className="h-2.5 w-2.5" />
                      @{card.instagramHandle}
                      {card.instagramFollowers ? ` · ${formatFollowers(card.instagramFollowers)}` : ""}
                    </a>
                  )}
                  {card.tiktokHandle && (
                    <a
                      href={`https://www.tiktok.com/@${card.tiktokHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-100 text-[10px] font-medium border border-cyan-400/30 hover:bg-cyan-500/45 transition-colors"
                    >
                      TikTok @{card.tiktokHandle}
                      {card.tiktokFollowers ? ` · ${formatFollowers(card.tiktokFollowers)}` : ""}
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label={isLiked ? `Remove ${card.username} from selections` : `Select ${card.username}`}
                onClick={() => toggleHeart(card.applicationId)}
                className={`absolute top-2 right-2 h-10 w-10 rounded-full flex items-center justify-center border backdrop-blur-md transition-all active:scale-90 ${
                  isLiked
                    ? "bg-pink-500/90 border-pink-400 text-white"
                    : "bg-black/40 border-white/20 text-white/80 hover:bg-black/60"
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
