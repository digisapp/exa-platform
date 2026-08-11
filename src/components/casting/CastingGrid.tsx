"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, User } from "lucide-react";

export interface CastingCard {
  applicationId: string;
  username: string;
  photoUrl: string | null;
  height: string | null;
  instagramFollowers: number | null;
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
          {cards.length} model{cards.length !== 1 ? "s" : ""} applied
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
          const followers =
            (card.instagramFollowers || 0) + (card.tiktokFollowers || 0);
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-10 pb-2.5 px-3">
                  <p className="font-semibold text-white text-sm truncate">
                    @{card.username}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.height && (
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                        {card.height}
                      </span>
                    )}
                    {followers > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                        {formatFollowers(followers)} followers
                      </span>
                    )}
                  </div>
                </div>
              </a>
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
