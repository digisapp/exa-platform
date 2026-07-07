"use client";

import { useState } from "react";

interface DailyViewsChartProps {
  data: { date: string; views: number }[];
}

function formatDay(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function DailyViewsChart({ data }: DailyViewsChartProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.views), 1);
  const selectedDay = selected !== null ? data[selected] : null;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 min-h-[1rem] tabular-nums" aria-live="polite">
        {selectedDay ? (
          <>
            <span className="text-foreground font-semibold">{formatDay(selectedDay.date)}</span>
            {" · "}
            <span className="text-pink-400 font-semibold">{selectedDay.views}</span>{" "}
            {selectedDay.views === 1 ? "view" : "views"}
          </>
        ) : (
          <span className="text-muted-foreground/60">Tap a bar to see details</span>
        )}
      </p>
      <div className="flex items-end gap-[3px] h-32">
        {data.map((day, i) => {
          const height = Math.max((day.views / max) * 100, day.views > 0 ? 4 : 1);
          const isMajorLabel = i % 10 === 0 || i === data.length - 1;
          const isMidLabel = !isMajorLabel && i % 5 === 0;
          const isSelected = selected === i;
          return (
            <div key={day.date} className="flex-1 min-w-0 h-full flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : i)}
                aria-label={`${formatDay(day.date)}: ${day.views} views`}
                aria-pressed={isSelected}
                className="relative flex-1 w-full flex items-end rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-500/60"
              >
                <span
                  className="block w-full rounded-sm transition-all"
                  style={{
                    height: `${height}%`,
                    background: isSelected
                      ? "linear-gradient(to top, #ec4899, #a855f7)"
                      : day.views > 0
                        ? "linear-gradient(to top, #ec4899cc, #a855f7aa)"
                        : "rgba(255,255,255,0.04)",
                    boxShadow: isSelected ? "0 0 10px rgba(236,72,153,0.5)" : undefined,
                  }}
                />
              </button>
              <span
                className={`h-3.5 text-[10px] whitespace-nowrap ${
                  isSelected ? "text-pink-400" : "text-zinc-500"
                } ${isMajorLabel ? "visible" : isMidLabel ? "invisible sm:visible" : "invisible"}`}
              >
                {isMajorLabel || isMidLabel ? formatDay(day.date) : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
