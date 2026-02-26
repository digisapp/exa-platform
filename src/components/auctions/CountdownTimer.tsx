"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface CountdownTimerProps {
  endsAt: string;
  onEnd?: () => void;
  className?: string;
  showDays?: boolean;
  compact?: boolean;
}

function calculateTimeLeft(endTime: number): TimeLeft {
  const difference = endTime - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function CountdownTimer({
  endsAt,
  onEnd,
  className,
  showDays = true,
  compact = false,
}: CountdownTimerProps) {
  // Normalize to a number so string format variations don't re-trigger the effect
  const endTime = useMemo(() => new Date(endsAt).getTime(), [endsAt]);

  // null initial state avoids SSR/client hydration mismatch
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const onEndRef = useRef(onEnd);
  const hasEndedRef = useRef(false);

  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    hasEndedRef.current = false;

    const tick = () => {
      const tl = calculateTimeLeft(endTime);
      setTimeLeft(tl);
      if (tl.total <= 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;
        onEndRef.current?.();
        return false;
      }
      return tl.total > 0;
    };

    if (!tick()) return;

    const timer = setInterval(() => {
      if (!tick()) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  // SSR placeholder — prevents hydration mismatch
  if (timeLeft === null) {
    if (compact) {
      return <span className={cn("font-mono font-medium tabular-nums text-zinc-500", className)}>–</span>;
    }
    return (
      <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
        {[{ v: 0, l: "hrs" }, { v: 0, l: "min" }, { v: 0, l: "sec" }].map(({ v, l }) => (
          <TimeBox key={l} value={v} label={l} isUrgent={false} isVerySoon={false} />
        ))}
      </div>
    );
  }

  if (timeLeft.total <= 0) {
    return (
      <span className={cn("text-zinc-500 font-medium", className)}>
        Ended
      </span>
    );
  }

  const isUrgent = timeLeft.total < 60 * 60 * 1000;    // < 1 hour
  const isVerySoon = timeLeft.total < 5 * 60 * 1000;   // < 5 minutes

  if (compact) {
    let display = "";
    if (timeLeft.days > 0) {
      display = `${timeLeft.days}d ${timeLeft.hours}h`;
    } else if (timeLeft.hours > 0) {
      display = `${timeLeft.hours}h ${timeLeft.minutes}m`;
    } else {
      display = `${timeLeft.minutes}:${timeLeft.seconds.toString().padStart(2, "0")}`;
    }

    return (
      <span
        className={cn(
          "font-mono font-medium tabular-nums",
          isVerySoon && "text-red-500 animate-pulse",
          isUrgent && !isVerySoon && "text-orange-500",
          className
        )}
      >
        {display}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2", className)}>
      {showDays && timeLeft.days > 0 && (
        <>
          <TimeBox value={timeLeft.days} label="days" isUrgent={isUrgent} isVerySoon={isVerySoon} />
          <span className="text-zinc-400">:</span>
        </>
      )}
      <TimeBox value={timeLeft.hours} label="hrs" isUrgent={isUrgent} isVerySoon={isVerySoon} />
      <span className="text-zinc-400">:</span>
      <TimeBox value={timeLeft.minutes} label="min" isUrgent={isUrgent} isVerySoon={isVerySoon} />
      <span className="text-zinc-400">:</span>
      <TimeBox value={timeLeft.seconds} label="sec" isUrgent={isUrgent} isVerySoon={isVerySoon} />
    </div>
  );
}

interface TimeBoxProps {
  value: number;
  label: string;
  isUrgent: boolean;
  isVerySoon: boolean;
}

function TimeBox({ value, label, isUrgent, isVerySoon }: TimeBoxProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "bg-zinc-800 rounded-lg px-2 sm:px-3 py-1 sm:py-2 min-w-[36px] sm:min-w-[48px] text-center",
          isVerySoon && "bg-red-900/50",
          isUrgent && !isVerySoon && "bg-orange-900/30"
        )}
      >
        <span
          className={cn(
            "font-mono text-lg sm:text-2xl font-bold tabular-nums",
            isVerySoon && "text-red-400",
            isUrgent && !isVerySoon && "text-orange-400",
            !isUrgent && "text-white"
          )}
        >
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">{label}</span>
    </div>
  );
}

export default CountdownTimer;
