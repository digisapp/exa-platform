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

function calculateTimeLeft(endsAt: string): TimeLeft {
  const difference = new Date(endsAt).getTime() - Date.now();

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
  // Use useMemo for initial calculation
  const initialTimeLeft = useMemo(() => calculateTimeLeft(endsAt), [endsAt]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(initialTimeLeft);
  const hasEndedRef = useRef(false);
  const onEndRef = useRef(onEnd);

  // Update callback ref
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  // Reset hasEnded when endsAt changes
  useEffect(() => {
    hasEndedRef.current = false;
  }, [endsAt]);

  useEffect(() => {
    // Check if already ended
    const initial = calculateTimeLeft(endsAt);
    if (initial.total <= 0) {
      if (!hasEndedRef.current) {
        hasEndedRef.current = true;
        onEndRef.current?.();
      }
      return;
    }

    let timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endsAt);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        if (!hasEndedRef.current) {
          hasEndedRef.current = true;
          onEndRef.current?.();
        }
      }
    }, 1000);

    // Pause timer when tab is hidden, resume and recalculate when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const updated = calculateTimeLeft(endsAt);
        setTimeLeft(updated);
        if (updated.total > 0) {
          timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft(endsAt);
            setTimeLeft(newTimeLeft);
            if (newTimeLeft.total <= 0) {
              clearInterval(timer);
              if (!hasEndedRef.current) {
                hasEndedRef.current = true;
                onEndRef.current?.();
              }
            }
          }, 1000);
        }
      } else {
        clearInterval(timer);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endsAt]);

  if (timeLeft.total <= 0) {
    return (
      <span className={cn("text-zinc-500 font-medium", className)}>
        Ended
      </span>
    );
  }

  const isUrgent = timeLeft.total < 60 * 60 * 1000; // Less than 1 hour
  const isVerySoon = timeLeft.total < 5 * 60 * 1000; // Less than 5 minutes

  // Compact format: "2d 5h" or "1h 30m" or "5:23"
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

  // Full format with separate boxes
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
          isVerySoon && "bg-red-900/50 animate-pulse",
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
