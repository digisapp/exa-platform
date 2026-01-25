"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageLightbox } from "./ImageLightbox";
import { MessageReactions } from "./MessageReactions";
import type { Message } from "@/types/database";

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  showAvatar?: boolean;
  onDelete?: (messageId: string) => void;
  reactions?: Reaction[];
  currentActorId?: string;
  onReactionChange?: () => void;
}

export function MessageBubble({
  message,
  isOwn,
  senderName = "User",
  senderAvatar,
  showAvatar = true,
  onDelete,
  reactions = [],
  currentActorId,
  onReactionChange,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(!!(message as any).deleted_at);

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to delete message");
        return;
      }

      setIsDeleted(true);
      onDelete?.(message.id);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    } finally {
      setIsDeleting(false);
    }
  };

  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Show system message (tips, notifications, etc.) centered
  if ((message as any).is_system) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
          <p className="text-sm text-center">
            {message.content}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {message.created_at && formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>
    );
  }

  // Show deleted message placeholder
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex gap-3 max-w-[80%]",
          isOwn ? "ml-auto flex-row-reverse" : ""
        )}
      >
        {showAvatar && (
          <Avatar className="h-8 w-8 shrink-0 opacity-50">
            <AvatarImage src={senderAvatar || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        )}
        <div className={cn("space-y-1", isOwn ? "items-end" : "items-start")}>
          <div className="rounded-2xl px-4 py-2 bg-muted/50 border border-dashed border-muted-foreground/30">
            <p className="text-sm text-muted-foreground italic">
              Message deleted
            </p>
          </div>
          <p
            className={cn(
              "text-xs text-muted-foreground px-1",
              isOwn ? "text-right" : "text-left"
            )}
          >
            {message.created_at && formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[80%] group",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {showAvatar && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={senderAvatar || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("space-y-1 relative", isOwn ? "items-end" : "items-start")}>
        {/* Delete menu for own messages */}
        {isOwn && (
          <div className={cn(
            "absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isDeleting && "opacity-50 pointer-events-none"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

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
            <div className={cn("mt-2", !message.content && "-mt-0")}>
              {message.media_type?.startsWith("image/") ? (
                <>
                  <img
                    src={message.media_url}
                    alt="Attached image"
                    className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxOpen(true)}
                  />
                  <ImageLightbox
                    src={message.media_url!}
                    alt="Attached image"
                    isOpen={lightboxOpen}
                    onClose={() => setLightboxOpen(false)}
                  />
                </>
              ) : message.media_type?.startsWith("video/") ? (
                <video
                  src={message.media_url}
                  controls
                  className="max-w-full max-h-64 rounded-lg"
                  preload="metadata"
                />
              ) : message.media_type?.startsWith("audio/") ? (
                <div className={cn(
                  "flex items-center gap-3 p-2 rounded-lg min-w-[200px]",
                  isOwn ? "bg-white/10" : "bg-background/50"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    isOwn ? "bg-white/20" : "bg-amber-500/20"
                  )}>
                    <svg
                      className={cn("h-5 w-5", isOwn ? "text-white" : "text-amber-500")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <audio
                    src={message.media_url}
                    controls
                    className="h-8 flex-1 min-w-0"
                    preload="metadata"
                  />
                </div>
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

        <div className={cn(
          "flex items-center gap-2",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <p
            className={cn(
              "text-xs text-muted-foreground px-1",
              isOwn ? "text-right" : "text-left"
            )}
          >
            {message.created_at && formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
          </p>

          {/* Reactions */}
          {currentActorId && (
            <MessageReactions
              messageId={message.id}
              reactions={reactions}
              currentActorId={currentActorId}
              onReactionChange={onReactionChange}
              isOwn={isOwn}
            />
          )}
        </div>
      </div>
    </div>
  );
}
