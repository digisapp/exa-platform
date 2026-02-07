"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  auctionId: string;
  isWatching: boolean;
  onWatchChange?: (isWatching: boolean) => void;
  variant?: "default" | "icon";
  className?: string;
}

export function WatchlistButton({
  auctionId,
  isWatching: initialWatching,
  onWatchChange,
  variant = "default",
  className,
}: WatchlistButtonProps) {
  const [isWatching, setIsWatching] = useState(initialWatching);
  const [isLoading, setIsLoading] = useState(false);

  const toggleWatchlist = async () => {
    setIsLoading(true);
    try {
      if (isWatching) {
        // Remove from watchlist
        const response = await fetch(`/api/auctions/watchlist?auction_id=${auctionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove from watchlist");
        }

        setIsWatching(false);
        onWatchChange?.(false);
        toast.success("Removed from watchlist");
      } else {
        // Add to watchlist
        const response = await fetch("/api/auctions/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auction_id: auctionId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add to watchlist");
        }

        setIsWatching(true);
        onWatchChange?.(true);
        toast.success("Added to watchlist", {
          description: "You'll be notified about this auction",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleWatchlist}
        disabled={isLoading}
        className={cn(
          "rounded-full",
          isWatching && "text-pink-400 hover:text-pink-300",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isWatching ? (
          <Eye className="h-5 w-5" />
        ) : (
          <EyeOff className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isWatching ? "secondary" : "outline"}
      onClick={toggleWatchlist}
      disabled={isLoading}
      className={cn(
        isWatching && "bg-pink-500/20 border-pink-500/50 text-pink-400 hover:bg-pink-500/30",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isWatching ? (
        <Eye className="h-4 w-4 mr-2" />
      ) : (
        <EyeOff className="h-4 w-4 mr-2" />
      )}
      {isWatching ? "Watching" : "Watch"}
    </Button>
  );
}

export default WatchlistButton;
