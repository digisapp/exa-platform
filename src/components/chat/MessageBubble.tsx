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
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { MoreVertical, Trash2, Lock, Coins, Loader2 as Spinner, Reply, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { ImageLightbox } from "./ImageLightbox";
import { LinkPreview } from "./LinkPreview";
import { MessageReactions } from "./MessageReactions";
import type { Message } from "@/types/database";

// Match URLs in text (http/https only), strip trailing punctuation
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  if (!match) return null;
  // Strip trailing punctuation that's likely not part of the URL
  return match[0].replace(/[.,;:!?)]+$/, "");
}

function formatMessageTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMinutes = (Date.now() - date.getTime()) / (1000 * 60);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)}m ago`;
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  if (date.getFullYear() === new Date().getFullYear()) return format(date, "MMM d, h:mm a");
  return format(date, "MMM d yyyy, h:mm a");
}

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
  repliedMessage?: { id: string; content: string | null; sender_id: string; media_type: string | null } | null;
  repliedMessageSenderName?: string;
  onReply?: () => void;
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
  repliedMessage,
  repliedMessageSenderName,
  onReply,
}: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(!!(message as any).deleted_at);
  const [isUnlocking, setIsUnlocking] = useState(false);
  // Edit state — content shown in bubble can diverge from message.content during/after editing
  const [editedContent, setEditedContent] = useState<string | null>(
    (message as any).content ?? null
  );
  const [editedAt, setEditedAt] = useState<string | null>((message as any).edited_at ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Editing is allowed for own text messages within 15 min of send.
  const EDIT_WINDOW_MS = 15 * 60 * 1000;
  const sentMs = message.created_at ? new Date(message.created_at).getTime() : 0;
  const canEdit =
    isOwn &&
    !!editedContent &&
    !message.media_url &&
    !(message as any).is_system &&
    Date.now() - sentMs < EDIT_WINDOW_MS;

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

  const startEdit = () => {
    setEditDraft(editedContent ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditDraft("");
  };

  const saveEdit = async () => {
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === editedContent || isSavingEdit) {
      cancelEdit();
      return;
    }
    setIsSavingEdit(true);
    try {
      const response = await fetch("/api/messages/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, content: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to edit message");
        return;
      }
      setEditedContent(trimmed);
      setEditedAt(data.message?.edited_at || new Date().toISOString());
      setIsEditing(false);
      setEditDraft("");
    } catch {
      toast.error("Failed to edit message");
    } finally {
      setIsSavingEdit(false);
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
            {message.created_at && formatMessageTimestamp(message.created_at)}
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
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={senderAvatar || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <div className={cn("relative", isOwn ? "items-end" : "items-start")}>
        {/* Action menu (delete + reply) */}
        <div className={cn(
          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5",
          isOwn ? "-left-20" : "-right-20",
          isDeleting && "opacity-50 pointer-events-none"
        )}>
          {onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={onReply}
            >
              <Reply className="h-4 w-4" />
            </Button>
          )}
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {canEdit && (
                  <DropdownMenuItem onClick={startEdit}>
                    <Pencil className="h-4 w-4 mr-2 text-cyan-400" />
                    Edit message
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 transition-all",
            isOwn
              ? "bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.35)]"
              : "bg-white/[0.05] border border-white/10 backdrop-blur-sm text-white"
          )}
        >
          {/* Reply snippet */}
          {repliedMessage && (
            <div className={cn(
              "mb-2 px-3 py-1.5 rounded-lg border-l-[3px] text-xs",
              isOwn
                ? "bg-white/15 border-white/60"
                : "bg-pink-500/10 border-pink-500"
            )}>
              <p className={cn(
                "font-semibold mb-0.5",
                isOwn ? "text-white" : "text-pink-300"
              )}>
                {repliedMessageSenderName || "User"}
              </p>
              <p className={cn(
                "truncate",
                isOwn ? "text-white/75" : "text-white/60"
              )}>
                {repliedMessage.content
                  || (repliedMessage.media_type?.startsWith("image") ? "Photo" : "Media")}
              </p>
            </div>
          )}

          {/* Edit mode: inline textarea + save/cancel */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  } else if (e.key === "Escape") {
                    cancelEdit();
                  }
                }}
                disabled={isSavingEdit}
                autoFocus
                rows={Math.min(6, Math.max(1, editDraft.split("\n").length))}
                className={cn(
                  "w-full text-[15px] leading-relaxed resize-none rounded-lg p-2 outline-none transition-all",
                  isOwn
                    ? "bg-white/10 text-white placeholder:text-white/40 focus:bg-white/15"
                    : "bg-black/30 text-white placeholder:text-white/40 focus:bg-black/40"
                )}
              />
              <div className="flex items-center justify-end gap-1.5 text-xs">
                <button
                  onClick={cancelEdit}
                  disabled={isSavingEdit}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSavingEdit || !editDraft.trim() || editDraft.trim() === editedContent}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 hover:text-pink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? (
                    <Spinner className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Save
                </button>
              </div>
              <p className={cn(
                "text-[10px]",
                isOwn ? "text-white/50" : "text-white/40"
              )}>
                Esc to cancel · Enter to save
              </p>
            </div>
          ) : editedContent && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {editedContent}
            </p>
          )}

          {/* Link preview for first URL in message */}
          {!isEditing && editedContent && extractFirstUrl(editedContent) && (
            <LinkPreview
              url={extractFirstUrl(editedContent)!}
              isOwn={isOwn}
            />
          )}

          {message.media_url && (
            <div className={cn("mt-2", !message.content && "-mt-0")}>
              {isMediaLocked ? (
                /* Locked PPV media overlay -- uses gradient placeholder, never the real URL */
                <div className="relative rounded-xl overflow-hidden ring-1 ring-pink-500/30 shadow-[0_0_24px_rgba(236,72,153,0.25)]">
                  <div className={cn(
                    "w-full h-52 rounded-xl",
                    message.media_type?.startsWith("image/")
                      ? "bg-gradient-to-br from-pink-900/70 via-violet-900/40 to-cyan-900/50"
                      : "bg-gradient-to-br from-violet-900/60 via-pink-900/40 to-violet-950"
                  )} />
                  {/* Decorative blur orbs */}
                  <div className="pointer-events-none absolute -top-12 -left-12 w-32 h-32 rounded-full bg-pink-500/40 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-violet-500/40 blur-3xl" />
                  {/* Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md rounded-xl">
                    <div className="relative mb-3">
                      <div className="absolute inset-0 rounded-full bg-pink-500/40 blur-xl" />
                      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 ring-1 ring-pink-500/40 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-pink-200" />
                      </div>
                    </div>
                    <p className="text-white font-semibold text-base mb-0.5">
                      {message.media_type?.startsWith("video/") ? "Exclusive Video" : "Exclusive Photo"}
                    </p>
                    <p className="text-white/60 text-xs mb-4 uppercase tracking-wider">Tap to unlock</p>
                    <Button
                      onClick={handleUnlock}
                      disabled={isUnlocking}
                      className="h-11 px-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white gap-2 shadow-[0_0_24px_rgba(236,72,153,0.5)] hover:shadow-[0_0_32px_rgba(236,72,153,0.7)] active:scale-[0.98] transition-all border-0"
                    >
                      {isUnlocking ? (
                        <Spinner className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Coins className="h-4 w-4" />
                          <span className="font-semibold">Unlock · {message.media_price} coins</span>
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

      {/* Timestamp to the right/left of the bubble (with "edited" tag if applicable) */}
      {showTimestamp && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap self-end mb-1 flex items-center gap-1">
          {message.created_at && formatMessageTimestamp(message.created_at)}
          {editedAt && (
            <span
              className="text-pink-300/80 italic"
              title={`Edited ${formatMessageTimestamp(editedAt)}`}
            >
              · edited
            </span>
          )}
        </span>
      )}
    </div>
  );
});
