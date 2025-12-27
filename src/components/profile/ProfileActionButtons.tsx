"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Video, Coins, LogIn } from "lucide-react";
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
}

export function ProfileActionButtons({
  isLoggedIn,
  isOwner,
  modelUsername,
}: ProfileActionButtonsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [authAction, setAuthAction] = useState<string>("");
  const [tipAmount, setTipAmount] = useState<number>(10);
  const [sending, setSending] = useState(false);

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

  const handleTip = () => {
    if (!isLoggedIn) {
      setAuthAction("tip");
      setShowAuthDialog(true);
      return;
    }
    setShowTipDialog(true);
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
          onClick={() => handleAction("chat", `/messages?new=${modelUsername}`)}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Chat
        </Button>
        <Button
          className="exa-gradient-button h-11 text-sm font-semibold rounded-full"
          onClick={() => handleAction("video call", `/messages?new=${modelUsername}&call=true`)}
        >
          <Video className="mr-1.5 h-4 w-4" />
          Video
        </Button>
        <Button
          className="h-11 text-sm font-semibold rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
          onClick={handleTip}
        >
          <Coins className="mr-1.5 h-4 w-4" />
          Tip
        </Button>
      </div>

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
