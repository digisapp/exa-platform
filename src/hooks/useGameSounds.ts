"use client";

import { useCallback, useEffect, useRef } from "react";

// Sound frequencies for Web Audio API - made longer and more noticeable
const SOUNDS = {
  swipe: { frequency: 300, duration: 0.1, type: "sine" as OscillatorType },
  like: { frequency: 880, duration: 0.2, type: "sine" as OscillatorType }, // A5 - happy ding
  pass: { frequency: 220, duration: 0.15, type: "triangle" as OscillatorType }, // A3 - soft whoosh
  boost: { frequency: 440, duration: 0.35, type: "sine" as OscillatorType }, // A4 - excited sweep
  spin: { frequency: 600, duration: 0.08, type: "square" as OscillatorType }, // tick
  win: { frequency: 880, duration: 0.5, type: "sine" as OscillatorType }, // celebration
};

export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  // Get or create AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("Web Audio API not supported");
        return null;
      }
    }
    return audioContextRef.current;
  }, []);

  // Check localStorage for sound preference on mount
  useEffect(() => {
    const soundPref = localStorage.getItem("boostSoundsEnabled");
    enabledRef.current = soundPref !== "false";
  }, []);

  const playSound = useCallback(async (soundName: keyof typeof SOUNDS) => {
    if (!enabledRef.current) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (required for mobile browsers)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    try {
      const sound = SOUNDS[soundName];
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = sound.type;
      oscillator.frequency.setValueAtTime(sound.frequency, ctx.currentTime);

      // For like, play two quick notes (happy sound)
      if (soundName === "like") {
        oscillator.frequency.setValueAtTime(660, ctx.currentTime); // E5
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      }

      // For boost, sweep up dramatically
      if (soundName === "boost") {
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
        oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // up to A5
        oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3); // up to E6
      }

      // For win, play ascending notes
      if (soundName === "win") {
        oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15); // E5
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3); // G5
        oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.4); // C6
      }

      // Higher volume for better audibility
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + sound.duration);
    } catch (e) {
      console.warn("Error playing sound:", e);
    }
  }, [getAudioContext]);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!enabledRef.current) return;
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Combined actions
  const onSwipe = useCallback(() => {
    playSound("swipe");
    vibrate(10);
  }, [playSound, vibrate]);

  const onLike = useCallback(() => {
    playSound("like");
    vibrate([20, 30, 20]);
  }, [playSound, vibrate]);

  const onPass = useCallback(() => {
    playSound("pass");
    vibrate(15);
  }, [playSound, vibrate]);

  const onBoost = useCallback(() => {
    playSound("boost");
    vibrate([30, 50, 30, 50, 50]);
  }, [playSound, vibrate]);

  const onSpinTick = useCallback(() => {
    playSound("spin");
  }, [playSound]);

  const onWin = useCallback(() => {
    playSound("win");
    vibrate([50, 100, 50, 100, 100]);
  }, [playSound, vibrate]);

  const toggleSounds = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
    localStorage.setItem("boostSoundsEnabled", enabled.toString());
  }, []);

  return {
    onSwipe,
    onLike,
    onPass,
    onBoost,
    onSpinTick,
    onWin,
    toggleSounds,
  };
}
