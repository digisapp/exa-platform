"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FavoriteButtonProps {
  modelId: string;
  modelUsername: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  initialFavorited?: boolean;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  count?: number;
}

export function FavoriteButton({
  modelId,
  modelUsername,
  isLoggedIn,
  isOwner,
  initialFavorited = false,
  size = "md",
  showCount = false,
  count = 0,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoriteCount, setFavoriteCount] = useState(count);
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Don't show on own profile
  if (isOwner) {
    return null;
  }

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleFavorite = async () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
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

      const data = await res.json();
      setIsFavorited(!isFavorited);
      setFavoriteCount(data.favoriteCount || favoriteCount + (isFavorited ? -1 : 1));

      toast.success(
        isFavorited
          ? `Removed ${modelUsername} from favorites`
          : `Added ${modelUsername} to favorites`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update favorite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
          isFavorited
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:text-red-400"
        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={handleFavorite}
        disabled={loading}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={`${iconSizes[size]} ${isFavorited ? "fill-current" : ""}`}
        />
      </button>

      {showCount && favoriteCount > 0 && (
        <span className="text-sm text-muted-foreground ml-2">
          {favoriteCount}
        </span>
      )}

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center pt-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-red-500" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold">
                Sign in to save favorites
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground mt-2 mb-6">
              Create an account to save your favorite models
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Link href="/signin" className="w-full">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-violet-500">
                  Sign In
                </Button>
              </Link>
              <Link href="/fan/signup" className="w-full">
                <Button variant="outline" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
