"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Loader2, Coins, Clock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { VideoRoom } from "./VideoRoom";
import { MIN_CALL_BALANCE } from "@/lib/livekit-constants";
import { cn } from "@/lib/utils";

interface VideoCallButtonProps {
  conversationId: string;
  disabled?: boolean;
  coinBalance?: number;
  isModel?: boolean;
  recipientIsModel?: boolean;
  recipientActorId?: string;
  recipientName?: string;
  recipientAvatar?: string | null;
  videoCallRate?: number;
  onBalanceChange?: (newBalance: number) => void;
}

export function VideoCallButton({
  conversationId,
  disabled = false,
  coinBalance = 0,
  isModel = false,
  recipientIsModel = false,
  recipientActorId,
  recipientName,
  recipientAvatar,
  videoCallRate = 5,
  onBalanceChange,
}: VideoCallButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [callSession, setCallSession] = useState<{
    sessionId: string;
    token: string;
    roomName: string;
    requiresCoins: boolean;
  } | null>(null);

  // Check if coins are required (fan/brand calling model)
  const requiresCoins = !isModel && recipientIsModel;
  const hasEnoughCoins = coinBalance >= MIN_CALL_BALANCE;
  const ratePerMinute = videoCallRate || 5;

  const handleButtonClick = () => {
    if (requiresCoins) {
      // Show confirmation dialog for fans/brands calling models
      setShowConfirmDialog(true);
    } else {
      // Models can call directly without confirmation
      startCall();
    }
  };

  const startCall = async () => {
    if (requiresCoins && !hasEnoughCoins) {
      toast.error(`Need at least ${MIN_CALL_BALANCE} coins to start a video call`);
      return;
    }

    setShowConfirmDialog(false);
    setIsStarting(true);
    try {
      const response = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Insufficient coins. Need ${data.required}, have ${data.balance}`);
        } else if (response.status === 409) {
          toast.error("A call is already in progress");
        } else {
          toast.error(data.error || "Failed to start call");
        }
        return;
      }

      setCallSession({
        sessionId: data.sessionId,
        token: data.token,
        roomName: data.roomName,
        requiresCoins: data.requiresCoins,
      });

      toast.success("Calling...");
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start video call");
    } finally {
      setIsStarting(false);
    }
  };

  const handleCallEnd = () => {
    setCallSession(null);
  };

  // Can tip if the other participant is a model and we're not a model
  const canTip = !isModel && recipientIsModel;

  // Calculate estimated call duration with current balance
  const estimatedMinutes = Math.floor(coinBalance / ratePerMinute);

  // Get initials for avatar fallback
  const initials = recipientName
    ? recipientName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (callSession) {
    return (
      <VideoRoom
        token={callSession.token}
        roomName={callSession.roomName}
        sessionId={callSession.sessionId}
        onCallEnd={handleCallEnd}
        requiresCoins={callSession.requiresCoins}
        canTip={canTip}
        recipientActorId={recipientActorId}
        recipientName={recipientName}
        coinBalance={coinBalance}
        onTipSuccess={(_, newBalance) => {
          if (onBalanceChange) {
            onBalanceChange(newBalance);
          }
        }}
      />
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleButtonClick}
        disabled={disabled || isStarting || (requiresCoins && !hasEnoughCoins)}
        title={
          requiresCoins && !hasEnoughCoins
            ? `Need ${MIN_CALL_BALANCE} coins to call`
            : "Start video call"
        }
      >
        {isStarting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Video className="h-5 w-5" />
        )}
      </Button>

      {/* Video Call Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                <Video className="h-5 w-5 text-pink-500" />
              </div>
              Start Video Call
            </DialogTitle>
            <DialogDescription>
              Connect with {recipientName} via video
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Recipient Info */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-4 ring-pink-500/20">
                  <AvatarImage src={recipientAvatar || undefined} />
                  <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-green-500 border-2 border-background">
                  <Video className="h-3 w-3 text-white" />
                </div>
              </div>
              <p className="font-semibold text-lg">{recipientName}</p>
            </div>

            {/* Call Cost Info */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
              {/* Rate per minute */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Rate per minute</span>
                </div>
                <div className="flex items-center gap-1 font-semibold">
                  <Coins className="h-4 w-4 text-pink-500" />
                  <span>{ratePerMinute} coins</span>
                </div>
              </div>

              {/* Your balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">Your balance</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-semibold",
                  hasEnoughCoins ? "text-foreground" : "text-destructive"
                )}>
                  <Coins className="h-4 w-4 text-pink-500" />
                  <span>{coinBalance} coins</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t my-2" />

              {/* Estimated call time */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated call time</span>
                <span className={cn(
                  "font-semibold",
                  estimatedMinutes < 2 ? "text-amber-500" : "text-green-500"
                )}>
                  ~{estimatedMinutes} minute{estimatedMinutes !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Low balance warning */}
            {!hasEnoughCoins && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">
                  You need at least {MIN_CALL_BALANCE} coins to start a call
                </p>
              </div>
            )}

            {/* Low balance suggestion */}
            {hasEnoughCoins && estimatedMinutes < 5 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                  Consider adding more coins for a longer call
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={startCall}
                disabled={!hasEnoughCoins || isStarting}
                className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
                size="lg"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Start Call
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            {/* Buy coins link */}
            {coinBalance < 50 && (
              <p className="text-center text-sm text-muted-foreground">
                Need more coins?{" "}
                <Link href="/coins" className="text-pink-500 hover:underline">
                  Buy coins
                </Link>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
