/**
 * Entry-point referrer attribution (client-only).
 *
 * Which model gets credit when a visitor later signs up as a fan
 * (fans.referred_by_model_id, read from localStorage by FanSignupDialog)?
 * The old rule was "last profile viewed", which mis-credits: a fan who taps
 * Valentina's bio link, then browses Bianca's profile before signing up,
 * was attributed to Bianca. Precedence tiers fix that:
 *
 *   3 — explicit link marker (?ref= / ?utm_source=, e.g. the analytics QR)
 *   2 — entry-point landing: this profile was the FIRST page of the document
 *       load AND the visitor arrived from outside EXA. Best proxy for a
 *       bio-link tap — works even when in-app browsers strip the referrer.
 *   1 — ordinary profile view while browsing (legacy behavior, fallback)
 *
 * A new visit overwrites stored attribution only at the same tier or higher,
 * so internal browsing never clobbers a bio-link landing. Stored attribution
 * older than ATTRIBUTION_TTL_DAYS is stale and loses to anything newer.
 *
 * Models only ever see aggregate traffic; per-model conversion data stays
 * admin-only (owner decision) — nothing here surfaces to the model UI.
 */

const REFERRER_KEY = "signup_referrer_model_id";
const META_KEY = "signup_referrer_meta";
const ATTRIBUTION_TTL_DAYS = 30;

type Tier = 1 | 2 | 3;

// One evaluation per document load: only the first profile mounted can be
// the landing page. Guards the edge where a visitor client-navigates back
// to the same path they originally landed on.
let landingEvaluated = false;

function isDocumentLanding(): boolean {
  if (landingEvaluated) return false;
  landingEvaluated = true;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    // The document's initial URL must be THIS page — otherwise the visitor
    // landed elsewhere (homepage, /models, ...) and browsed here internally.
    if (!nav || new URL(nav.name).pathname !== window.location.pathname) {
      return false;
    }
    // External entry: no referrer (in-app browsers, direct) or cross-origin.
    const ref = document.referrer;
    return !ref || new URL(ref).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function storedTier(): Tier | 0 {
  try {
    if (!localStorage.getItem(REFERRER_KEY)) return 0;
    const meta = JSON.parse(localStorage.getItem(META_KEY) || "null");
    const age = Date.now() - (typeof meta?.at === "number" ? meta.at : 0);
    if (age > ATTRIBUTION_TTL_DAYS * 24 * 60 * 60 * 1000) return 0;
    const t = meta?.t;
    return t === 2 || t === 3 ? t : 1; // legacy rows without meta = tier 1
  } catch {
    return 1;
  }
}

/**
 * Record a profile visit for signup attribution. Returns whether this visit
 * was an entry-point landing so the caller can log it server-side.
 */
export function recordProfileVisit(modelId: string): { landing: boolean } {
  let landing = false;
  try {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.has("ref") || params.has("utm_source");
    landing = isDocumentLanding();
    const tier: Tier = explicit ? 3 : landing ? 2 : 1;
    if (tier >= storedTier()) {
      localStorage.setItem(REFERRER_KEY, modelId);
      localStorage.setItem(META_KEY, JSON.stringify({ t: tier, at: Date.now() }));
    }
  } catch {
    // localStorage might be unavailable — attribution is best-effort
  }
  return { landing };
}
