"use client";

import { useCallback, useEffect, useRef } from "react";

// Sound frequencies for Web Audio API
const SOUNDS = {
  swipe: { frequency: 220, duration: 0.08, type: "sine" as OscillatorType },
  like: { frequency: 523, duration: 0.15, type: "sine" as OscillatorType }, // C5 - happy ding
  pass: { frequency: 196, duration: 0.1, type: "triangle" as OscillatorType }, // G3 - soft thud
  boost: { frequency: 659, duration: 0.2, type: "sine" as OscillatorType }, // E5 - excited
  spin: { frequency: 440, duration: 0.05, type: "square" as OscillatorType }, // tick
  win: { frequency: 784, duration: 0.3, type: "sine" as OscillatorType }, // G5 - celebration
};

export function useGameSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on any user interaction
    const events = ["touchstart", "mousedown", "keydown"];
    events.forEach((event) => document.addEventListener(event, initAudio, { once: true }));

    // Check localStorage for sound preference
    const soundPref = localStorage.getItem("boostSoundsEnabled");
    enabledRef.current = soundPref !== "false";

    return () => {
      events.forEach((event) => document.removeEventListener(event, initAudio));
    };
  }, []);

  const playSound = useCallback((soundName: keyof typeof SOUNDS) => {
    if (!enabledRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resume context if suspended
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const sound = SOUNDS[soundName];
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.frequency, ctx.currentTime);

    // For boost, add a frequency sweep up
    if (soundName === "boost") {
      oscillator.frequency.exponentialRampToValueAtTime(
        sound.frequency * 1.5,
        ctx.currentTime + sound.duration
      );
    }

    // For win, add a frequency sweep
    if (soundName === "win") {
      oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5
    }

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + sound.duration);
  }, []);

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
