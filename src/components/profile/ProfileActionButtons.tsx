"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Video,
  Coins,
  Loader2,
  Phone,
  Gift,
  SendHorizontal,
  CheckCircle,
  PhoneOff,
  PhoneCall,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { BuyCoinsModal } from "@/components/coins/BuyCoinsModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { showTipSuccessToast } from "@/lib/tip-toast";
import { createClient } from "@/lib/supabase/client";
import { messageCoinCost } from "@/lib/coin-config";
import { GATE_CALL_CTAS_ON_REACHABILITY } from "@/lib/call-availability";
import {
  TIP_GIFTS,
  SUPER_TIP_AMOUNTS,
  MIN_CUSTOM_TIP,
  MAX_TIP,
  type TipGift,
} from "@/lib/tip-config";

const VideoRoom = dynamic(() => import("@/components/video").then(mod => mod.VideoRoom), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
    </div>
  ),
});

const RING_TIMEOUT = 120;

interface ProfileActionButtonsProps {
  isLoggedIn: boolean;
  isOwner: boolean;
  modelUsername: string;
  modelId: string;
  modelActorId: string | null;
  modelName?: string;
  coinBalance?: number;
  messageRate?: number;
  videoCallRate?: number;
  voiceCallRate?: number;
  allowChat?: boolean;
  allowVideoCall?: boolean;
  allowVoiceCall?: boolean;
  allowTips?: boolean;
  /** Server-aligned reachability (video_is_online OR available_for_calls).
      When false the call CTAs are hidden — /api/calls/start would 409 anyway. */
  callReachable?: boolean;
}

