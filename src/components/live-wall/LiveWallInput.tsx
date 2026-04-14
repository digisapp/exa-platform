"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isLoggedIn: boolean;
  onSend: (content: string) => Promise<void>;
  onAuthPrompt: () => void;
}

export function LiveWallInput({ isLoggedIn, onSend, onAuthPrompt }: Props) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      onAuthPrompt();
      return;
    }

    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend(trimmed);
      setValue("");
      inputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t border-white/10">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 280))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        onFocus={() => {
          if (!isLoggedIn) {
            onAuthPrompt();
            inputRef.current?.blur();
          }
        }}
        placeholder={isLoggedIn ? "Say something..." : "Sign in to chat..."}
        className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40 transition-colors"
        disabled={isSending}
      />
      {value.length > 0 && (
        <span className="text-[10px] text-white/30 tabular-nums">
          {value.length}/280
        </span>
      )}
      <button
        onClick={handleSubmit}
        disabled={isSending || !value.trim()}
        className={cn(
          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          value.trim()
            ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:scale-105"
            : "bg-white/5 text-white/20"
        )}
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
