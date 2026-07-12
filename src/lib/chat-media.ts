import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Chat media URL convention (migration 20260712100001).
 *
 * New chat uploads live in the PRIVATE "chat-media" bucket and store their
 * storage PATH (`${modelId}/${timestamp}.${ext}`) in messages.media_url.
 * Anything starting with "http" is legacy chat media or library-attached
 * portfolio content — both deliberately left as-is and passed through
 * untouched.
 *
 * Server paths that return messages.media_url to a client must first strip
 * locked PPV media per-viewer (src/lib/ppv.ts) and THEN convert surviving
 * paths to short-lived signed URLs with these helpers — never sign what was
 * stripped. Signed URLs live 1 hour; a chat left open longer re-fetches via
 * the list/hydration paths, which sign freshly.
 */

export const CHAT_MEDIA_BUCKET = "chat-media";
export const CHAT_MEDIA_SIGNED_URL_TTL = 3600; // 1 hour

/** True when the value is a chat-media storage path (not an http URL). */
export function isChatMediaPath(v: string | null | undefined): v is string {
  return !!v && !v.startsWith("http");
}

/**
 * Strict shape check for paths accepted from clients (/api/messages/send):
 * `${modelId uuid}/${timestamp}.${ext}` as produced by /api/upload/chat.
 */
const CHAT_MEDIA_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d+\.[a-z0-9]+$/i;

export function isValidChatMediaStoragePath(v: string): boolean {
  return CHAT_MEDIA_PATH_RE.test(v);
}

/** Signs a single chat-media path. Returns null if signing fails. */
export async function signChatMediaUrl(
  adminClient: SupabaseClient,
  path: string
): Promise<string | null> {
  const { data } = await adminClient.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(path, CHAT_MEDIA_SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

/**
 * Batch-signs media_url for a page of messages. Chat-media paths become
 * signed URLs (or null if signing fails — hydration/resync retries later);
 * http URLs (legacy chat media, library-attached content) pass through
 * untouched.
 */
export async function signChatMediaUrls<T extends { media_url?: string | null }>(
  adminClient: SupabaseClient,
  messages: T[]
): Promise<T[]> {
  const paths = [
    ...new Set(
      messages.map((m) => m.media_url).filter((u): u is string => isChatMediaPath(u))
    ),
  ];
  if (paths.length === 0) return messages;

  const { data } = await adminClient.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrls(paths, CHAT_MEDIA_SIGNED_URL_TTL);

  const urlByPath = new Map<string, string>();
  for (const item of data || []) {
    if (item.path && item.signedUrl && !item.error) {
      urlByPath.set(item.path, item.signedUrl);
    }
  }

  return messages.map((m) =>
    isChatMediaPath(m.media_url)
      ? { ...m, media_url: urlByPath.get(m.media_url) ?? null }
      : m
  );
}
