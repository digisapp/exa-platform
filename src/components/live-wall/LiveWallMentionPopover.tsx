"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionUser {
  username: string;
  display_name: string;
  avatar_url: string | null;
  actor_type: string;
}

const ACTOR_COLORS: Record<string, string> = {
  model: "text-pink-400",
  fan: "text-amber-400",
  brand: "text-cyan-400",
};

interface Props {
  query: string;
  onSelect: (username: string) => void;
  onClose: () => void;
  visible: boolean;
}

export function LiveWallMentionPopover({ query, onSelect, onClose, visible }: Props) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!visible || !query) {
      setUsers([]);
      return;
    }

    setSelectedIndex(0);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetch(`/api/live-wall/search-users?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [query, visible]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, users.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && users[selectedIndex]) {
        e.preventDefault();
        onSelect(users[selectedIndex].username);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, users, selectedIndex, onSelect, onClose]);

  if (!visible || (!loading && users.length === 0)) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 rounded-lg border border-white/10 bg-black/95 backdrop-blur-xl shadow-lg overflow-hidden z-50">
      {loading ? (
        <div className="px-3 py-2 text-xs text-white/30">Searching...</div>
      ) : (
        users.map((user, i) => (
          <button
            key={user.username}
            onClick={() => onSelect(user.username)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors",
              i === selectedIndex && "bg-white/5"
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-white/10 text-white/60 text-[9px]">
                {user.display_name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white font-medium">
                @{user.username}
              </span>
              <span className="text-xs text-white/40 ml-1.5">
                {user.display_name}
              </span>
            </div>
            <span
              className={cn(
                "text-[10px] capitalize",
                ACTOR_COLORS[user.actor_type] || "text-white/30"
              )}
            >
              {user.actor_type}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
