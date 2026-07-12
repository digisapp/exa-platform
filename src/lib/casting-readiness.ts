import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Casting Readiness ("Runway Ready") — one score that tells a model how
 * complete her EXA presence looks to casting.
 *
 * Copy constraint: upcoming shows are NOT announced yet. Never name a
 * specific event here — always "casting for upcoming shows".
 *
 * The star item (link_live) is auto-verified by real inbound traffic:
 * page_views rows whose referrer host is a social network or link hub.
 * page_views are retained ~90 days (cleanup-analytics cron), so the
 * 30-day windows used here are always fully covered.
 */

/** Referrer hosts that count as "your audience found you via your link". */
export const SOCIAL_REFERRER_HOSTS = [
  "instagram.com",
  "l.instagram.com",
  "tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "snssdk.com", // TikTok in-app browser variants
  "linktr.ee",
  "beacons.ai",
  "t.co",
  "x.com",
  "twitter.com",
  "snapchat.com",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "l.facebook.com",
  "lm.facebook.com",
  "fb.me",
] as const;

/** True when a stored page_views.referrer points at a social / link-hub host. */
export function isSocialReferrer(referrer: string | null | undefined): boolean {
  if (!referrer) return false;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  return SOCIAL_REFERRER_HOSTS.some(
    (social) => host === social || host.endsWith(`.${social}`)
  );
}

export interface ReadinessItem {
  key: string;
  label: string;
  /** Weight toward the 0-100 score. All item weights sum to 100. */
  weight: number;
  done: boolean;
  detail?: string;
  cta?: { label: string; href: string };
}

export interface CastingReadiness {
  score: number; // 0-100
  items: ReadinessItem[];
}

/** The model columns this computation reads. */
export const READINESS_MODEL_COLUMNS =
  "id, profile_photo_url, bio, height, bust, waist, hips, shoe_size, dress_size, message_rate, video_call_rate, voice_call_rate";

interface ReadinessModelRow {
  id: string;
  profile_photo_url: string | null;
  bio: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  shoe_size: string | null;
  dress_size: string | null;
  message_rate: number | null;
  video_call_rate: number | null;
  voice_call_rate: number | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Compute casting readiness for a model.
 *
 * @param service Service-role client — page_views and fans have no
 *                model-facing read RLS, so reads must bypass it.
 * @param modelId models.id
 * @param preloadedModel Optional already-fetched model row (must include
 *                       READINESS_MODEL_COLUMNS) to skip the refetch.
 */
export async function computeCastingReadiness(
  service: SupabaseClient,
  modelId: string,
  preloadedModel?: Record<string, unknown> | null
): Promise<CastingReadiness> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  const modelPromise = preloadedModel
    ? Promise.resolve({ data: preloadedModel })
    : (service.from("models") as any)
        .select(READINESS_MODEL_COLUMNS)
        .eq("id", modelId)
        .maybeSingle();

  const [
    { data: modelData },
    { count: freshContentCount },
    { data: recentViews },
  ] = await Promise.all([
    modelPromise,
    // Any upload in the last 30 days counts as fresh content
    (service.from("content_items") as any)
      .select("id", { count: "exact", head: true })
      .eq("model_id", modelId)
      .gte("created_at", since),
    // Inbound traffic with a referrer — host matching happens in JS since
    // page_views stores the full referrer URL
    (service.from("page_views") as any)
      .select("referrer")
      .eq("model_id", modelId)
      .not("referrer", "is", null)
      .gte("created_at", since)
      .limit(2000),
  ]);

  const model = (modelData || {}) as Partial<ReadinessModelRow>;

  // ── profile_basics (25): photo + at least 3 comp-card fields ──
  const hasPhoto = Boolean(model.profile_photo_url);
  const compCardFields = [
    model.bio,
    model.height,
    model.bust,
    model.waist,
    model.hips,
    model.shoe_size,
    model.dress_size,
  ];
  const filledCompFields = compCardFields.filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;
  const profileBasicsDone = hasPhoto && filledCompFields >= 3;

  // ── rates_set (15) ──
  const ratesDone =
    (model.message_rate ?? 0) > 0 ||
    (model.video_call_rate ?? 0) > 0 ||
    (model.voice_call_rate ?? 0) > 0;

  // ── fresh_content (25) ──
  const freshContentDone = (freshContentCount ?? 0) > 0;

  // ── link_live (35, the star): auto-verified by real inbound traffic ──
  const socialVisits = ((recentViews as { referrer: string | null }[] | null) || []).filter(
    (v) => isSocialReferrer(v.referrer)
  ).length;
  const linkLiveDone = socialVisits > 0;

  // Four model-facing items only (owner decision 2026-07-12): verification is
  // an EXA-team call, not a model todo, and referred-fan counts are admin-only
  // signals (countReferredFans below) — neither belongs on the model's list.
  const items: ReadinessItem[] = [
    {
      key: "profile_basics",
      label: "Comp-card basics",
      weight: 25,
      done: profileBasicsDone,
      detail: profileBasicsDone
        ? "Photo, bio, and measurements are on file"
        : hasPhoto
          ? "Add your bio and measurements — height, bust, waist, hips, shoe"
          : "Add a profile photo, then your bio and measurements",
      cta: profileBasicsDone ? undefined : { label: "Complete profile", href: "/settings" },
    },
    {
      key: "rates_set",
      label: "Rates set",
      weight: 15,
      done: ratesDone,
      detail: ratesDone
        ? "Fans can message and call you"
        : "Set a message or call rate so fans can reach you",
      cta: ratesDone ? undefined : { label: "Set rates", href: "/settings" },
    },
    {
      key: "fresh_content",
      label: "Fresh content this month",
      weight: 25,
      done: freshContentDone,
      detail: freshContentDone
        ? "You've posted in the last 30 days"
        : "Post at least one new photo or video this month",
      cta: freshContentDone ? undefined : { label: "Open Studio", href: "/studio" },
    },
    {
      key: "link_live",
      label: "Your link is live",
      weight: 35,
      done: linkLiveDone,
      detail: linkLiveDone
        ? `Your audience is finding you — ${socialVisits} visit${socialVisits === 1 ? "" : "s"} from your socials this month`
        : "Add examodels.com/USERNAME to your Instagram or TikTok bio — models who bring their audience get seen first",
    },
  ];

  const score = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);

  return { score, items };
}

/**
 * ADMIN-ONLY signal: fans attributed to this model at signup
 * (fans.referred_by_model_id, PR #52 flow). Deliberately NOT part of the
 * model-facing readiness items — surfaced on the admin model page and in
 * casting review, never shown to the model herself (owner decision).
 */
export async function countReferredFans(
  service: SupabaseClient,
  modelId: string
): Promise<number> {
  const { count } = await (service.from("fans") as any)
    .select("id", { count: "exact", head: true })
    .eq("referred_by_model_id", modelId)
    .is("deleted_at", null);
  return count ?? 0;
}
