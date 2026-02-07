"use client";

import { useState, memo } from "react";
import Image from "next/image";
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
import { MoreVertical, Trash2, Lock, Coins, Loader2 as Spinner } from "lucide-react";
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
  showTimestamp?: boolean;
  onDelete?: (messageId: string) => void;
  reactions?: Reaction[];
  currentActorId?: string;
  onReactionChange?: () => void;
  onUnlock?: (messageId: string, price: number) => Promise<void>;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  senderName = "User",
  senderAvatar,
  showAvatar = true,
  showTimestamp = true,
  onDelete,
  reactions = [],
  currentActorId,
  onReactionChange,
  onUnlock,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(!!(message as any).deleted_at);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // PPV: determine if media is locked
  const hasMediaPrice = (message.media_price ?? 0) > 0;
  const isMediaUnlocked = isOwn || (
    hasMediaPrice && currentActorId
      ? (message.media_viewed_by ?? []).includes(currentActorId)
      : false
  );
  const isMediaLocked = hasMediaPrice && !isMediaUnlocked;

  const handleUnlock = async () => {
    if (!onUnlock || isUnlocking || !message.media_price) return;
    setIsUnlocking(true);
    try {
      await onUnlock(message.id, message.media_price);
    } finally {
      setIsUnlocking(false);
    }
  };

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
        return; // Don't set isDeleted on failure
      }

      // Only mark as deleted after successful API response
      setIsDeleted(true);
      onDelete?.(message.id);
      toast.success("Message deleted");
    } catch {
      // Explicitly do NOT set isDeleted here - the message still exists
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
        "flex items-end gap-2 max-w-[85%] group",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {showAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={senderAvatar || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={cn("relative", isOwn ? "items-end" : "items-start")}>
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
              {isMediaLocked ? (
                /* Locked PPV media overlay -- uses gradient placeholder, never the real URL */
                <div className="relative rounded-lg overflow-hidden">
                  <div className={cn(
                    "w-full h-48 rounded-lg",
                    message.media_type?.startsWith("image/")
                      ? "bg-gradient-to-br from-pink-900/40 via-gray-800 to-violet-900/40"
                      : "bg-gradient-to-br from-gray-800 to-gray-900"
                  )} />
                  {/* Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 rounded-lg">
                    <Lock className="h-8 w-8 text-white/80 mb-2" />
                    <p className="text-white/90 text-sm font-medium mb-3">
                      {message.media_type?.startsWith("video/") ? "Locked Video" : "Locked Photo"}
                    </p>
                    <Button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-violet-500 text-white gap-1.5"
                    >
                      {isUnlocking ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Coins className="h-3.5 w-3.5" />
                          Unlock for {message.media_price} coins
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : message.media_type?.startsWith("image/") ? (
                <>
                  <Image
                    src={message.media_url}
                    alt="Attached image"
                    width={400}
                    height={256}
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

              {/* PPV price badge for sender */}
              {hasMediaPrice && isOwn && (
                <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                  <Lock className="h-3 w-3" />
                  <span>PPV: {message.media_price} coins</span>
                </div>
              )}
            </div>
          )}

          {/* Reactions inline at bottom of bubble */}
          {currentActorId && reactions.length > 0 && (
            <div className={cn("mt-1", isOwn ? "text-right" : "text-left")}>
              <MessageReactions
                messageId={message.id}
                reactions={reactions}
                currentActorId={currentActorId}
                onReactionChange={onReactionChange}
                isOwn={isOwn}
              />
            </div>
          )}
        </div>
      </div>

      {/* Timestamp to the right/left of the bubble */}
      {showTimestamp && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap self-end mb-1">
          {message.created_at && formatDistanceToNow(new Date(message.created_at), {
            addSuffix: true,
          })}
        </span>
      )}
    </div>
  );
});
