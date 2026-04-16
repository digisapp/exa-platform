"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  name: string;
  className?: string;
}

export function TypingIndicator({ name, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.7)] animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.7)] animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)] animate-bounce" />
      </div>
      <span className="text-xs text-white/50">
        <span className="font-medium text-white/70">{name}</span> is typing...
      </span>
    </div>
  );
}
