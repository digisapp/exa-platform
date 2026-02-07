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
  lastSeen: number;
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
            const now = Date.now();
            // Update timestamp if already in list, otherwise add
            const exists = prev.some((u) => u.actorId === actorId);
            if (exists) {
              return prev.map((u) =>
                u.actorId === actorId ? { ...u, lastSeen: now } : u
              );
            }
            return [...prev, { actorId, name, lastSeen: now }];
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

  // Auto-clear stale typing users every 2 seconds (per-user, based on lastSeen)
  useEffect(() => {
    if (typingUsers.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const active = prev.filter((u) => now - u.lastSeen < 5000);
        return active.length !== prev.length ? active : prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [typingUsers.length]);

  return {
    typingUsers,
    broadcastTyping,
    stopTyping,
  };
}
