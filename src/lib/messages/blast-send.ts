import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Shared blast mechanics for /api/messages/blast and
// /api/spotlight/thank-blast: batched free model-message inserts, the
// conversations.updated_at bump, and the final unread-counter RPC.
//
// `service` must be a service-role client: increment_unread_for_conversations
// is SECURITY DEFINER and service-role-only (20260711100001, per the RPC
// lockdown convention). Callers authenticate the sender BEFORE calling this
// helper — the sender actor id is passed explicitly and trusted.

// Insert 10 conversations at a time (same pacing both routes always used)
const BLAST_INSERT_BATCH = 10;

export interface BlastSendResult {
  sent: number;
  failed: number;
  /** Conversations whose message insert actually landed. */
  sentConversationIds: string[];
  /** Conversations whose insert (or updated_at bump) threw. */
  failedConversationIds: string[];
}

export async function sendBlastToConversations(
  service: SupabaseClient,
  senderActorId: string,
  content: string,
  conversationIds: string[]
): Promise<BlastSendResult> {
  let sent = 0;
  // Track which inserts actually landed — unread counters must only be
  // bumped for those, or partially failed blasts leave phantom badges.
  const sentConversationIds: string[] = [];
  const failedConversationIds: string[] = [];

  for (let i = 0; i < conversationIds.length; i += BLAST_INSERT_BATCH) {
    const batch = conversationIds.slice(i, i + BLAST_INSERT_BATCH);

    const results = await Promise.allSettled(
      batch.map(async (conversationId) => {
        // Insert message directly (model sending is free)
        const { error } = await (service.from("messages") as any).insert({
          conversation_id: conversationId,
          sender_id: senderActorId,
          content,
          is_system: false,
        });
        if (error) throw error;

        // Update conversation timestamp
        await (service.from("conversations") as any)
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);

        return true;
      })
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sent++;
        sentConversationIds.push(batch[index]);
      } else {
        failedConversationIds.push(batch[index]);
      }
    });
  }

  // Bump recipients' unread counters so the blast actually surfaces a badge.
  // The direct inserts above (unlike send_message_with_coins) don't touch
  // unread_count, so this goes through the service-role-only SECURITY
  // DEFINER RPC with the sender passed explicitly.
  if (sentConversationIds.length > 0) {
    const { error: unreadError } = await (service as any).rpc(
      "increment_unread_for_conversations",
      {
        p_conversation_ids: sentConversationIds,
        p_sender_actor_id: senderActorId,
      }
    );
    if (unreadError) {
      logger.error("Blast unread increment failed", unreadError);
    }
  }

  return {
    sent,
    failed: failedConversationIds.length,
    sentConversationIds,
    failedConversationIds,
  };
}
