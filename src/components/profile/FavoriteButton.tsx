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

  return (
    <button
      onClick={handleFavorite}
      disabled={loading}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
        isFavorited
          ? "bg-pink-500/80 hover:bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
          : "bg-white/10 hover:bg-white/20",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-transform",
          isFavorited ? "fill-white text-white" : "text-white/70",
          bouncing && "scale-125"
        )}
      />
    </button>
  );
}
