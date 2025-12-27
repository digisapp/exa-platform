"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FollowButtonProps {
  modelUsername: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  initialFollowing?: boolean;
}

export function FollowButton({
  modelUsername,
  isLoggedIn,
  isOwner,
  initialFollowing = false,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Don't show on own profile
  if (isOwner) {
    return null;
  }

  const handleFollow = async () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/follows", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: modelUsername }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update follow");
      }

      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? `Unfollowed ${modelUsername}` : `Following ${modelUsername}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update follow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isFollowing
            ? "bg-[#FF69B4] text-white"
            : "bg-white/10 hover:bg-white/20 text-white/70 hover:text-[#FF69B4]"
        }`}
        onClick={handleFollow}
        disabled={loading}
        title={isFollowing ? "Unfollow" : "Follow"}
      >
        {isFollowing ? (
          <UserCheck className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
      </button>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center pt-4">
            <img
              src="/exa-logo-white.png"
              alt="EXA"
              className="h-10 w-auto mb-6"
            />
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-bold">
                Sign in required
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-6 w-full">
              <Link href="/signin" className="w-full">
                <Button className="w-full exa-gradient-button">
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
