"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MessageCircle, Video, Coins, Loader2, Phone, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { showTipSuccessToast } from "@/lib/tip-toast";

// Dynamic import for VideoRoom - only loads when call starts (saves ~200KB)
const VideoRoom = dynamic(() => import("@/components/video").then(mod => mod.VideoRoom), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
    </div>
  ),
});

const TIP_AMOUNTS = [1, 5, 10, 25, 50, 100];

interface ProfileActionButtonsProps {
  isLoggedIn: boolean;
  isOwner: boolean;
  modelUsername: string;
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
}

export function ProfileActionButtons({
  isLoggedIn,
  isOwner,
  modelUsername,
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
}: ProfileActionButtonsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [startingVoiceCall, setStartingVoiceCall] = useState(false);
  const router = useRouter();
  const [callSession, setCallSession] = useState<{
    sessionId: string;
    token: string;
    roomName: string;
    recipientName: string;
    callRate: number;
    callType: "video" | "voice";
  } | null>(null);

  const handleChat = () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }
    if (messageRate > 0) {
      setShowChatConfirm(true);
    } else {
      router.push(`/chats?new=${modelUsername}`);
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
      // Free call - start directly
      proceedToVideoCall();
    }
  };

  const handleVoiceCall = () => {
    if (!isLoggedIn) {
      setShowAuthDialog(true);
      return;
    }
    if (voiceCallRate > 0) {
      setShowVoiceConfirm(true);
    } else {
      // Free call - start directly
      proceedToVoiceCall();
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
    window.location.href = `/chats?new=${modelUsername}`;
  };

  const proceedToVideoCall = async () => {
    setShowVideoConfirm(false);
    setStartingCall(true);
    try {
      const response = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername: modelUsername, callType: "video" }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to start call");
        return;
      }

      setCallSession({
        sessionId: data.sessionId,
        token: data.token,
        roomName: data.roomName,
        recipientName: data.recipientName,
        callRate: data.callRate,
        callType: "video",
      });

      toast.success("Calling " + data.recipientName + "...");
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start video call");
    } finally {
      setStartingCall(false);
    }
  };

  const proceedToVoiceCall = async () => {
    setShowVoiceConfirm(false);
    setStartingVoiceCall(true);
    try {
      const response = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername: modelUsername, callType: "voice" }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to start call");
        return;
      }

      setCallSession({
        sessionId: data.sessionId,
        token: data.token,
        roomName: data.roomName,
        recipientName: data.recipientName,
        callRate: data.callRate,
        callType: "voice",
      });

      toast.success("Calling " + data.recipientName + "...");
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start voice call");
    } finally {
      setStartingVoiceCall(false);
    }
  };

  const handleCallEnd = () => {
    setCallSession(null);
  };

  const sendTip = async () => {
    if (!selectedTipAmount || !modelActorId) return;

    setSending(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: modelActorId,
          amount: selectedTipAmount,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast.error(`Insufficient coins. Need ${data.required}, have ${data.balance}`);
        } else {
          toast.error(data.error || "Failed to send tip");
        }
        return;
      }

      hapticFeedback("success");
      showTipSuccessToast({ amount: selectedTipAmount, recipientName: data.recipientName });
      setShowTipDialog(false);
      setSelectedTipAmount(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send tip");
    } finally {
      setSending(false);
    }
  };

  // On own profile, show buttons but make them non-clickable (no grayed out look)
  const isPreview = isOwner;

  // Show video call room if call is active
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

  // Count how many buttons are visible
  const visibleButtons = [allowChat, allowVideoCall, allowVoiceCall, allowTips].filter(Boolean).length;

  // Don't render anything if no buttons are enabled
  if (visibleButtons === 0) {
    return null;
  }

  // Dynamic grid columns based on number of visible buttons
  const gridCols = visibleButtons === 1 ? "grid-cols-1" :
                   visibleButtons === 2 ? "grid-cols-2" :
                   visibleButtons === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <>
      <div className={`grid ${gridCols} gap-2 mb-6 ${isPreview ? "pointer-events-none" : ""}`}>
        {allowChat && (
          <Button
            className="exa-gradient-button h-11 text-sm font-semibold rounded-full px-2"
            onClick={handleChat}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Chat
          </Button>
        )}
        {allowVideoCall && (
          <Button
            className="exa-gradient-button h-11 text-sm font-semibold rounded-full px-2"
            onClick={handleVideoCall}
            disabled={startingCall}
          >
            {startingCall ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Video className="h-4 w-4 mr-1" />
            )}
            {startingCall ? "..." : "Video"}
          </Button>
        )}
        {allowVoiceCall && (
          <Button
            className="h-11 text-sm font-semibold rounded-full px-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            onClick={handleVoiceCall}
            disabled={startingVoiceCall}
          >
            {startingVoiceCall ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Phone className="h-4 w-4 mr-1" />
            )}
            {startingVoiceCall ? "..." : "Voice"}
          </Button>
        )}
        {allowTips && (
          <Button
            className="h-11 text-sm font-semibold rounded-full px-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={handleTip}
          >
            <Gift className="h-4 w-4 mr-1" />
            Tip
          </Button>
        )}
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

      {/* Voice Call Confirmation Dialog */}
      <Dialog open={showVoiceConfirm} onOpenChange={setShowVoiceConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" />
              Voice Call
            </DialogTitle>
            <DialogDescription>
              Start a voice call with {modelUsername}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted/50">
              <Coins className="h-6 w-6 text-yellow-500" />
              <span className="text-2xl font-bold">{voiceCallRate}</span>
              <span className="text-muted-foreground">coins per minute</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              You will be charged {voiceCallRate} coins for each minute of the call
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowVoiceConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                onClick={proceedToVoiceCall}
              >
                Start Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog - preset amounts */}
      <Dialog open={showTipDialog} onOpenChange={(open) => {
        setShowTipDialog(open);
        if (!open) setSelectedTipAmount(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Send a Tip
            </DialogTitle>
            <DialogDescription>
              Show your appreciation for {modelName || modelUsername}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your balance:</span>
              <span className="flex items-center gap-1 font-medium">
                <Coins className="h-4 w-4 text-pink-500" />
                {coinBalance} coins
              </span>
            </div>

            {/* Tip amounts grid */}
            <div className="grid grid-cols-3 gap-2">
              {TIP_AMOUNTS.map((amount) => {
                const canAfford = coinBalance >= amount;
                const isSelected = selectedTipAmount === amount;

                return (
                  <button
                    key={amount}
                    onClick={() => {
                      if (canAfford) {
                        hapticFeedback("light");
                        setSelectedTipAmount(amount);
                      }
                    }}
                    disabled={!canAfford || sending}
                    className={cn(
                      "py-3 px-4 rounded-lg border text-center transition-all active:scale-95",
                      isSelected
                        ? "border-pink-500 bg-pink-500/10 text-pink-500"
                        : canAfford
                          ? "border-border hover:border-pink-500/50 hover:bg-pink-500/5"
                          : "border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="text-lg font-semibold">{amount}</div>
                    <div className="text-xs text-muted-foreground">coins</div>
                  </button>
                );
              })}
            </div>

            {/* Send button */}
            <Button
              onClick={sendTip}
              disabled={!selectedTipAmount || sending}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : selectedTipAmount ? (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Send {selectedTipAmount} Coins
                </>
              ) : (
                "Select an amount"
              )}
            </Button>

            {/* Need more coins? */}
            {coinBalance < 100 && (
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

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-8 text-white text-center">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={100}
              height={32}
              className="h-8 w-auto mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold">Connect with {modelUsername}</h2>
          </div>

          {/* Features */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <div className="p-2 rounded-full bg-pink-500/20">
                  <Video className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Video Call</p>
                  <p className="text-xs text-muted-foreground">Face-to-face</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="p-2 rounded-full bg-violet-500/20">
                  <MessageCircle className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Direct Chat</p>
                  <p className="text-xs text-muted-foreground">Private messages</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Phone className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Voice Call</p>
                  <p className="text-xs text-muted-foreground">Talk directly</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="p-2 rounded-full bg-yellow-500/20">
                  <Gift className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Send Tips</p>
                  <p className="text-xs text-muted-foreground">Show support</p>
                </div>
              </div>
            </div>

            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">
                Join Fans and Brands connecting with EXA Models
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Link href="/fan/signup" className="w-full">
                <Button className="w-full h-12 text-base exa-gradient-button">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/signin" className="w-full">
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
