"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

interface UseRealtimeMessagesOptions {
  conversationId: string;
  currentActorId: string;
  onNewMessage: (message: Message) => void;
  onSystemTip?: (senderName: string) => void;
}

/**
 * Subscribes to real-time message inserts for a conversation.
 * Strips media_url from locked PPV messages before passing to callback.
 */
export function useRealtimeMessages({
  conversationId,
  currentActorId,
  onNewMessage,
  onSystemTip,
}: UseRealtimeMessagesOptions) {
  // Use refs so the subscription callback always sees the latest callbacks
  const onNewMessageRef = useRef(onNewMessage);
  const onSystemTipRef = useRef(onSystemTip);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);
  useEffect(() => {
    onSystemTipRef.current = onSystemTip;
  }, [onSystemTip]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          let newMessage = payload.new as Message & { is_system?: boolean };

          // Strip media_url from locked PPV messages
          if (
            (newMessage.media_price ?? 0) > 0 &&
            newMessage.sender_id !== currentActorId &&
            !(newMessage.media_viewed_by ?? []).includes(currentActorId)
          ) {
            newMessage = { ...newMessage, media_url: null };
          }

          onNewMessageRef.current(newMessage);

          // Notify on tips from others
          if (
            newMessage.is_system &&
            newMessage.content?.includes("tip") &&
            newMessage.sender_id !== currentActorId
          ) {
            onSystemTipRef.current?.("tip");
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, currentActorId]);
}
