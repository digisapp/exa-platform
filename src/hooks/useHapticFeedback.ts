"use client";

/**
 * Hook for providing haptic feedback on mobile devices.
 * Uses the Vibration API when available.
 */
export function useHapticFeedback() {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  /**
   * Light tap feedback - for button presses, selections
   */
  const lightTap = () => {
    if (isSupported) {
      navigator.vibrate(10);
    }
  };

  /**
   * Medium tap feedback - for confirmations, toggles
   */
  const mediumTap = () => {
    if (isSupported) {
      navigator.vibrate(25);
    }
  };

  /**
   * Success feedback - for completed actions
   */
  const success = () => {
    if (isSupported) {
      navigator.vibrate([10, 50, 10]);
    }
  };

  /**
   * Warning feedback - for warnings, errors
   */
  const warning = () => {
    if (isSupported) {
      navigator.vibrate([30, 50, 30]);
    }
  };

  /**
   * Error feedback - for failures
   */
  const error = () => {
    if (isSupported) {
      navigator.vibrate([50, 100, 50, 100, 50]);
    }
  };

  /**
   * Selection feedback - for selecting items in a list
   */
  const selection = () => {
    if (isSupported) {
      navigator.vibrate(5);
    }
  };

  return {
    isSupported,
    lightTap,
    mediumTap,
    success,
    warning,
    error,
    selection,
  };
}

/**
 * Standalone function for simple haptic feedback
 * Can be used outside of React components
 */
export function hapticFeedback(type: "light" | "medium" | "success" | "warning" | "error" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 25,
    success: [10, 50, 10],
    warning: [30, 50, 30],
    error: [50, 100, 50, 100, 50],
  };

  navigator.vibrate(patterns[type]);
}
