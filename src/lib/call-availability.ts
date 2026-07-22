// Call reachability — the ONE definition of "can a fan ring this model",
// shared by the server gate (/api/calls/start) and every fan-facing surface
// that renders call CTAs or online indicators (profile page, chat header).
//
// reachable = video_is_online (on-site heartbeat, cleared by the
// offline-models cron ~2 min after the last beat) OR available_for_calls
// (the manual toggle — models.available_for_calls, written only via
// /api/model/availability). Keeping the UI on the same signal the server
// enforces avoids a green dot sitting next to a call button that 409s.
//
// Client-safe: no server-only imports.

export interface CallReachabilityFields {
  video_is_online?: boolean | null;
  available_for_calls?: boolean | null;
}

export function isReachableForCalls(
  model: CallReachabilityFields | null | undefined
): boolean {
  if (!model) return false;
  return !!(model.video_is_online || model.available_for_calls);
}

// Chat-header-only lever: disables the header call buttons for fans when the
// model is unreachable (the message box is the whole page there, so no knock
// sheet). Profile-page CTAs no longer use this — they always render and open
// the knock sheet (/api/calls/knock) when the model is offline.
export const GATE_CALL_CTAS_ON_REACHABILITY = true;
