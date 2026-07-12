/**
 * Per-viewer PPV stripping for chat messages.
 *
 * A locked PPV message's media_url must never reach a viewer who hasn't paid:
 * media is locked when it has a price, the viewer isn't the sender, and the
 * viewer hasn't unlocked it. The database enforces this at the column level
 * (20260711100005: clients can't SELECT messages.media_url at all), so every
 * server path that reads media_url via the service role must strip it with
 * this rule before responding. Mirrors the SQL rule in
 * get_last_messages_for_conversations.
 *
 * Used by /api/messages/list, /api/messages/[id], the /chats/[conversationId]
 * RSC, and (as client-side defense-in-depth) useRealtimeMessages.
 */

interface PpvMessageFields {
  sender_id: string;
  media_url?: string | null;
  media_price?: number | null;
  media_viewed_by?: string[] | null;
}

export function isLockedForViewer(
  msg: PpvMessageFields,
  viewerActorId: string
): boolean {
  return (
    (msg.media_price ?? 0) > 0 &&
    msg.sender_id !== viewerActorId &&
    !(msg.media_viewed_by ?? []).includes(viewerActorId)
  );
}

/** Returns the message with media_url nulled if it's locked for this viewer. */
export function stripLockedMediaUrl<T extends PpvMessageFields>(
  msg: T,
  viewerActorId: string
): T {
  if (isLockedForViewer(msg, viewerActorId)) {
    return { ...msg, media_url: null };
  }
  return msg;
}
