"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseConversationPresenceProps {
  conversationId: string;
  currentActorId: string;
  otherActorId: string;
}

/**
 * Mutual presence for an open conversation. Both participants track
 * themselves on a per-conversation channel keyed by actor id.
 *
 * - `otherPresent`: the other participant has this chat open right now
 *   (live, unlike the 5-minute last_active_at heuristic).
 * - `otherEnteredAt`: timestamp that updates only on a genuine
 *   not-here → here transition after the initial sync — joins delivered
 *   during initial state replay never fire it, so mounting next to an
 *   already-present participant doesn't announce an "entrance".
 */
export function useConversationPresence({
  conversationId,
  currentActorId,
  otherActorId,
}: UseConversationPresenceProps) {
  const [otherPresent, setOtherPresent] = useState(false);
  const [otherEnteredAt, setOtherEnteredAt] = useState<number | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat-presence:${conversationId}`, {
      config: { presence: { key: currentActorId } },
    });

    const computePresent = () => {
      setOtherPresent(otherActorId in channel.presenceState());
    };

    channel
      // Joins replayed before the first sync are existing members, not entrances
      .on("presence", { event: "join" }, ({ key }) => {
        if (key === otherActorId && syncedRef.current) {
          setOtherEnteredAt(Date.now());
        }
      })
      .on("presence", { event: "sync" }, () => {
        syncedRef.current = true;
        computePresent();
      })
      .on("presence", { event: "leave" }, computePresent)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      syncedRef.current = false;
      setOtherPresent(false);
      channel.unsubscribe();
    };
  }, [conversationId, currentActorId, otherActorId]);

  return { otherPresent, otherEnteredAt };
}
