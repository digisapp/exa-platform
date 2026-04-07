"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface IncomingCall {
  sessionId: string;
  callerName: string;
  callerAvatar?: string;
  callType?: "video" | "voice";
}

interface UseIncomingCallsOptions {
  currentActorId: string;
  conversationId: string;
  callerName: string;
  callerAvatar?: string | null;
  onCallReceived?: (callType: "video" | "voice") => void;
}

/**
 * Subscribes to incoming video/voice call sessions for the current user
 * within a specific conversation.
 */
export function useIncomingCalls({
  currentActorId,
  conversationId,
  callerName,
  callerAvatar,
  onCallReceived,
}: UseIncomingCallsOptions) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const onCallReceivedRef = useRef(onCallReceived);
  useEffect(() => {
    onCallReceivedRef.current = onCallReceived;
  }, [onCallReceived]);

  useEffect(() => {
    const supabase = createClient();

    const callChannel = supabase
      .channel(`calls:${currentActorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_call_sessions",
          filter: `recipient_id=eq.${currentActorId}`,
        },
        (payload) => {
          const callSession = payload.new as any;
          if (
            callSession.conversation_id === conversationId &&
            callSession.status === "pending"
          ) {
            const callType = callSession.call_type || "video";
            setIncomingCall({
              sessionId: callSession.id,
              callerName,
              callerAvatar: callerAvatar || undefined,
              callType,
            });
            onCallReceivedRef.current?.(callType);
          }
        }
      )
      .subscribe();

    return () => {
      callChannel.unsubscribe();
    };
  }, [currentActorId, conversationId, callerName, callerAvatar]);

  const dismissCall = () => setIncomingCall(null);

  return { incomingCall, dismissCall };
}
