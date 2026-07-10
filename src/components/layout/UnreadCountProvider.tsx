"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";

interface UnreadCountValue {
  count: number;
  refresh: () => void;
}

const UnreadCountContext = createContext<UnreadCountValue | null>(null);

/**
 * Keeps the nav unread badge (top nav + bottom nav) fresh without a full page
 * reload. The server seeds the initial count; this refetches the authoritative
 * total on client navigation, when the tab regains focus, and whenever a
 * "exa:unread-refresh" event fires (dispatched after a thread is marked read,
 * so the badge drops the moment you open a conversation).
 *
 * This deliberately avoids a global realtime subscription — subscribing every
 * logged-in client to all message inserts is a known scaling cost — while
 * still fixing the "badge stays stale until you hard-navigate" complaint.
 */
export function UnreadCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const pathname = usePathname();
  const inFlightRef = useRef(false);
  const seededPathRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.unreadCount === "number") setCount(data.unreadCount);
      }
    } catch {
      // Keep last known count on failure
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Refresh on client-side navigation, but skip the first run since the server
  // already seeded a fresh count for the initial render.
  useEffect(() => {
    if (!seededPathRef.current) {
      seededPathRef.current = true;
      return;
    }
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("exa:unread-refresh", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("exa:unread-refresh", onFocus);
    };
  }, [refresh]);

  return (
    <UnreadCountContext.Provider value={{ count, refresh }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

/**
 * Returns the live unread count, falling back to the passed server value when
 * the provider isn't mounted (e.g. outside the dashboard layout).
 */
export function useUnreadCount(fallback: number): number {
  const ctx = useContext(UnreadCountContext);
  return ctx ? ctx.count : fallback;
}
