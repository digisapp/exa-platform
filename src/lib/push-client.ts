// Browser-side web-push helpers shared by PushOptIn (settings) and
// PushNudgeCard (dashboard nudge).
//
// Client-safe: never import lib/push here (web-push / Node crypto — server
// only). The server-side vocabulary lives in lib/push-config.ts.
//
// iOS gotcha: Safari only exposes the Push API inside an INSTALLED PWA
// (Add to Home Screen, iOS 16.4+). In a regular Safari tab `PushManager`
// is simply absent — that's the "needs-install" state below, rendered as
// A2HS instructions instead of a dead permission button.

export type PushSupport =
  | "supported" // Push API available right now
  | "needs-install" // iOS Safari outside the installed PWA — A2HS first
  | "unsupported"; // no Push API at all (old/odd browser)

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ masquerades as macOS — catch it via touch points
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    // iOS Safari's non-standard flag for A2HS launches
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  ) {
    return "supported";
  }
  if (isIos() && !isStandalone()) return "needs-install";
  return "unsupported";
}

/** What the opt-in UI should show for THIS device/browser right now. */
export type PushDeviceState =
  | "unsupported"
  | "needs-install"
  | "denied" // permission blocked — user must unblock in browser settings
  | "subscribed" // permission granted AND a live subscription on this device
  | "ready"; // can subscribe (permission default, or granted-but-unsubscribed)

export async function getPushDeviceState(): Promise<PushDeviceState> {
  const support = getPushSupport();
  if (support !== "supported") return support;
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) return "subscribed";
    } catch {
      // fall through to "ready"
    }
  }
  return "ready";
}

// VAPID public key → applicationServerKey bytes (standard web-push dance)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// The root layout registers /sw.js on every page, so an existing
// registration is the overwhelmingly common case; register() is the
// first-ever-visit fallback. Never use navigator.serviceWorker.ready as the
// entry point — it hangs forever if registration failed.
async function getSwRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  const registration = existing ?? (await navigator.serviceWorker.register("/sw.js"));
  if (!registration.active) {
    // Fresh install — wait for activation so pushManager.subscribe works
    await navigator.serviceWorker.ready;
  }
  return registration;
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" | "no-key" | "error" };

/**
 * Permission request + pushManager.subscribe + server registration.
 * MUST be called from an explicit user gesture — never on page load
 * (auto-prompting earns the browser's permission-denial penalty).
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (getPushSupport() !== "supported") {
    return { ok: false, reason: "unsupported" };
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, reason: "no-key" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    const registration = await getSwRegistration();
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!res.ok) return { ok: false, reason: "error" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Drop this device's subscription (browser + server). Idempotent. */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return true;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch {
    return false;
  }
}
