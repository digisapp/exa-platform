// Client-side event tracking. Shares the visitor/session identity keys with
// PageViewTracker so funnel events join against page_views in reports.

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let visitorId = localStorage.getItem("exa_visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("exa_visitor_id", visitorId);
  }
  return visitorId;
}

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem("exa_session");
    if (stored) return JSON.parse(stored).id ?? null;
  } catch {
    // corrupt storage — skip session attribution rather than throw
  }
  return null;
}

/** Fire-and-forget product event. Never throws, never blocks the UI. */
export function trackEvent(
  eventName: string,
  opts?: { modelId?: string; metadata?: Record<string, unknown> }
): void {
  try {
    const body = JSON.stringify({
      eventName,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      modelId: opts?.modelId,
      metadata: opts?.metadata,
    });
    // sendBeacon survives navigation (e.g. a click that opens a dialog or
    // leaves the page); fall back to fetch for older browsers.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/event",
        new Blob([body], { type: "application/json" })
      );
    } else {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // analytics must never break the app
  }
}
