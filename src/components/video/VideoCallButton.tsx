"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VideoRoom } from "./VideoRoom";
import { MIN_CALL_BALANCE } from "@/lib/livekit-constants";

interface VideoCallButtonProps {
  conversationId: string;
  disabled?: boolean;
  coinBalance?: number;
  isModel?: boolean;
  recipientIsModel?: boolean;
  recipientActorId?: string;
  recipientName?: string;
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
  onBalanceChange,
}: VideoCallButtonProps) {
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

  const startCall = async () => {
    if (requiresCoins && !hasEnoughCoins) {
      toast.error(`Need at least ${MIN_CALL_BALANCE} coins to start a video call`);
      return;
    }

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
    <Button
      variant="ghost"
      size="icon"
      onClick={startCall}
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
  );
}
