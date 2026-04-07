"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseReadReceiptsOptions {
  conversationId: string;
  otherActorId: string;
}

/**
 * Fetches and subscribes to the other participant's last_read_at timestamp
 * for displaying read receipts ("Seen · X time ago").
 */
export function useReadReceipts({
  conversationId,
  otherActorId,
}: UseReadReceiptsOptions) {
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial value
    (supabase.from("conversation_participants") as any)
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .eq("actor_id", otherActorId)
      .single()
      .then(({ data }: { data: { last_read_at: string | null } | null }) => {
        if (data?.last_read_at) setOtherLastReadAt(data.last_read_at);
      });

    // Subscribe to changes
    const readChannel = supabase
      .channel(`read:${conversationId}:${otherActorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { actor_id: string; last_read_at: string | null };
          if (updated.actor_id === otherActorId && updated.last_read_at) {
            setOtherLastReadAt(updated.last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      readChannel.unsubscribe();
    };
  }, [conversationId, otherActorId]);

  return otherLastReadAt;
}
