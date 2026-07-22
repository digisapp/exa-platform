"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneOff, PhoneCall, Mic, MicOff, Video, VideoOff, Coins, Heart, Loader2, X, Wifi, WifiOff } from "lucide-react";
import { CALL_COST_PER_MINUTE } from "@/lib/livekit-constants";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { showTipSuccessToast } from "@/lib/tip-toast";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TIP_GIFTS, SUPER_TIP_AMOUNTS, type TipGift } from "@/lib/tip-config";

interface VideoRoomProps {
  token: string;
  roomName: string;
  sessionId: string;
  onCallEnd: () => void;
  requiresCoins?: boolean;
  canTip?: boolean;
  recipientActorId?: string;
  recipientName?: string;
  recipientAvatar?: string | null;
  coinBalance?: number;
  onTipSuccess?: (amount: number, newBalance: number) => void;
  callType?: "video" | "voice";
  /** Caller side: show a ringing screen until the recipient answers. */
  waitForAnswer?: boolean;
}

export function VideoRoom({
  token,
  sessionId,
  onCallEnd,
  requiresCoins = false,
  canTip = false,
  recipientActorId,
  recipientName,
  recipientAvatar,
  coinBalance = 0,
  onTipSuccess,
  callType = "video",
  waitForAnswer = false,
}: VideoRoomProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [localCoinBalance, setLocalCoinBalance] = useState(coinBalance);
  // Receivers (waitForAnswer=false) are already in an accepted call, so treat
  // them as answered from the start. Callers wait for the recipient to pick up.
  const [answered, setAnswered] = useState(!waitForAnswer);
  const [outcome, setOutcome] = useState<null | "declined" | "missed">(null);
  const outcomeRef = useRef(outcome);
  useEffect(() => { outcomeRef.current = outcome; }, [outcome]);

  const handleDisconnect = useCallback(async () => {
    // If the call ended before it was ever answered (declined/missed), the
    // session is already in a terminal state — don't POST /end and overwrite it.
    if (!outcomeRef.current) {
      try {
        await fetch("/api/calls/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
    onCallEnd();
  }, [sessionId, onCallEnd]);

  const handleRemoteJoined = useCallback(() => setAnswered(true), []);

  // Caller side: watch the session row for the recipient's response.
  useEffect(() => {
    if (!waitForAnswer) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`call-status:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "video_call_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status === "active") setAnswered(true);
          else if (status === "declined") setOutcome((prev) => prev ?? "declined");
          else if (status === "missed") setOutcome((prev) => prev ?? "missed");
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [waitForAnswer, sessionId]);

  // Safety net: if realtime never delivers the recipient's response, stop
  // ringing after the recipient's auto-decline window (~120s) has elapsed.
  useEffect(() => {
    if (!waitForAnswer || answered || outcome) return;
    const t = setTimeout(() => setOutcome("missed"), 125_000);
    return () => clearTimeout(t);
  }, [waitForAnswer, answered, outcome]);

  // Show the outcome briefly, then close the call UI.
  useEffect(() => {
    if (!outcome) return;
    toast.info(
      outcome === "declined"
        ? `${recipientName || "They"} declined the call`
        : `No answer from ${recipientName || "the other person"}`
    );
    const t = setTimeout(() => onCallEnd(), 2500);
    return () => clearTimeout(t);
  }, [outcome, recipientName, onCallEnd]);

  // Heartbeat while the call is live so the reconciliation sweeper knows the
  // call's true last-alive time (and can bill a crashed call accurately).
  useEffect(() => {
    if (!isConnected) return;

    const sendHeartbeat = () => {
      fetch("/api/calls/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20_000);

    // iOS throttles/suspends background timers. When the page becomes visible
    // again mid-call, re-assert liveness immediately so a briefly-backgrounded
    // call doesn't drift toward the sweeper's 90s no-heartbeat window.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isConnected, sessionId]);

  // Keep the screen awake during calls (voice calls have no camera, so iOS
  // would auto-lock in ~30-60s, suspend the page, and stop heartbeats — the
  // sweeper would then end the call). Purely best-effort: wake-lock failures
  // must never affect the call.
  useEffect(() => {
    if (!isConnected) return;
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
      } catch {
        // Wake lock denied/unsupported — the call continues regardless.
      }
    };

    // Wake locks are auto-released when the page is hidden; re-request when
    // the user comes back.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [isConnected]);

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
    <ErrorBoundary>
    <div className="exa-call-room fixed inset-0 z-50 bg-black">
      {/* Hide LiveKit's built-in control bar: our custom overlay already has
          mic/camera/hang-up, so on portrait phones the two bars overlap and
          show duplicate hang-up buttons. Scoped under .exa-call-room.
          Exception: the bar's start-audio button must stay reachable — LiveKit
          shows it (via an inline display toggle) only when the browser blocks
          remote audio playback, which iOS Safari actually does. */}
      <style>{`
        .exa-call-room .lk-video-conference { --lk-control-bar-height: 0px; }
        .exa-call-room .lk-video-conference .lk-control-bar {
          padding: 0;
          border: 0;
          height: 0;
          min-height: 0;
          max-height: 0;
          overflow: visible;
        }
        .exa-call-room .lk-video-conference .lk-control-bar > :not(.lk-start-audio-button) {
          display: none;
        }
        .exa-call-room .lk-video-conference .lk-start-audio-button {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 30;
        }
      `}</style>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onConnected={() => setIsConnected(true)}
        onDisconnected={handleDisconnect}
        data-lk-theme="default"
        style={{ height: "100%" }}
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
          billingActive={answered}
          onRemoteJoined={handleRemoteJoined}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Caller ringing screen — covers the room until the recipient answers */}
      {waitForAnswer && !answered && !outcome && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-black via-violet-950/50 to-black">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-pink-500/40 blur-2xl animate-pulse" />
            <Avatar className="relative h-28 w-28 ring-4 ring-pink-500/70 shadow-[0_0_50px_rgba(236,72,153,0.55)]">
              <AvatarImage src={recipientAvatar || undefined} alt={recipientName || "Model"} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                {(recipientName || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <h3 className="mt-6 text-2xl font-semibold text-white">{recipientName || "Calling…"}</h3>
          <p className="mt-2 flex items-center gap-2 text-pink-300/90">
            <PhoneCall className="h-4 w-4 animate-pulse" />
            <span>Ringing…</span>
          </p>
          <Button
            variant="destructive"
            size="icon"
            aria-label="Cancel call"
            className="mt-10 rounded-full w-14 h-14 bg-red-500 hover:bg-red-600"
            onClick={handleDisconnect}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Outcome screen — brief message before the call UI closes */}
      {outcome && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
          <p className="text-xl font-medium text-white">
            {outcome === "declined"
              ? `${recipientName || "They"} declined`
              : `No answer`}
          </p>
        </div>
      )}
    </div>
    </ErrorBoundary>
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
  /** Only run the visible duration/cost timer once the call is answered. */
  billingActive?: boolean;
  /** Fires when a remote participant joins (recipient answered). */
  onRemoteJoined?: () => void;
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
  billingActive = true,
  onRemoteJoined,
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

  // Call duration timer — only ticks once the call is answered so the caller
  // doesn't see a running clock/cost while still ringing. Duration is derived
  // from a wall-clock start timestamp (not interval increments) because iOS
  // throttles background timers, which would make the display undercount.
  const callStartTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isConnected || !billingActive) return;

    if (callStartTsRef.current === null) callStartTsRef.current = Date.now();
    const startTs = callStartTsRef.current;

    const tick = () => {
      setCallDuration(Math.floor((Date.now() - startTs) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [isConnected, billingActive]);

  // Detect the recipient answering (a remote participant appears).
  useEffect(() => {
    if (participants.some((p) => !p.isLocal)) {
      onRemoteJoined?.();
    }
  }, [participants, onRemoteJoined]);

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

  const handleTip = async (amount: number, gift?: TipGift) => {
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
          gift: gift?.key,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send tip");
        return;
      }

      showTipSuccessToast({ amount, recipientName: recipientName || "Model", gift });
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
        <div className="absolute bottom-[max(7rem,calc(env(safe-area-inset-bottom)+6rem))] left-0 right-0 z-20 flex justify-center">
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
            {/* Gifts — small named tips; taps send immediately like the coin tiles */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {TIP_GIFTS.map((gift) => {
                const canAfford = coinBalance >= gift.amount;
                const isLoading = tippingAmount === gift.amount;

                return (
                  <button
                    key={gift.key}
                    onClick={() => canAfford && !tippingAmount && handleTip(gift.amount, gift)}
                    disabled={!canAfford || !!tippingAmount}
                    className={cn(
                      "py-2 px-2 rounded-lg text-center transition-all",
                      canAfford
                        ? "bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/30"
                        : "bg-white/5 text-white/30 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <span className={cn("text-base leading-none", !canAfford && "opacity-50")}>{gift.emoji}</span>
                        <span className="text-xs font-semibold">{gift.amount}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SUPER_TIP_AMOUNTS.map((amount) => {
                const canAfford = coinBalance >= amount;
                const isLoading = tippingAmount === amount;

                return (
                  <button
                    key={amount}
                    onClick={() => canAfford && !tippingAmount && handleTip(amount)}
                    disabled={!canAfford || !!tippingAmount}
                    className={cn(
                      "py-2.5 px-3 rounded-lg text-center transition-all",
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
      <div className="absolute bottom-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] left-0 right-0 z-10 flex justify-center">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
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
            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
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
              aria-label={showTipMenu ? "Close tip menu" : "Send a tip"}
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
            aria-label="End call"
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
