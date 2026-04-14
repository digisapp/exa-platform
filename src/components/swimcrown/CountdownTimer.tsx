"use client";

import { useEffect, useState } from "react";

const TARGET_DATE = new Date("2026-05-30T00:00:00-04:00"); // SwimCrown Show - May 30, 2026

function getTimeLeft() {
  const now = new Date();
  const diff = TARGET_DATE.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const blocks = [
    { label: "Days", value: timeLeft.days },
    { label: "Hrs", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="text-center">
      <p className="text-sm font-bold tracking-widest uppercase text-pink-400 mb-4">
        Countdown to Crowning
      </p>
      <div className="inline-flex items-center gap-2 sm:gap-3 rounded-2xl bg-white/[0.04] border border-pink-500/15 px-5 sm:px-7 py-4 sm:py-5">
        {blocks.map((block, i) => (
          <div key={block.label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center min-w-[3.2rem] sm:min-w-[4rem]">
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums leading-none bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">
                {String(block.value).padStart(2, "0")}
              </span>
              <span className="mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-pink-300/80">
                {block.label}
              </span>
            </div>
            {i < blocks.length - 1 && (
              <span className="text-2xl font-bold text-pink-500/30 -mt-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
