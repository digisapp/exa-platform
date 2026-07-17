// Detection + one-shot recovery for "stale build" client errors.
//
// Every production deploy invalidates the previous build's JS/CSS chunk URLs.
// Vercel skew protection covers clients up to 12h old (Pro-plan max), but iOS
// Safari keeps tabs alive for days — past that window, any client-side
// navigation or lazy component load 404s and throws. Those errors are not the
// user's fault and are fixed by a plain reload, so error boundaries and the
// global listener auto-reload once instead of showing an error screen.

const STALE_BUILD_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\S]+ failed/i,
  /Loading CSS chunk/i,
  /Failed to fetch dynamically imported module/i,
  // iOS Safari's wording for a failed dynamic import
  /Importing a module script failed/i,
  // Firefox's wording
  /error loading dynamically imported module/i,
];

export function isStaleBuildError(error: unknown): boolean {
  if (!error) return false;
  const text =
    typeof error === "string"
      ? error
      : `${(error as Error).name ?? ""} ${(error as Error).message ?? ""}`;
  return STALE_BUILD_PATTERNS.some((p) => p.test(text));
}

const RELOAD_AT_KEY = "exa:stale-build-reload-at";
const RELOAD_LOOP_WINDOW_MS = 60_000;

let reloadedInMemory = false;

/**
 * Reload the page to pick up the latest deploy, at most once per minute so a
 * genuinely broken build can't put the browser in a reload loop. Returns true
 * if a reload was triggered (callers should render a quiet "updating" state
 * instead of an error screen).
 */
export function reloadOnceForStaleBuild(): boolean {
  if (typeof window === "undefined") return false;
  // Offline reloads land on the browser's error page — worse than our own.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;

  try {
    const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) || 0);
    if (Date.now() - last < RELOAD_LOOP_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable — fall back to a per-pageload flag
    if (reloadedInMemory) return false;
    reloadedInMemory = true;
  }

  window.location.reload();
  return true;
}
