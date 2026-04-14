"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

export interface LiveWallMessageData {
  id: string;
  actor_id: string | null;
  actor_type: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  message_type: string;
  reactions: Record<string, string[]>;
  created_at: string;
}

const ACTOR_BADGE_STYLES: Record<string, string> = {
  model: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  fan: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  brand: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const ALLOWED_EMOJIS = ["🔥", "❤️", "👑"] as const;

interface Props {
  message: LiveWallMessageData;
  currentActorId?: string | null;
  isAdmin?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
}

export function LiveWallMessage({
  message,
  currentActorId,
  isAdmin,
  onReact,
  onDelete,
}: Props) {
  if (message.message_type === "system") {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
        <span className="text-xs text-white/40 italic whitespace-nowrap">
          {message.content}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
      </div>
    );
  }

  const timeAgo = formatDistanceToNowStrict(new Date(message.created_at), {
    addSuffix: false,
  });
  const badgeStyle = ACTOR_BADGE_STYLES[message.actor_type] || "";

  return (
    <div className="group flex gap-2.5 py-1.5 px-2 hover:bg-white/[0.02] rounded-lg transition-colors">
      {/* Avatar */}
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={message.avatar_url || undefined} />
        <AvatarFallback className="bg-white/10 text-white/60 text-[10px]">
          {message.display_name[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-white truncate max-w-[120px]">
            {message.display_name}
          </span>
          {badgeStyle && (
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0 rounded-full border capitalize leading-4",
                badgeStyle
              )}
            >
              {message.actor_type}
            </span>
          )}
          <span className="text-[10px] text-white/30">{timeAgo}</span>

          {/* Admin delete */}
          {isAdmin && (
            <button
              onClick={() => onDelete?.(message.id)}
              className="opacity-0 group-hover:opacity-100 ml-auto text-white/20 hover:text-red-400 transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        <p className="text-sm text-white/80 break-words leading-snug">
          {message.content}
        </p>

        {/* Reactions */}
        <div className="flex items-center gap-1 mt-1">
          {ALLOWED_EMOJIS.map((emoji) => {
            const actors = message.reactions[emoji] || [];
            const hasReacted = currentActorId
              ? actors.includes(currentActorId)
              : false;
            return (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all",
                  actors.length > 0
                    ? hasReacted
                      ? "bg-pink-500/20 border border-pink-500/30"
                      : "bg-white/5 border border-white/10"
                    : "bg-transparent border border-transparent opacity-0 group-hover:opacity-60 hover:!opacity-100"
                )}
              >
                <span className="text-[11px]">{emoji}</span>
                {actors.length > 0 && (
                  <span
                    className={cn(
                      "text-[10px]",
                      hasReacted ? "text-pink-400" : "text-white/40"
                    )}
                  >
                    {actors.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
