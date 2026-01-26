"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseTypingIndicatorProps {
  conversationId: string;
  currentActorId: string;
  currentActorName: string;
}

interface TypingUser {
  actorId: string;
  name: string;
}

export function useTypingIndicator({
  conversationId,
  currentActorId,
  currentActorName,
}: UseTypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const supabase = createClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast typing status
  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    // Throttle broadcasts to once per second
    if (now - lastBroadcastRef.current < 1000) return;
    lastBroadcastRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        actorId: currentActorId,
        name: currentActorName,
        isTyping: true,
      },
    });

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: {
          actorId: currentActorId,
          name: currentActorName,
          isTyping: false,
        },
      });
    }, 3000);
  }, [currentActorId, currentActorName]);

  // Stop typing indicator (call when message is sent)
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        actorId: currentActorId,
        name: currentActorName,
        isTyping: false,
      },
    });
  }, [currentActorId, currentActorName]);

  // Subscribe to typing events
  useEffect(() => {
    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const { actorId, name, isTyping } = payload.payload;

        // Ignore own typing events
        if (actorId === currentActorId) return;

        setTypingUsers((prev) => {
          if (isTyping) {
            // Add user if not already in list
            if (!prev.some((u) => u.actorId === actorId)) {
              return [...prev, { actorId, name }];
            }
            return prev;
          } else {
            // Remove user from typing list
            return prev.filter((u) => u.actorId !== actorId);
          }
        });
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [conversationId, currentActorId, supabase]);

  // Auto-clear typing users after 5 seconds (in case stop event is missed)
  useEffect(() => {
    if (typingUsers.length === 0) return;

    const timeout = setTimeout(() => {
      setTypingUsers([]);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [typingUsers]);

  return {
    typingUsers,
    broadcastTyping,
    stopTyping,
  };
}
