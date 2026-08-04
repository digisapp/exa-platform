/**
 * Instagram handles reach us from public forms (media submissions, tour applies),
 * so the raw value is anything from "@name" to a full profile URL carrying igsh /
 * utm_source tracking params. These two helpers are the only place that knows how
 * to untangle that: one canonical form for storage, one for display.
 *
 * Both are deliberately conservative — a field holding two handles, or a link to
 * another platform, is never guessed at or rewritten.
 */

/** A link to somewhere other than Instagram — YouTube, TikTok, a personal site. */
function isForeignUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) && !/instagram\.com/i.test(value);
}

/** Strip scheme, host, leading @, query string and trailing slashes off one token. */
function cleanToken(token: string): string {
  return token
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");
}

/**
 * Canonical storage form: a bare handle with no "@", host, or tracking params.
 * Values we can't safely reduce (another platform's URL, or two handles in one
 * field) are kept verbatim rather than mangled.
 */
export function normalizeInstagramHandle(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (isForeignUrl(value)) return value;
  if (/[\s,|]/.test(value)) return value;
  return cleanToken(value) || null;
}

/**
 * Display form: the label to render and where it should link. Unlike storage,
 * this does pick a winner when a field holds several handles — a row has to
 * render one link.
 */
export function parseInstagram(
  raw: string | null | undefined
): { label: string; href: string } | null {
  const value = raw?.trim();
  if (!value) return null;

  if (isForeignUrl(value)) {
    return {
      label: value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, ""),
      href: value,
    };
  }

  const handle = cleanToken(value.split(/[\s,|]+/)[0] || value);
  if (!handle) return null;
  return { label: `@${handle}`, href: `https://instagram.com/${handle}` };
}
