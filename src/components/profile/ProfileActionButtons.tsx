"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Video, Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";

interface ProfileActionButtonsProps {
  isLoggedIn: boolean;
  isOwner: boolean;
  modelUsername: string;
  modelActorId: string | null;
  messageRate?: number;
  videoCallRate?: number;
}

export function ProfileActionButtons({
  isLoggedIn,
  isOwner,
  modelUsername,
  messageRate = 0,
  videoCallRate = 0,
}: ProfileActionButtonsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(10);
  const [sending, setSending] = useState(false);

  const handleChat = () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }
    if (messageRate > 0) {
      setShowChatConfirm(true);
    } else {
      window.location.href = `/messages?new=${modelUsername}`;
    }
  };

  const handleVideoCall = () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }
    if (videoCallRate > 0) {
      setShowVideoConfirm(true);
    } else {
      window.location.href = `/messages?new=${modelUsername}&call=true`;
    }
  };

  const handleTip = () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }
    setShowTipDialog(true);
  };

  const proceedToChat = () => {
    setShowChatConfirm(false);
    window.location.href = `/messages?new=${modelUsername}`;
  };

  const proceedToVideoCall = () => {
    setShowVideoConfirm(false);
    window.location.href = `/messages?new=${modelUsername}&call=true`;
  };

  const sendTip = async () => {
    if (tipAmount < 1) {
      toast.error("Minimum tip is 1 coin");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/tips/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: modelUsername,
          amount: tipAmount
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send tip");
      toast.success(`Sent ${tipAmount} coins to ${modelUsername}!`);
      setShowTipDialog(false);
      setTipAmount(10);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send tip");
    } finally {
      setSending(false);
    }
  };

  // Don't show action buttons on your own profile
  if (isOwner) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button
          className="exa-gradient-button h-11 text-sm font-semibold rounded-full"
          onClick={handleChat}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Chat
        </Button>
        <Button
          className="exa-gradient-button h-11 text-sm font-semibold rounded-full"
          onClick={handleVideoCall}
        >
          <Video className="mr-1.5 h-4 w-4" />
          Video Call
        </Button>
        <Button
          className="h-11 text-sm font-semibold rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
          onClick={handleTip}
        >
          <Coins className="mr-1.5 h-4 w-4" />
          Tip
        </Button>
      </div>

      {/* Chat Confirmation Dialog */}
      <Dialog open={showChatConfirm} onOpenChange={setShowChatConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-pink-500" />
              Start Chat
            </DialogTitle>
            <DialogDescription>
              Chat with {modelUsername}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
              <Coins className="h-6 w-6 text-yellow-500" />
              <span className="text-2xl font-bold">{messageRate}</span>
              <span className="text-muted-foreground">coins per message</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              You will be charged {messageRate} coins for each message you send
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowChatConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 exa-gradient-button"
                onClick={proceedToChat}
              >
                Start Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Call Confirmation Dialog */}
      <Dialog open={showVideoConfirm} onOpenChange={setShowVideoConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-pink-500" />
              Video Call
            </DialogTitle>
            <DialogDescription>
              Start a video call with {modelUsername}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
              <Coins className="h-6 w-6 text-yellow-500" />
              <span className="text-2xl font-bold">{videoCallRate}</span>
              <span className="text-muted-foreground">coins per minute</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              You will be charged {videoCallRate} coins for each minute of the call
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowVideoConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 exa-gradient-button"
                onClick={proceedToVideoCall}
              >
                Start Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Send a Tip
            </DialogTitle>
            <DialogDescription>
              Send coins to {modelUsername} to show your appreciation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Amount (coins)</Label>
              <Input
                type="number"
                min={1}
                value={tipAmount}
                onChange={(e) => setTipAmount(parseInt(e.target.value) || 0)}
                className="text-center text-lg font-semibold"
              />
            </div>
            <div className="flex gap-2">
              {[5, 10, 25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className={tipAmount === amount ? "border-yellow-500 bg-yellow-500/10" : ""}
                  onClick={() => setTipAmount(amount)}
                >
                  {amount}
                </Button>
              ))}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              onClick={sendTip}
              disabled={sending || tipAmount < 1}
            >
              {sending ? "Sending..." : `Send ${tipAmount} Coins`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
