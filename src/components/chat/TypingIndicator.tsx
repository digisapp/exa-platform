"use client";

import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  name: string;
  className?: string;
}

export function TypingIndicator({ name, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
      <div className="flex items-center gap-1">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
        </div>
      </div>
      <span className="text-sm text-muted-foreground">
        {name} is typing...
      </span>
    </div>
  );
}
