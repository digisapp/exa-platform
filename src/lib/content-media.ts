import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Content media URL convention (migration 20260712100002).
 *
 * content_items.media_url holds one of three shapes:
 *
 * 1. "exclusive/${modelId}/${timestamp}.${ext}" — NEW paid/exclusive uploads.
 *    The object lives in the PRIVATE "content-media" bucket; a path is useless
 *    to a client until a server signs it with these helpers. Only authorized
 *    viewers (buyer with a content_purchases row, the owning model, admin) may
 *    ever receive a signed URL; locked items keep returning preview_url only.
 * 2. Any other non-http value (e.g. "${modelId}/${ts}.jpg",
 *    "premium/${modelId}/${ts}.jpg") — legacy storage path in the PUBLIC
 *    "portfolio" bucket. Left exactly as before: already-public objects can't
 *    be retracted.
 * 3. "http..." — legacy full public/signed URL. Passed through untouched.
 *
 * The blurred low-res preview_url generated at upload always stays in the
 * public portfolio bucket — it is the public teaser for locked items.
 *
 * When an item's status flips (free ↔ exclusive via the studio),
 * syncContentItemStorageForStatus moves the object between buckets so every
 * public/free read path keeps working off plain portfolio paths and every
 * exclusive item uploaded under the new convention stays private.
 */

export const CONTENT_MEDIA_BUCKET = "content-media";
export const CONTENT_MEDIA_SIGNED_URL_TTL = 3600; // 1 hour
export const CONTENT_MEDIA_PATH_PREFIX = "exclusive/";

/** True when the value is a private content-media storage path. */
export function isContentMediaPath(v: string | null | undefined): v is string {
  return !!v && !v.startsWith("http") && v.startsWith(CONTENT_MEDIA_PATH_PREFIX);
}

/**
 * Strict shape check for paths accepted from clients (/api/content-hub/items):
 * `exclusive/${modelId uuid}/${timestamp}.${ext}` as produced by
 * /api/upload/signed-url with exclusive=true.
 */
const CONTENT_MEDIA_PATH_RE =
  /^exclusive\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d+\.[a-z0-9]+$/i;

export function isValidContentMediaStoragePath(v: string): boolean {
  return CONTENT_MEDIA_PATH_RE.test(v);
}

/** Signs a single content-media path. Returns null if signing fails. */
export async function signContentMediaUrl(
  adminClient: SupabaseClient,
  path: string
): Promise<string | null> {
  const { data } = await adminClient.storage
    .from(CONTENT_MEDIA_BUCKET)
    .createSignedUrl(path, CONTENT_MEDIA_SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

/**
 * Batch-signs media_url for a page of content items. Content-media paths
 * become signed URLs (or null if signing fails); http URLs and legacy
 * portfolio paths pass through untouched. Only call this for items the viewer
 * is authorized to see in full — never sign a locked item for a fan.
 */
export async function signContentMediaUrls<T extends { media_url?: string | null }>(
  adminClient: SupabaseClient,
  items: T[]
): Promise<T[]> {
  const paths = [
    ...new Set(
      items.map((i) => i.media_url).filter((u): u is string => isContentMediaPath(u))
    ),
  ];
  if (paths.length === 0) return items;

  const { data } = await adminClient.storage
    .from(CONTENT_MEDIA_BUCKET)
    .createSignedUrls(paths, CONTENT_MEDIA_SIGNED_URL_TTL);

  const urlByPath = new Map<string, string>();
  for (const item of data || []) {
    if (item.path && item.signedUrl && !item.error) {
      urlByPath.set(item.path, item.signedUrl);
    }
  }

  return items.map((i) =>
    isContentMediaPath(i.media_url)
      ? { ...i, media_url: urlByPath.get(i.media_url) ?? null }
      : i
  );
}

/**
 * Keeps the storage location of an item's media in sync with its status when
 * the studio flips it (single edit or bulk):
 * - exclusive → portfolio/private: private object moves back to the public
 *   portfolio bucket (drop the "exclusive/" prefix) so every public read path
 *   (profile grid, dashboards, comp card) keeps resolving plain paths.
 * - portfolio/private → exclusive: legacy public-bucket path moves into the
 *   private bucket (gain the prefix). The old public URL may live on in CDN
 *   caches, but the object itself stops being publicly fetchable.
 * - http URLs never move: already-public objects can't be retracted.
 *
 * Returns the new media_url to store, or null when no move is needed.
 * Throws on storage errors — callers should fail the status change rather
 * than strand a public item pointing at a private object (or vice versa).
 */
export async function syncContentItemStorageForStatus(
  adminClient: SupabaseClient,
  mediaUrl: string | null | undefined,
  nextStatus: string
): Promise<string | null> {
  if (!mediaUrl || mediaUrl.startsWith("http")) return null;

  if (nextStatus === "exclusive" && !isContentMediaPath(mediaUrl)) {
    const privatePath = `${CONTENT_MEDIA_PATH_PREFIX}${mediaUrl}`;
    await moveObject(adminClient, "portfolio", mediaUrl, CONTENT_MEDIA_BUCKET, privatePath);
    return privatePath;
  }

  if (nextStatus !== "exclusive" && isContentMediaPath(mediaUrl)) {
    const publicPath = mediaUrl.slice(CONTENT_MEDIA_PATH_PREFIX.length);
    await moveObject(adminClient, CONTENT_MEDIA_BUCKET, mediaUrl, "portfolio", publicPath);
    return publicPath;
  }

  return null;
}

/**
 * Cross-bucket move with idempotent recovery: if a previous attempt moved the
 * object but its DB update failed, the retry's move errors (source gone) —
 * treat "destination already exists" as success so the flip can complete.
 */
async function moveObject(
  adminClient: SupabaseClient,
  fromBucket: string,
  fromPath: string,
  toBucket: string,
  toPath: string
): Promise<void> {
  const { error } = await adminClient.storage
    .from(fromBucket)
    .move(fromPath, toPath, { destinationBucket: toBucket });
  if (!error) return;

  const slash = toPath.lastIndexOf("/");
  const folder = toPath.slice(0, slash);
  const name = toPath.slice(slash + 1);
  const { data: files } = await adminClient.storage
    .from(toBucket)
    .list(folder, { search: name, limit: 1 });
  if (files?.some((f) => f.name === name)) return;

  throw new Error(`Failed to move media to ${toBucket}: ${error.message}`);
}
