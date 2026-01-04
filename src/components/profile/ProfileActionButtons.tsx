"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Video, Coins, Loader2, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoRoom } from "@/components/video";
import Link from "next/link";
import { toast } from "sonner";

interface ProfileActionButtonsProps {
  isLoggedIn: boolean;
  isOwner: boolean;
  modelUsername: string;
  modelActorId: string | null;
  messageRate?: number;
  videoCallRate?: number;
  voiceCallRate?: number;
}

export function ProfileActionButtons({
  isLoggedIn,
  isOwner,
  modelUsername,
  messageRate = 0,
  videoCallRate = 0,
  voiceCallRate = 0,
}: ProfileActionButtonsProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showVideoConfirm, setShowVideoConfirm] = useState(false);
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(10);
  const [sending, setSending] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [startingVoiceCall, setStartingVoiceCall] = useState(false);
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
      window.location.href = `/chats?new=${modelUsername}`;
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
    window.location.href = `/messages?new=${modelUsername}`;
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

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-6">
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
          disabled={startingCall}
        >
          {startingCall ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Video className="mr-1.5 h-4 w-4" />
          )}
          {startingCall ? "Calling..." : "Video"}
        </Button>
        <Button
          className="h-11 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
          onClick={handleVoiceCall}
          disabled={startingVoiceCall}
        >
          {startingVoiceCall ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Phone className="mr-1.5 h-4 w-4" />
          )}
          {startingVoiceCall ? "Calling..." : "Voice"}
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
