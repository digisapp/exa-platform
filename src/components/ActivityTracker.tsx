"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Track user activity and update last_active_at
// This component should be included in authenticated layouts
export function ActivityTracker() {
  const lastUpdate = useRef<number>(0);
  const supabase = createClient();

  useEffect(() => {
    const updateActivity = async () => {
      // Ping at most once a minute. This MUST stay below the offline-models
      // cron cutoff (2 min) — otherwise an actively-using model is repeatedly
      // flagged offline between pings and fans are blocked from calling them.
      const now = Date.now();
      if (now - lastUpdate.current < 60 * 1000) {
        return;
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      lastUpdate.current = now;

      // Update activity
      try {
        await fetch("/api/activity", { method: "POST" });
      } catch {
        // Silently fail - activity tracking is not critical
      }
    };

    // Update on mount
    updateActivity();

    // Update on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateActivity();
      }
    };

    // Update on user interaction
    const handleInteraction = () => {
      updateActivity();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("click", handleInteraction);
    document.addEventListener("keydown", handleInteraction);

    // Also update periodically while active (every minute, below the 2-min cutoff)
    const interval = setInterval(updateActivity, 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
      clearInterval(interval);
    };
  }, [supabase]);

  // This component doesn't render anything
  return null;
}