export function ProfileActionButtons({
  isLoggedIn,
  isOwner,
  modelUsername,
  modelId,
  modelActorId,
  modelName,
  coinBalance = 0,
  messageRate = 0,
  videoCallRate = 0,
  voiceCallRate = 0,
  allowChat = true,
  allowVideoCall = true,
  allowVoiceCall = true,
  allowTips = true,
  callReachable = true,
}: ProfileActionButtonsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [selectedTipGift, setSelectedTipGift] = useState<TipGift | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [sending, setSending] = useState(false);

  // Chat input state
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sentConversationId, setSentConversationId] = useState<string | null>(null);
  const [existingConversationId, setExistingConversationId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Active call session (model accepted)
  const [callSession, setCallSession] = useState<{
    sessionId: string;
    token: string;
    roomName: string;
    recipientName: string;
    callRate: number;
    callType: "video" | "voice";
  } | null>(null);

  // Ringing / waiting for model to accept
  const [callingState, setCallingState] = useState<{
    sessionId: string;
    token: string;
    roomName: string;
    recipientName: string;
    callRate: number;
    callType: "video" | "voice";
  } | null>(null);
  const [ringSeconds, setRingSeconds] = useState(RING_TIMEOUT);
  const [callOutcome, setCallOutcome] = useState<"declined" | "missed" | null>(null);
  const [startingCall, setStartingCall] = useState<"video" | "voice" | null>(null);

  const router = useRouter();
  const firstName = modelName?.split(" ")[0] || modelUsername;

  // ── Existing conversation lookup ───────────────────────────────────────────
  // The profile page is ISR-cached, so per-viewer data has to come client-side.
  // find-or-create is read-only when a conversation exists (creation is
  // deferred to the first send), so it doubles as a safe existence check.
  useEffect(() => {
    if (!isLoggedIn || isOwner || !allowChat) return;
    let cancelled = false;
    fetch("/api/conversations/find-or-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelUsername }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.conversationId) {
          setExistingConversationId(data.conversationId);
        }
      })
      .catch(() => { /* hint only — the send box works without it */ });
    return () => { cancelled = true; };
  }, [isLoggedIn, isOwner, allowChat, modelUsername]);

  // ── Cancel outgoing call ───────────────────────────────────────────────────
  const cancelCall = useCallback(async (reason: "missed" | "declined" = "declined") => {
    if (!callingState) return;
    try {
      await fetch(`/api/calls/join?sessionId=${callingState.sessionId}&reason=${reason}`, {
        method: "DELETE",
      });
    } catch { /* best-effort */ }
    setCallingState(null);
    setRingSeconds(RING_TIMEOUT);
  }, [callingState]);

  // ── Ringing countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!callingState) return;
    if (ringSeconds <= 0) {
      cancelCall("missed");
      return;
    }
    const t = setTimeout(() => setRingSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [callingState, ringSeconds, cancelCall]);

  // ── Supabase realtime: watch session for model accept/decline ──────────────
  useEffect(() => {
    if (!callingState) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`call-session-${callingState.sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "video_call_sessions",
          filter: `id=eq.${callingState.sessionId}`,
        },
        (payload) => {
          const status = (payload.new as any).status;
          if (status === "active") {
            // Model accepted — connect to LiveKit
            setCallSession({
              sessionId: callingState.sessionId,
              token: callingState.token,
              roomName: callingState.roomName,
              recipientName: callingState.recipientName,
              callRate: callingState.callRate,
              callType: callingState.callType,
            });
            setCallingState(null);
            setRingSeconds(RING_TIMEOUT);
          } else if (status === "declined") {
            setCallOutcome("declined");
            setCallingState(null);
            setRingSeconds(RING_TIMEOUT);
          } else if (status === "missed") {
            setCallOutcome("missed");
            setCallingState(null);
            setRingSeconds(RING_TIMEOUT);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [callingState?.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear outcome message after 3s
  useEffect(() => {
    if (!callOutcome) return;
    const t = setTimeout(() => setCallOutcome(null), 3000);
    return () => clearTimeout(t);
  }, [callOutcome]);

  // ── Start call ─────────────────────────────────────────────────────────────
  const startCall = async (callType: "video" | "voice") => {
    setShowVideoConfirm(false);
    setShowVoiceConfirm(false);
    setStartingCall(callType);
    try {
      const res = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername: modelUsername, callType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to start call");
        return;
      }
      setRingSeconds(RING_TIMEOUT);
      setCallingState({
        sessionId: data.sessionId,
        token: data.token,
        roomName: data.roomName,
        recipientName: data.recipientName,
        callRate: data.callRate,
        callType,
      });
    } catch {
      toast.error("Failed to start call");
    } finally {
      setStartingCall(null);
    }
  };

  const handleVideoCall = () => {
    if (!isLoggedIn) { setShowAuthDialog(true); return; }
    if (videoCallRate > 0) { setShowVideoConfirm(true); } else { startCall("video"); }
  };

  const handleVoiceCall = () => {
    if (!isLoggedIn) { setShowAuthDialog(true); return; }
    if (voiceCallRate > 0) { setShowVoiceConfirm(true); } else { startCall("voice"); }
  };

  const handleTip = () => {
    if (!isLoggedIn) { setShowAuthDialog(true); return; }
    setShowTipDialog(true);
  };

  const handleChatInputFocus = () => {
    if (!isLoggedIn) {
      chatInputRef.current?.blur();
      setShowAuthDialog(true);
      return;
    }
    setInputFocused(true);
  };

  const handleSendChatMessage = async () => {
    if (!isLoggedIn) { setShowAuthDialog(true); return; }
    if (!chatMessage.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetModelUsername: modelUsername, content: chatMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error(`Need ${data.required} coins — you have ${data.balance}.`, {
            action: { label: "Buy coins", onClick: () => router.push("/coins") },
          });
        } else {
          toast.error(data.error || "Failed to send message");
        }
        return;
      }
      hapticFeedback("success");
      setSentConversationId(data.conversationId);
      setChatMessage("");
      // Land the fan in the thread — that's where the model's reply (and the
      // rest of the relationship) lives. The inline confirmation stays visible
      // while the chat page loads, and doubles as a manual link if navigation
      // is slow.
      if (data.conversationId) {
        router.push(`/chats/${data.conversationId}`);
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const customTipValue = parseInt(customTipAmount, 10);
  const customTipValid =
    Number.isInteger(customTipValue) && customTipValue >= MIN_CUSTOM_TIP && customTipValue <= MAX_TIP;
  // One effective amount regardless of how it was picked: gift tile, Super
  // Tip tile, or custom input (each selection clears the other two).
  const tipAmount = selectedTipGift?.amount ?? selectedTipAmount ?? (customTipValid ? customTipValue : null);

  const sendTip = async () => {
    if (!tipAmount || !modelActorId) return;
    if (tipAmount > coinBalance) {
      setBuyCoinsOpen(true);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: modelActorId, amount: tipAmount, gift: selectedTipGift?.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) toast.error(`Insufficient coins. Need ${data.required}, have ${data.balance}`);
        else toast.error(data.error || "Failed to send tip");
        return;
      }
      hapticFeedback("success");
      showTipSuccessToast({ amount: tipAmount, recipientName: data.recipientName, gift: selectedTipGift });
      setShowTipDialog(false);
      setSelectedTipAmount(null);
      setSelectedTipGift(null);
      setCustomTipAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send tip");
    } finally {
      setSending(false); }
  };

  const handleCallEnd = () => setCallSession(null);

  // ── Active call ────────────────────────────────────────────────────────────
  if (callSession) {
    return (
      <VideoRoom
        token={callSession.token}
        roomName={callSession.roomName}
        sessionId={callSession.sessionId}
        onCallEnd={handleCallEnd}
        requiresCoins={callSession.callRate > 0}
        recipientName={callSession.recipientName}
        callType={callSession.callType}
      />
    );
  }

  // ── Ringing screen ─────────────────────────────────────────────────────────
  if (callingState) {
    const isVideo = callingState.callType === "video";
    return (
      <div className="flex flex-col items-center py-6 mb-6 animate-in fade-in duration-300">
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-28 h-28 rounded-full bg-green-500/10 animate-ping" />
          <div className="absolute w-20 h-20 rounded-full bg-green-500/20 animate-ping [animation-delay:150ms]" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
            {isVideo
              ? <Video className="h-7 w-7 text-white" />
              : <PhoneCall className="h-7 w-7 text-white" />
            }
          </div>
        </div>

        <p className="text-white font-semibold text-lg">
          Calling {callingState.recipientName}…
        </p>
        <p className="text-white/50 text-sm mt-1">
          Waiting for them to answer · {ringSeconds}s
        </p>

        {/* Ring progress bar */}
        <div className="w-48 h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-1000"
            style={{ width: `${(ringSeconds / RING_TIMEOUT) * 100}%` }}
          />
        </div>

        {/* Cancel button */}
        <button
          onClick={() => cancelCall("declined")}
          className="mt-6 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/30"
        >
          <PhoneOff className="h-6 w-6 text-white" />
        </button>
        <p className="text-white/40 text-xs mt-2">Tap to cancel</p>
      </div>
    );
  }

  // Call CTAs render only when the model is reachable (video_is_online OR
  // available_for_calls, gated by GATE_CALL_CTAS_ON_REACHABILITY) — same
  // signal /api/calls/start enforces, so no dead button that 409s. Owners
  // always see their buttons (preview mode).
  const gateCalls = GATE_CALL_CTAS_ON_REACHABILITY && !isOwner && !callReachable;
  const showVideoCall = allowVideoCall && !gateCalls;
  const showVoiceCall = allowVoiceCall && !gateCalls;
  const callsHidden = gateCalls && (allowVideoCall || allowVoiceCall);

  const hasSecondaryActions = showVideoCall || showVoiceCall || allowTips;
  const secondaryCount = [showVideoCall, showVoiceCall, allowTips].filter(Boolean).length;
  const secondaryGrid = secondaryCount === 1 ? "grid-cols-1" : secondaryCount === 2 ? "grid-cols-2" : "grid-cols-3";

  if (!allowChat && !hasSecondaryActions && !callsHidden) return null;

  const isPreview = isOwner;

  return (
    <>
      <div className={cn("mb-6 space-y-2.5", isPreview && "pointer-events-none")}>

        {/* Call outcome flash */}
        {callOutcome && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-sm font-medium animate-in fade-in duration-200",
            callOutcome === "declined"
              ? "bg-red-500/15 border border-red-500/25 text-red-400"
              : "bg-amber-500/15 border border-amber-500/25 text-amber-400"
          )}>
            <PhoneOff className="h-4 w-4 flex-shrink-0" />
            {callOutcome === "declined" ? "Call declined" : "No answer"}
          </div>
        )}

        {/* Chat Input — primary action */}
        {allowChat && (
          <div>
            {sentConversationId ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-green-500/15 border border-green-500/25 animate-in fade-in duration-300">
                <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-sm text-green-400 font-medium">Message sent!</span>
                <Link href={`/chats/${sentConversationId}`} className="text-sm text-white/70 hover:text-white underline underline-offset-2 transition-colors">
                  Opening chat →
                </Link>
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-2 w-full rounded-2xl border px-4 py-2.5 transition-all duration-200",
                inputFocused
                  ? "bg-white/15 border-pink-500/50 shadow-[0_0_0_3px_rgba(236,72,153,0.1)]"
                  : "bg-white/8 border-white/10 hover:bg-white/12 hover:border-white/20"
              )}>
                <MessageCircle className="h-4 w-4 text-white/30 flex-shrink-0" />
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onFocus={handleChatInputFocus}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                  placeholder={existingConversationId ? `Message ${firstName}…` : `Say hi to ${firstName}…`}
                  className="flex-1 bg-transparent text-white placeholder:text-white/35 text-sm outline-none min-w-0"
                  maxLength={500}
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={sendingMessage || !chatMessage.trim()}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
                    chatMessage.trim() && !sendingMessage
                      ? "bg-gradient-to-r from-pink-500 to-violet-500 hover:scale-110 active:scale-95 shadow-lg shadow-pink-500/25"
                      : "bg-white/10"
                  )}
                >
                  {sendingMessage
                    ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                    : <SendHorizontal className="h-3.5 w-3.5 text-white" />
                  }
                </button>
              </div>
            )}
            {/* Price transparency — without this, a fan's first hint that
                messages cost coins is a 402 error after they hit send. Uses
                messageCoinCost (not the raw rate) so the 5-coin default shows
                even when a model never set a rate. */}
            {!sentConversationId && (
              <div className="flex items-center justify-between gap-2 mt-1 px-1">
                {existingConversationId ? (
                  <Link
                    href={`/chats/${existingConversationId}`}
                    className="text-[10px] text-white/50 hover:text-white/80 underline-offset-2 hover:underline transition-colors"
                  >
                    View your chat with {firstName} →
                  </Link>
                ) : (
                  <span />
                )}
                <p className="flex items-center gap-1 text-[10px] text-white/35">
                  <Coins className="h-2.5 w-2.5" />
                  {messageCoinCost(messageRate)} coins per message
                </p>
              </div>
            )}
          </div>
        )}

        {/* Secondary actions — Video, Voice, Tip */}
        {hasSecondaryActions && (
          <div className={`grid ${secondaryGrid} gap-2`}>
            {showVideoCall && (
              <button
                onClick={handleVideoCall}
                disabled={startingCall !== null}
                className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 hover:border-pink-500/50 text-pink-400 hover:text-pink-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                {startingCall === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                Video
              </button>
            )}
            {showVoiceCall && (
              <button
                onClick={handleVoiceCall}
                disabled={startingCall !== null}
                className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                {startingCall === "voice" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
                Voice
              </button>
            )}
            {allowTips && (
              <button
                onClick={handleTip}
                className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 text-xs font-medium transition-all active:scale-95"
              >
                <Gift className="h-3.5 w-3.5" />
                Tip
              </button>
            )}
          </div>
        )}

        {/* Subtle fallback when calls are allowed but the model isn't
            reachable — the message box above stays the primary action. */}
        {callsHidden && (
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/40">
            <PhoneOff className="h-3 w-3" />
            Not taking calls right now — send a message instead
          </p>
        )}
      </div>

      {/* Video Call Confirmation */}
      <Dialog open={showVideoConfirm} onOpenChange={setShowVideoConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-pink-500" /> Video Call
            </DialogTitle>
            <DialogDescription>Start a video call with {firstName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
              <Coins className="h-6 w-6 text-yellow-500" />
              <span className="text-2xl font-bold">{videoCallRate}</span>
              <span className="text-muted-foreground">coins per minute</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowVideoConfirm(false)}>Cancel</Button>
              <Button className="flex-1 exa-gradient-button" onClick={() => startCall("video")}>Call Now</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voice Call Confirmation */}
      <Dialog open={showVoiceConfirm} onOpenChange={setShowVoiceConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" /> Voice Call
            </DialogTitle>
            <DialogDescription>Start a voice call with {firstName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
              <Coins className="h-6 w-6 text-yellow-500" />
              <span className="text-2xl font-bold">{voiceCallRate}</span>
              <span className="text-muted-foreground">coins per minute</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowVoiceConfirm(false)}>Cancel</Button>
              <Button className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white" onClick={() => startCall("voice")}>Call Now</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={showTipDialog} onOpenChange={(open) => { setShowTipDialog(open); if (!open) { setSelectedTipAmount(null); setSelectedTipGift(null); setCustomTipAmount(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" /> Send a Tip
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your balance:</span>
              <span className="flex items-center gap-1 font-medium">
                <Coins className="h-4 w-4 text-pink-500" />{coinBalance} coins
              </span>
            </div>
            {/* Gifts — small named tips so light spenders have something to send */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Gifts</p>
              <div className="grid grid-cols-3 gap-2">
                {TIP_GIFTS.map((gift) => {
                  const canAfford = coinBalance >= gift.amount;
                  const isSelected = selectedTipGift?.key === gift.key;
                  return (
                    <button
                      key={gift.key}
                      onClick={() => {
                        hapticFeedback("light");
                        if (canAfford) {
                          setSelectedTipGift(gift);
                          setSelectedTipAmount(null);
                          setCustomTipAmount("");
                        } else setBuyCoinsOpen(true);
                      }}
                      disabled={sending}
                      className={cn(
                        "py-2.5 px-2 rounded-lg border text-center transition-all active:scale-95",
                        isSelected ? "border-pink-500 bg-pink-500/10"
                          : canAfford ? "border-border hover:border-pink-500/50 hover:bg-pink-500/5"
                          : "border-border/50 hover:border-amber-500/40 hover:bg-amber-500/5"
                      )}
                    >
                      <div className={cn("text-xl leading-none", !canAfford && "opacity-50")}>{gift.emoji}</div>
                      <div className={cn("text-xs font-semibold mt-1", isSelected ? "text-pink-500" : !canAfford ? "text-muted-foreground" : undefined)}>
                        {gift.label}
                      </div>
                      <div className={cn("text-[10px]", canAfford ? "text-muted-foreground" : "text-amber-500/80")}>
                        {canAfford ? `${gift.amount} coins` : "top up"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Super Tips */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Super Tips</p>
              <div className="grid grid-cols-2 gap-2">
                {SUPER_TIP_AMOUNTS.map((amount) => {
                  const canAfford = coinBalance >= amount;
                  const isSelected = selectedTipAmount === amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => {
                        hapticFeedback("light");
                        // Unaffordable tiers open the top-up flow instead of dead-ending
                        if (canAfford) {
                          setSelectedTipAmount(amount);
                          setSelectedTipGift(null);
                          setCustomTipAmount("");
                        } else setBuyCoinsOpen(true);
                      }}
                      disabled={sending}
                      className={cn(
                        "py-3 px-4 rounded-lg border text-center transition-all active:scale-95",
                        isSelected ? "border-pink-500 bg-pink-500/10 text-pink-500"
                          : canAfford ? "border-border hover:border-pink-500/50 hover:bg-pink-500/5"
                          : "border-border/50 text-muted-foreground hover:border-amber-500/40 hover:bg-amber-500/5"
                      )}
                    >
                      <div className={cn("text-lg font-semibold", !canAfford && "opacity-60")}>{amount}</div>
                      <div className={cn("text-xs", canAfford ? "text-muted-foreground" : "text-amber-500/80")}>
                        {canAfford ? "coins" : "top up"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Custom amount */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border focus-within:border-pink-500/50 transition-colors">
              <Coins className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <input
                type="number"
                inputMode="numeric"
                min={MIN_CUSTOM_TIP}
                max={MAX_TIP}
                value={customTipAmount}
                onChange={(e) => {
                  setCustomTipAmount(e.target.value);
                  setSelectedTipGift(null);
                  setSelectedTipAmount(null);
                }}
                placeholder={`Custom amount (min ${MIN_CUSTOM_TIP})`}
                disabled={sending}
                className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {customTipAmount && !customTipValid && (
                <span className="text-[10px] text-amber-500/90 flex-shrink-0">min {MIN_CUSTOM_TIP}</span>
              )}
            </div>
            <Button
              onClick={sendTip}
              disabled={!tipAmount || sending}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                : selectedTipGift ? <><span className="mr-2 text-base leading-none">{selectedTipGift.emoji}</span>Send a {selectedTipGift.label} · {selectedTipGift.amount} Coins</>
                : tipAmount ? <><Gift className="mr-2 h-4 w-4" />Send {tipAmount} Coins</>
                : "Pick a gift or amount"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Need more coins?{" "}
              <button
                type="button"
                onClick={() => setBuyCoinsOpen(true)}
                className="text-pink-500 hover:underline font-medium"
              >
                Buy coins
              </button>
            </p>
            <BuyCoinsModal isOpen={buyCoinsOpen} onClose={() => setBuyCoinsOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-8 text-white text-center">
            <Image src="/exa-logo-white.png" alt="EXA" width={100} height={32} className="h-8 w-auto mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Connect with {firstName}</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <div className="p-2 rounded-full bg-pink-500/20"><Video className="h-4 w-4 text-pink-500" /></div>
                <div><p className="font-semibold text-sm">Video Call</p><p className="text-xs text-muted-foreground">Face-to-face</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="p-2 rounded-full bg-violet-500/20"><MessageCircle className="h-4 w-4 text-violet-500" /></div>
                <div><p className="font-semibold text-sm">Direct Chat</p><p className="text-xs text-muted-foreground">Private messages</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="p-2 rounded-full bg-blue-500/20"><Phone className="h-4 w-4 text-blue-500" /></div>
                <div><p className="font-semibold text-sm">Voice Call</p><p className="text-xs text-muted-foreground">Talk directly</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="p-2 rounded-full bg-yellow-500/20"><Gift className="h-4 w-4 text-yellow-500" /></div>
                <div><p className="font-semibold text-sm">Send Tips</p><p className="text-xs text-muted-foreground">Show support</p></div>
              </div>
            </div>
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">Join Fans and Brands connecting with EXA Models</p>
            </div>
            <div className="flex flex-col gap-3">
              {/* Inline signup that lands the fan back on THIS profile (with
                  referrer attribution) instead of dumping them on /dashboard —
                  same pattern as the homepage carousel gate (PR #43). */}
              <FanSignupDialog redirectTo={`/${modelUsername}`} referrerModelId={modelId} source="profile_actions">
                <Button className="w-full h-12 text-base exa-gradient-button">Create Free Account</Button>
              </FanSignupDialog>
              <Link href={`/signin?redirect=${encodeURIComponent(`/${modelUsername}`)}`} className="w-full">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  Already have an account? <span className="text-pink-500 ml-1">Sign In</span>
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
