"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetActorId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  isLoggedIn: boolean;
  variant?: "default" | "compact";
  className?: string;
}

export function FollowButton({
  targetActorId,
  initialIsFollowing,
  initialFollowerCount,
  isLoggedIn,
  variant = "default",
  className,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to follow");
      return;
    }

    setLoading(true);

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((prev) => (wasFollowing ? prev - 1 : prev + 1));

    try {
      const response = wasFollowing
        ? await fetch(`/api/follows?targetActorId=${targetActorId}`, {
            method: "DELETE",
          })
        : await fetch("/api/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetActorId }),
          });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update follow");
      }

      // Update with server count
      setFollowerCount(data.followerCount);

      if (!wasFollowing) {
        toast.success("Following!");
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowerCount((prev) => (wasFollowing ? prev + 1 : prev - 1));
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        onClick={handleFollow}
        disabled={loading}
        className={cn(
          isFollowing
            ? "border-pink-500/50 hover:border-red-500 hover:bg-red-500/10 hover:text-red-500"
            : "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600",
          className
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <>
            <UserMinus className="h-4 w-4 mr-1" />
            Unfollow
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4 mr-1" />
            Follow
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleFollow}
      disabled={loading}
      className={cn(
        "h-12 rounded-full transition-all",
        isFollowing
          ? "border-pink-500 bg-pink-500/10 hover:border-red-500 hover:bg-red-500/10"
          : "border-[#FF69B4]/50 hover:border-[#FF69B4] hover:bg-[#FF69B4]/10",
        className
      )}
    >
      {loading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : isFollowing ? (
        <Heart className="mr-2 h-5 w-5 text-pink-500 fill-pink-500" />
      ) : (
        <Heart className="mr-2 h-5 w-5 text-[#FF69B4]" />
      )}
      {isFollowing ? "Following" : "Follow"}
      <span className="ml-2 text-muted-foreground">
        {followerCount.toLocaleString()}
      </span>
    </Button>
  );
}
