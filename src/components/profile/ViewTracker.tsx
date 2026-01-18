"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  modelId: string;
}

export function ViewTracker({ modelId }: ViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return;
    tracked.current = true;

    // Save this model as the referrer for signup tracking
    // This persists until they sign up or clear storage
    try {
      localStorage.setItem("signup_referrer_model_id", modelId);
    } catch {
      // localStorage might be unavailable
    }

    // Check sessionStorage to avoid counting multiple views in the same session
    const viewedKey = `viewed_${modelId}`;
    const lastViewed = sessionStorage.getItem(viewedKey);
    const now = Date.now();

    // Only count if not viewed in the last 30 minutes
    if (lastViewed && now - parseInt(lastViewed) < 30 * 60 * 1000) {
      return;
    }

    // Track the view
    fetch(`/api/models/${modelId}/view`, {
      method: "POST",
    }).then(() => {
      sessionStorage.setItem(viewedKey, now.toString());
    }).catch(() => {
      // Silently fail - view tracking is non-critical
    });
  }, [modelId]);

  // This component renders nothing
  return null;
}
