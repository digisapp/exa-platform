"use client";

import { useCallback, useEffect, useRef } from "react";

export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const initializedRef = useRef(false);

  // Initialize AudioContext on first user interaction (required for mobile)
  const initAudio = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      audioContextRef.current = new AudioContextClass();

      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }, []);

  // Set up one-time initialization on first user interaction
  useEffect(() => {
    const soundPref = localStorage.getItem("boostSoundsEnabled");
    enabledRef.current = soundPref !== "false";

    const events = ["touchstart", "touchend", "click", "keydown"];

    const handleFirstInteraction = () => {
      initAudio();
      events.forEach((event) => {
        document.removeEventListener(event, handleFirstInteraction, true);
      });
    };

    events.forEach((event) => {
      document.addEventListener(event, handleFirstInteraction, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleFirstInteraction, true);
      });
    };
  }, [initAudio]);

  // Play boost purchase sound - celebratory sweep
  const onBoost = useCallback(() => {
    if (!enabledRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx) {
      initAudio();
      return;
    }

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // up to A5
      oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3); // up to E6

      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.35);

      // Vibrate on mobile
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30, 50, 50]);
      }
    } catch (e) {
      console.warn("Error playing sound:", e);
    }
  }, [initAudio]);

  const toggleSounds = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem("boostSoundsEnabled", enabled.toString());
  }, []);

  return {
    onBoost,
    toggleSounds,
  };
}
