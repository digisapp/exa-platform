"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  modelId: string;
  initialFavorited: boolean;
  isLoggedIn: boolean;
}

export function FavoriteButton({ modelId, initialFavorited, isLoggedIn }: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [bouncing, setBouncing] = useState(false);

  const handleFavorite = async () => {
    if (!isLoggedIn) {
      router.push("/signin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: isFavorited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update favorite");
      }

      const newState = !isFavorited;
      setIsFavorited(newState);

      setBouncing(true);
      setTimeout(() => setBouncing(false), 300);

      if (newState) {
        toast.success("Added to favorites", {
          action: { label: "View Favs", onClick: () => router.push("/favorites") },
        });
      } else {
        toast.success("Removed from favorites");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const label = isFavorited ? "Saved to favorites" : "Save to favorites";

  return (
    <div className="relative group">
      <button
        onClick={handleFavorite}
        disabled={loading}
        aria-label={label}
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center transition-all",
          isFavorited
            ? "bg-pink-500/80 hover:bg-pink-500 shadow-[0_0_16px_rgba(236,72,153,0.6)]"
            : "bg-white/10 hover:bg-white/20",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-transform",
            isFavorited ? "fill-white text-white" : "text-white/80",
            bouncing && "scale-125"
          )}
        />
      </button>
      <div
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-black/90 border border-pink-500/30 text-[11px] font-medium text-white whitespace-nowrap opacity-0 translate-y-[-4px] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 shadow-[0_0_12px_rgba(236,72,153,0.25)] z-50"
      >
        {label}
      </div>
    </div>
  );
}
