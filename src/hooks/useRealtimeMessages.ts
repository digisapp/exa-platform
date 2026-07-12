"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "@/types/database";
import { isLockedForViewer } from "@/lib/ppv";

interface UseRealtimeMessagesOptions {
  conversationId: string;
  currentActorId: string;
  onNewMessage: (message: Message) => void;
  /**
   * Called when a media message has been hydrated with its sanitized
   * media_url via /api/messages/[id] (realtime payloads no longer carry the
   * column). Handlers should upsert by id WITHOUT new-message side effects
   * (chime, unread count) — onNewMessage already fired for this message.
   */
  onMessageHydrated?: (message: Message) => void;
  onSystemTip?: (senderName: string) => void;
  /**
   * Called when realtime delivery may have dropped messages (subscription
   * error/recovery, or tab returning from background where mobile browsers
   * kill the socket). The caller should refetch recent messages and merge.
   */
  onResync?: () => void;
}

/**
 * Subscribes to real-time message inserts for a conversation.
 * Strips media_url from locked PPV messages before passing to callback.
 * Self-heals: resubscribes with backoff on channel errors and asks the
 * caller to resync whenever a gap in delivery is possible.
 */
export function useRealtimeMessages({
  conversationId,
  currentActorId,
  onNewMessage,
  onMessageHydrated,
  onSystemTip,
  onResync,
}: UseRealtimeMessagesOptions) {
  // Use refs so the subscription callback always sees the latest callbacks
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageHydratedRef = useRef(onMessageHydrated);
  const onSystemTipRef = useRef(onSystemTip);
  const onResyncRef = useRef(onResync);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);
  useEffect(() => {
    onMessageHydratedRef.current = onMessageHydrated;
  }, [onMessageHydrated]);
  useEffect(() => {
    onSystemTipRef.current = onSystemTip;
  }, [onSystemTip]);
  useEffect(() => {
    onResyncRef.current = onResync;
  }, [onResync]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryAttempts = 0;
    let disposed = false;
    // Only resync after an actual gap — not on the initial subscribe
    let deliveryGapPossible = false;

    const handleInsert = (payload: { new: unknown }) => {
      let newMessage = payload.new as Message & { is_system?: boolean };

      // Strip media_url from locked PPV messages. Since 20260711100005 the
      // realtime payload shouldn't carry media_url at all (clients have no
      // SELECT privilege on that column) — kept as defense-in-depth.
      if (isLockedForViewer(newMessage, currentActorId)) {
        newMessage = { ...newMessage, media_url: null };
      }

      onNewMessageRef.current(newMessage);

      // Doorbell → hydrate: media messages arrive without media_url (column
      // grants). When this viewer is allowed to see the media (free media,
      // own message, already unlocked), fetch the sanitized copy — the server
      // decides per-viewer — and re-deliver so the caller merges the URL in.
      // Locked PPV stays a blurred bubble until the unlock flow provides it.
      if (
        newMessage.media_type &&
        !newMessage.media_url &&
        !isLockedForViewer(newMessage, currentActorId)
      ) {
        fetch(`/api/messages/${newMessage.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (disposed || !data?.message?.media_url) return;
            onMessageHydratedRef.current?.({ ...newMessage, ...data.message });
          })
          .catch(() => {
            // Best-effort: the bubble renders without media; resync paths
            // (visibility/subscription recovery) will fill it in later.
          });
      }

      // Notify on tips from others
      if (
        newMessage.is_system &&
        newMessage.content?.includes("tip") &&
        newMessage.sender_id !== currentActorId
      ) {
        onSystemTipRef.current?.("tip");
      }
    };

    const subscribe = () => {
      if (disposed) return;
      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          handleInsert
        )
        .subscribe((status) => {
          if (disposed) return;

          if (status === "SUBSCRIBED") {
            retryAttempts = 0;
            if (deliveryGapPossible) {
              deliveryGapPossible = false;
              onResyncRef.current?.();
            }
            return;
          }

          // Anything else means messages may be dropping. Tear down and
          // resubscribe with capped backoff instead of going silently deaf.
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            deliveryGapPossible = true;
            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }
            const delay = Math.min(30_000, 1_000 * 2 ** retryAttempts);
            retryAttempts += 1;
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(subscribe, delay);
          }
        });
    };

    subscribe();

    // Mobile browsers kill the websocket while backgrounded; the channel can
    // look healthy again before missed rows are ever delivered. Treat every
    // return to the foreground as a potential gap.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        onResyncRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, currentActorId]);
}
