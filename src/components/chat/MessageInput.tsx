"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Coins } from "lucide-react";
import { PhotoUploader } from "@/components/upload/PhotoUploader";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/types/database";

interface MessageInputProps {
  onSend: (content: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  disabled?: boolean;
  coinCost?: number; // 0 for free, 10 for paid messages
  coinBalance?: number;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  coinCost = 0,
  coinBalance = 0,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<{
    url: string;
    type: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (content.trim() || attachedMedia) && !disabled && !sending;
  const hasEnoughCoins = coinCost === 0 || coinBalance >= coinCost;

  const handleSend = async () => {
    if (!canSend || !hasEnoughCoins) return;

    const messageContent = content.trim();
    const mediaUrl = attachedMedia?.url;
    const mediaType = attachedMedia?.type;

    // Clear input immediately for responsive feel
    setContent("");
    setAttachedMedia(null);
    setSending(true);

    try {
      await onSend(messageContent, mediaUrl, mediaType);
    } catch (error) {
      // Restore content on error
      setContent(messageContent);
      if (mediaUrl && mediaType) {
        setAttachedMedia({ url: mediaUrl, type: mediaType });
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMediaUpload = (_url: string, mediaAsset: MediaAsset) => {
    setAttachedMedia({
      url: mediaAsset.url || _url,
      type: mediaAsset.mime_type || "image/jpeg",
    });
  };

  const removeAttachment = () => {
    setAttachedMedia(null);
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Coin cost indicator */}
      {coinCost > 0 && (
        <div
          className={cn(
            "flex items-center gap-2 text-sm mb-2 px-1",
            hasEnoughCoins ? "text-muted-foreground" : "text-destructive"
          )}
        >
          <Coins className="h-4 w-4" />
          <span>
            {hasEnoughCoins
              ? `${coinCost} coins per message`
              : `Insufficient coins (need ${coinCost}, have ${coinBalance})`}
          </span>
        </div>
      )}

      {/* Attached media preview */}
      {attachedMedia && (
        <div className="mb-2 relative inline-block">
          <img
            src={attachedMedia.url}
            alt="Attachment"
            className="h-20 rounded-lg"
          />
          <button
            onClick={removeAttachment}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Photo attachment */}
        <PhotoUploader
          type="message"
          compact
          onUploadComplete={handleMediaUpload}
        />

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend || !hasEnoughCoins}
          size="icon"
          className="shrink-0 bg-gradient-to-r from-pink-500 to-violet-500"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
