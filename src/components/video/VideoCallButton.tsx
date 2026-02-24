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
import { Video, Loader2, Coins } from "lucide-react";
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Video Call</DialogTitle>
            <DialogDescription>
              Start a video call with {recipientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Rate */}
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              <Coins className="h-6 w-6 text-pink-500" />
              <span>{ratePerMinute}</span>
              <span className="text-base font-normal text-muted-foreground">coins per minute</span>
            </div>

            {/* Low balance warning */}
            {!hasEnoughCoins && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-sm text-destructive">
                  You need at least {MIN_CALL_BALANCE} coins to start a call.{" "}
                  <Link href="/coins" className="underline font-medium">Buy coins</Link>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={startCall}
                disabled={!hasEnoughCoins || isStarting}
                className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Start Call"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
