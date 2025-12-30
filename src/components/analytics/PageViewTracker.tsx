"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Generate a unique visitor ID
function getVisitorId(): string {
  if (typeof window === "undefined") return "";

  let visitorId = localStorage.getItem("exa_visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("exa_visitor_id", visitorId);
  }
  return visitorId;
}

// Generate/get session ID (expires after 30 min of inactivity)
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();

  const stored = sessionStorage.getItem("exa_session");
  if (stored) {
    const { id, lastActivity } = JSON.parse(stored);
    if (now - lastActivity < SESSION_TIMEOUT) {
      // Update last activity
      sessionStorage.setItem("exa_session", JSON.stringify({ id, lastActivity: now }));
      return id;
    }
  }

  // Create new session
  const newId = crypto.randomUUID();
  sessionStorage.setItem("exa_session", JSON.stringify({ id: newId, lastActivity: now }));
  return newId;
}

// Get UTM parameters from URL
function getUtmParams(searchParams: URLSearchParams) {
  return {
    utmSource: searchParams.get("utm_source") || undefined,
    utmMedium: searchParams.get("utm_medium") || undefined,
    utmCampaign: searchParams.get("utm_campaign") || undefined,
  };
}

// Extract model info from profile pages
function getModelInfo(pathname: string): { modelUsername?: string } {
  // Profile pages are /{username} - single segment paths
  const match = pathname.match(/^\/([a-zA-Z0-9_-]+)$/);
  if (match) {
    const username = match[1];
    // Exclude known routes
    const reserved = [
      "signin", "signup", "dashboard", "profile", "models", "gigs",
      "chats", "wallet", "coins", "content", "admin", "apply",
      "leaderboard", "onboarding", "favorites", "earnings", "fan"
    ];
    if (!reserved.includes(username.toLowerCase())) {
      return { modelUsername: username };
    }
  }
  return {};
}

interface PageViewTrackerProps {
  modelId?: string;
  modelUsername?: string;
}

export function PageViewTracker({ modelId, modelUsername }: PageViewTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // Avoid tracking the same path twice in a row
    const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (fullPath === lastTrackedPath.current) return;
    lastTrackedPath.current = fullPath;

    // Don't track in development (optional - remove if you want dev tracking)
    // if (process.env.NODE_ENV === "development") return;

    const trackPageView = async () => {
      try {
        const visitorId = getVisitorId();
        const sessionId = getSessionId();
        const utmParams = getUtmParams(searchParams);
        const modelInfo = modelUsername ? { modelUsername } : getModelInfo(pathname);

        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            visitorId,
            sessionId,
            referrer: document.referrer || null,
            screenWidth: window.innerWidth,
            modelId: modelId || null,
            modelUsername: modelInfo.modelUsername || null,
            ...utmParams,
          }),
        });
      } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.debug("Analytics tracking failed:", error);
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(trackPageView, 100);
    return () => clearTimeout(timer);
  }, [pathname, searchParams, modelId, modelUsername]);

  // This component doesn't render anything
  return null;
}
