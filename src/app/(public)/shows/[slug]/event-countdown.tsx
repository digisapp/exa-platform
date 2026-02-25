"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(target: string): TimeLeft {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

export function EventCountdown({ startsAt }: { startsAt: string }) {
  const [time, setTime] = useState<TimeLeft>(getTimeLeft(startsAt));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTime(getTimeLeft(startsAt)), 1000);
    return () => clearInterval(interval);
  }, [startsAt]);

  if (!mounted) return null;
  if (time.total <= 0) return null;

  const units = [
    { value: time.days, label: "DAYS" },
    { value: time.hours, label: "HRS" },
    { value: time.minutes, label: "MIN" },
    { value: time.seconds, label: "SEC" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-5">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-violet-500/10 pointer-events-none" />
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

      <p className="relative text-[10px] uppercase tracking-[0.25em] text-pink-400 font-bold mb-4 text-center">
        ✦&nbsp;&nbsp;Event Starts In&nbsp;&nbsp;✦
      </p>

      <div className="relative flex items-start justify-center gap-1.5">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-start gap-1.5">
            <div className="flex flex-col items-center">
              {/* Number block */}
              <div className="relative">
                {/* Glow behind block */}
                <div className="absolute inset-0 bg-gradient-to-b from-pink-500/30 to-violet-500/30 rounded-xl blur-md scale-110" />
                {/* Block itself */}
                <div className="relative flex items-center justify-center bg-[#0d0d0d] border border-white/10 rounded-xl w-[54px] h-[52px] shadow-inner">
                  {/* Subtle top shine */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-xl" />
                  <span
                    className="font-mono text-[28px] font-black tabular-nums leading-none"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {unit.value.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-bold tracking-[0.2em] text-zinc-500 mt-2">
                {unit.label}
              </span>
            </div>

            {/* Colon separator */}
            {i < 3 && (
              <div className="flex flex-col gap-1.5 mt-2.5">
                <div className="w-1 h-1 rounded-full bg-pink-500/60" />
                <div className="w-1 h-1 rounded-full bg-pink-500/60" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
    </div>
  );
}
