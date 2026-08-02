/**
 * Fan attendance — streaks and "Regular" status, computed entirely from
 * profile_views (which already dedupes to one row per viewer per day via
 * its partial unique indexes). No extra tracking table, no writes here.
 *
 * Identity note: profile_views.viewer_id is the AUTH USER id (not actor
 * id), and model_id is models.id — pass those, not actor ids.
 *
 * Privacy calibration (same spirit as the VIP no-amounts rule):
 * - The FAN sees their own exact streak ("🔥 4-day streak").
 * - The MODEL sees only the binary "Regular" chip — never day counts or
 *   visit patterns of a specific fan.
 */

/** Distinct visit days in the window that make a fan a "Regular". */
export const REGULAR_MIN_DAYS = 4;
export const REGULAR_WINDOW_DAYS = 14;

/** How far back to fetch view_date rows when computing a streak. */
export const STREAK_LOOKBACK_DAYS = 45;

const DAY_MS = 86_400_000;

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Consecutive-day visit streak ending today. Today counts implicitly
 * (callers invoke this while the fan is literally on the page — the
 * ViewTracker POST that logs today's row races the RSC render).
 */
export function computeVisitStreak(visitDates: string[]): number {
  const days = new Set(visitDates);
  let streak = 1; // today, implicit
  for (let i = 1; i <= STREAK_LOOKBACK_DAYS; i++) {
    const day = utcDateString(new Date(Date.now() - i * DAY_MS));
    if (days.has(day)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** "Regular" = at least REGULAR_MIN_DAYS distinct visit days in the window. */
export function isRegularVisitor(visitDates: string[]): boolean {
  const cutoff = utcDateString(new Date(Date.now() - REGULAR_WINDOW_DAYS * DAY_MS));
  const distinct = new Set(visitDates.filter((d) => d >= cutoff));
  return distinct.size >= REGULAR_MIN_DAYS;
}

/**
 * Fetch this viewer's visit days for one model. `service` must be a
 * service-role client — profile_views has no public read policy.
 */
export async function getVisitDates(
  service: any,
  params: { modelId: string; viewerUserId: string }
): Promise<string[]> {
  const cutoff = utcDateString(new Date(Date.now() - STREAK_LOOKBACK_DAYS * DAY_MS));
  const { data } = await service
    .from("profile_views")
    .select("view_date")
    .eq("model_id", params.modelId)
    .eq("viewer_id", params.viewerUserId)
    .gte("view_date", cutoff);
  return (data ?? []).map((r: { view_date: string }) => r.view_date);
}
