"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useParticipants,
  useRoomContext,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Coins, Heart, Loader2, X, Wifi, WifiOff } from "lucide-react";
import { CALL_COST_PER_MINUTE } from "@/lib/livekit-constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIP_AMOUNTS = [5, 10, 25, 50];

interface VideoRoomProps {
  token: string;
  roomName: string;
  sessionId: string;
  onCallEnd: () => void;
  requiresCoins?: boolean;
  canTip?: boolean;
  recipientActorId?: string;
  recipientName?: string;
  coinBalance?: number;
  onTipSuccess?: (amount: number, newBalance: number) => void;
  callType?: "video" | "voice";
}

export function VideoRoom({
  token,
  sessionId,
  onCallEnd,
  requiresCoins = false,
  canTip = false,
  recipientActorId,
  recipientName,
  coinBalance = 0,
  onTipSuccess,
  callType = "video",
}: VideoRoomProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [localCoinBalance, setLocalCoinBalance] = useState(coinBalance);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch("/api/calls/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error("Error ending call:", error);
    }
    onCallEnd();
  }, [sessionId, onCallEnd]);

  const handleTipSuccess = (amount: number, newBalance: number) => {
    setLocalCoinBalance(newBalance);
    if (onTipSuccess) {
      onTipSuccess(amount, newBalance);
    }
  };

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Video calls are not configured</p>
          <Button variant="destructive" onClick={onCallEnd}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onConnected={() => setIsConnected(true)}
        onDisconnected={handleDisconnect}
        data-lk-theme="default"
        style={{ height: "100vh" }}
      >
        <VideoCallContent
          isConnected={isConnected}
          requiresCoins={requiresCoins}
          onHangUp={handleDisconnect}
          canTip={canTip}
          recipientActorId={recipientActorId}
          recipientName={recipientName}
          coinBalance={localCoinBalance}
          onTipSuccess={handleTipSuccess}
          callType={callType}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

interface VideoCallContentProps {
  isConnected: boolean;
  requiresCoins: boolean;
  onHangUp: () => void;
  canTip?: boolean;
  recipientActorId?: string;
  recipientName?: string;
  coinBalance?: number;
  onTipSuccess?: (amount: number, newBalance: number) => void;
  callType?: "video" | "voice";
}

function VideoCallContent({
  isConnected,
  requiresCoins,
  onHangUp,
  canTip = false,
  recipientActorId,
  recipientName,
  coinBalance = 0,
  onTipSuccess,
  callType = "video",
}: VideoCallContentProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  // For voice calls, start with video off
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice");
  const [showTipMenu, setShowTipMenu] = useState(false);
  const [tippingAmount, setTippingAmount] = useState<number | null>(null);
  const participants = useParticipants();
  const room = useRoomContext();
  const connectionState = useConnectionState();

  // Call duration timer
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Disable camera for voice calls when connected
  useEffect(() => {
    if (isConnected && callType === "voice" && room.localParticipant) {
      room.localParticipant.setCameraEnabled(false);
    }
  }, [isConnected, callType, room.localParticipant]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (room.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (room.localParticipant) {
      room.localParticipant.setCameraEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const estimatedCost = requiresCoins
    ? Math.ceil(callDuration / 60) * CALL_COST_PER_MINUTE
    : 0;

  const handleTip = async (amount: number) => {
    if (!recipientActorId) return;
    if (coinBalance < amount) {
      toast.error(`Not enough coins. Need ${amount}, have ${coinBalance}`);
      return;
    }

    setTippingAmount(amount);
    try {
      const response = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipientActorId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send tip");
        return;
      }

      toast.success(`Sent ${amount} coins to ${recipientName}!`);
      setShowTipMenu(false);
      if (onTipSuccess) {
        onTipSuccess(amount, data.newBalance);
      }
    } catch {
      toast.error("Failed to send tip");
    } finally {
      setTippingAmount(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Connection State Overlay */}
      {connectionState === ConnectionState.Connecting && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Connecting...</p>
          </div>
        </div>
      )}

      {connectionState === ConnectionState.Reconnecting && (
        <div className="absolute top-16 left-4 right-4 z-30">
          <div className="bg-yellow-500/90 rounded-lg px-4 py-2 flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-white" />
            <span className="text-white text-sm">Reconnecting...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-4">
          <span className="text-white font-mono text-lg">{formatDuration(callDuration)}</span>
          {requiresCoins && estimatedCost > 0 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Coins className="h-4 w-4" />
              <span className="text-sm">~{estimatedCost}</span>
            </div>
          )}
          {/* Connection quality indicator */}
          <div className={cn(
            "flex items-center gap-1 text-sm",
            connectionState === ConnectionState.Connected ? "text-green-400" :
            connectionState === ConnectionState.Reconnecting ? "text-yellow-400" : "text-gray-400"
          )}>
            {connectionState === ConnectionState.Connected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span>{participants.length}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative">
        <VideoConference />
      </div>

      {/* Tip Menu Overlay */}
      {showTipMenu && canTip && (
        <div className="absolute bottom-28 left-0 right-0 z-20 flex justify-center">
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-4 mx-4 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                Tip {recipientName}
              </span>
              <button
                onClick={() => setShowTipMenu(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60 mb-3">
              <Coins className="h-3 w-3" />
              {coinBalance} coins available
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIP_AMOUNTS.map((amount) => {
                const canAfford = coinBalance >= amount;
                const isLoading = tippingAmount === amount;

                return (
                  <button
                    key={amount}
                    onClick={() => canAfford && !tippingAmount && handleTip(amount)}
                    disabled={!canAfford || !!tippingAmount}
                    className={cn(
                      "py-2 px-3 rounded-lg text-center transition-all",
                      canAfford
                        ? "bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/30"
                        : "bg-white/5 text-white/30 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      <span className="font-semibold">{amount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full w-12 h-12 ${
              isMuted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"
            }`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full w-12 h-12 ${
              isVideoOff ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"
            }`}
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          {/* Tip Button */}
          {canTip && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full w-12 h-12",
                showTipMenu
                  ? "bg-pink-500/30 text-pink-400"
                  : "bg-white/10 text-white hover:bg-pink-500/20 hover:text-pink-400"
              )}
              onClick={() => setShowTipMenu(!showTipMenu)}
            >
              <Heart className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
            onClick={onHangUp}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
