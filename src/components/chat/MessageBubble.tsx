"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Message } from "@/types/database";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  senderName = "User",
  senderAvatar,
  showAvatar = true,
}: MessageBubbleProps) {
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[80%]",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {showAvatar && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={senderAvatar || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("space-y-1", isOwn ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isOwn
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
              : "bg-muted"
          )}
        >
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {message.media_url && (
            <div className="mt-2">
              {message.media_type?.startsWith("image/") ? (
                <img
                  src={message.media_url}
                  alt="Attached image"
                  className="max-w-full max-h-64 rounded-lg"
                />
              ) : (
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline"
                >
                  View attachment
                </a>
              )}
            </div>
          )}
        </div>

        <p
          className={cn(
            "text-xs text-muted-foreground px-1",
            isOwn ? "text-right" : "text-left"
          )}
        >
          {formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}
