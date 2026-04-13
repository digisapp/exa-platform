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
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {blocks.map((block, i) => (
        <div key={block.label} className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-[#0d1f35]/80 border border-teal-500/20 shadow-lg shadow-teal-500/5">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                {String(block.value).padStart(2, "0")}
              </span>
            </div>
            <span className="mt-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-teal-400/70">
              {block.label}
            </span>
          </div>
          {i < blocks.length - 1 && (
            <span className="text-2xl font-bold text-teal-500/40 -mt-5">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
