"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { VideoRoom } from "./VideoRoom";

interface IncomingCallDialogProps {
  sessionId: string;
  callerName: string;
  callerAvatar?: string;
  callType?: "video" | "voice";
  onClose: () => void;
}

export function IncomingCallDialog({
  sessionId,
  callerName,
  callerAvatar,
  callType: initialCallType = "video",
  onClose,
}: IncomingCallDialogProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [callSession, setCallSession] = useState<{
    token: string;
    roomName: string;
    callType: "video" | "voice";
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [callType] = useState<"video" | "voice">(initialCallType);

  // Auto-miss after 30 seconds (timeout = missed, not declined)
  useEffect(() => {
    if (timeLeft <= 0) {
      handleMissed();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleAccept = async () => {
    setIsJoining(true);
    try {
      const response = await fetch("/api/calls/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to join call");
        onClose();
        return;
      }

      setCallSession({
        token: data.token,
        roomName: data.roomName,
        callType: data.callType || callType,
      });
    } catch (error) {
      console.error("Error joining call:", error);
      toast.error("Failed to join call");
      onClose();
    } finally {
      setIsJoining(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await fetch(`/api/calls/join?sessionId=${sessionId}&reason=declined`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error declining call:", error);
    }
    onClose();
  };

  const handleMissed = async () => {
    setIsDeclining(true);
    try {
      await fetch(`/api/calls/join?sessionId=${sessionId}&reason=missed`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error marking call as missed:", error);
    }
    onClose();
  };

  const handleCallEnd = () => {
    setCallSession(null);
    onClose();
  };

  if (callSession) {
    return (
      <VideoRoom
        token={callSession.token}
        roomName={callSession.roomName}
        sessionId={sessionId}
        onCallEnd={handleCallEnd}
        callType={callSession.callType}
      />
    );
  }

  const callTypeLabel = callType === "voice" ? "Voice" : "Video";

  return (
    <Dialog open onOpenChange={() => handleDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Incoming {callTypeLabel} Call</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-green-500 animate-pulse">
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <h3 className="mt-4 text-xl font-semibold">{callerName}</h3>
          <p className="text-muted-foreground">is calling you...</p>

          <p className="text-sm text-muted-foreground mt-2">
            Auto-decline in {timeLeft}s
          </p>

          <div className="flex gap-4 mt-6">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={handleDecline}
              disabled={isDeclining || isJoining}
            >
              {isDeclining ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <PhoneOff className="h-6 w-6" />
              )}
            </Button>

            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
              onClick={handleAccept}
              disabled={isJoining || isDeclining}
            >
              {isJoining ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
