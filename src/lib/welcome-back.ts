import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Welcome back" pulse — what happened while a returning model was away.
 *
 * Timing seam: models.last_active_at is ONLY written by POST /api/activity,
 * which the client-side <ActivityTracker> (mounted in the (dashboard) layout)
 * fires after hydration. The dashboard is a server component, so at render
 * time model.last_active_at still holds the PREVIOUS session's timestamp —
 * read it there and pass it in. Do not read it from an API route the client
 * calls later (the tracker will have bumped it by then).
 *
 * Copy constraint: upcoming shows are NOT announced yet. Never name a
 * specific event in anything derived from this data.
 */

/** Minimum away-gap before the pulse is considered "returning". */
export const WELCOME_BACK_MIN_AWAY_DAYS = 14;

/**
 * page_views rows are deleted after ~90 days (cleanup-analytics cron, see
 * migration 00008), so the stats window is capped there. When the away-gap
 * exceeds the cap, `windowCapped` is true and copy must say
 * "in the last 90 days" instead of "while you were away".
 */
export const WELCOME_BACK_MAX_WINDOW_DAYS = 90;

export interface WelcomeBackPulseData {
  /**
   * The previous visit's last_active_at (ISO). Doubles as the client-side
   * dismiss key: dismissing stores this value in localStorage, so the banner
   * re-arms automatically on the NEXT long absence (new timestamp ≠ stored).
   */
  prevVisitIso: string;
  /** Whole days since the previous visit. */
  awayDays: number;
  /** True when the stats window was capped at 90 days (away-gap exceeded it). */
  windowCapped: boolean;
  profileViews: number;
  newFans: number;
  spotlightLikes: number;
}

/**
 * Compute the welcome-back pulse for a model, or null when the banner
 * should not render (not away long enough, or nothing happened).
 *
 * Zero queries when the away-gap is under the threshold — the gap check
 * short-circuits before any stats are fetched.
 *
 * Query shapes deliberately mirror the weekly-digest cron
 * (src/app/api/cron/weekly-digest/route.ts) so "profile views", "new fans",
 * and "Spotlight likes" mean the same thing in both places:
 * - profile views: page_views by model_id (created_at >= window start)
 * - new fans:      follows by following_id = the model's ACTOR id
 * - Spotlight likes: top_model_votes by model_id, vote_type = 'like'
 *
 * @param service Service-role client — page_views / follows / top_model_votes
 *                have no model-facing read RLS, so reads must bypass it.
 */
export async function computeWelcomeBackPulse(
  service: SupabaseClient,
  opts: {
    modelId: string;
    /** actors.id for this model (follows.following_id is an actor id). */
    actorId: string;
    lastActiveAt: string | null;
  }
): Promise<WelcomeBackPulseData | null> {
  const { modelId, actorId, lastActiveAt } = opts;

  // Never active before => brand new, not returning (GettingStarted owns that)
  if (!lastActiveAt) return null;

  const prevVisit = new Date(lastActiveAt);
  if (isNaN(prevVisit.getTime())) return null;

  const nowMs = Date.now();
  const awayDays = Math.floor((nowMs - prevVisit.getTime()) / 86_400_000);
  if (awayDays < WELCOME_BACK_MIN_AWAY_DAYS) return null;

  // Cap the window at page_views retention
  const windowCapped = awayDays > WELCOME_BACK_MAX_WINDOW_DAYS;
  const sinceIso = windowCapped
    ? new Date(nowMs - WELCOME_BACK_MAX_WINDOW_DAYS * 86_400_000).toISOString()
    : prevVisit.toISOString();

  const [{ count: profileViews }, { count: newFans }, { count: spotlightLikes }] =
    await Promise.all([
      (service.from("page_views") as any)
        .select("id", { count: "exact", head: true })
        .eq("model_id", modelId)
        .gte("created_at", sinceIso),
      (service.from("follows") as any)
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", actorId)
        .gte("created_at", sinceIso),
      (service.from("top_model_votes") as any)
        .select("id", { count: "exact", head: true })
        .eq("model_id", modelId)
        .eq("vote_type", "like")
        .gte("created_at", sinceIso),
    ]);

  const views = profileViews ?? 0;
  const fans = newFans ?? 0;
  const likes = spotlightLikes ?? 0;

  // Nothing happened — a banner of zeros would land as guilt, not warmth
  if (views <= 0 && fans <= 0 && likes <= 0) return null;

  return {
    prevVisitIso: prevVisit.toISOString(),
    awayDays,
    windowCapped,
    profileViews: views,
    newFans: fans,
    spotlightLikes: likes,
  };
}
