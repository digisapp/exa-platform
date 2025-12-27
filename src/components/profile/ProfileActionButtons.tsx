"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Video, Heart, LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface ProfileActionButtonsProps {
  isLoggedIn: boolean;
  isOwner: boolean;
  modelUsername: string;
  modelActorId: string | null;
}

export function ProfileActionButtons({
  isLoggedIn,
  isOwner,
  modelUsername,
}: ProfileActionButtonsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authAction, setAuthAction] = useState<string>("");

  const handleAction = (action: string, href?: string) => {
    if (!isLoggedIn) {
      setAuthAction(action);
      setShowAuthDialog(true);
      return;
    }
    if (href) {
      window.location.href = href;
    }
  };

  if (isOwner) {
    return (
      <div className="flex justify-center mb-6">
        <Link href="/profile">
          <Button variant="outline" className="h-10 rounded-full border-white/20">
            Edit Profile
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button
          className="exa-gradient-button h-11 text-sm font-semibold rounded-full"
          onClick={() => handleAction("message", `/messages?new=${modelUsername}`)}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Message
        </Button>
        <Button
          className="exa-gradient-button h-11 text-sm font-semibold rounded-full"
          onClick={() => handleAction("video call", `/messages?new=${modelUsername}&call=true`)}
        >
          <Video className="mr-1.5 h-4 w-4" />
          Call
        </Button>
        <Button
          variant="outline"
          className="h-11 text-sm rounded-full border-[#FF69B4]/50 hover:bg-[#FF69B4]/10"
          onClick={() => handleAction("follow")}
        >
          <Heart className="mr-1.5 h-4 w-4 text-[#FF69B4]" />
          Follow
        </Button>
      </div>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign in required
            </DialogTitle>
            <DialogDescription>
              Sign in to {authAction} {modelUsername}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
