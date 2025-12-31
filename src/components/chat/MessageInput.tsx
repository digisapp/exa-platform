"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Coins, X, Video, Mic, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttachmentMenu } from "./AttachmentMenu";
import { VoiceRecorder } from "./VoiceRecorder";
import { LibraryPicker } from "./LibraryPicker";

interface MessageInputProps {
  onSend: (content: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  disabled?: boolean;
  coinCost?: number;
  coinBalance?: number;
  placeholder?: string;
  isModel?: boolean;
  modelId?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  coinCost = 0,
  coinBalance = 0,
  placeholder = "Type a message...",
  isModel = false,
  modelId,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<{
    url: string;
    type: string;
    preview?: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (content.trim() || attachedMedia) && !disabled && !sending && !uploading;
  const hasEnoughCoins = coinCost === 0 || coinBalance >= coinCost;

  const handleSend = async () => {
    if (!canSend || !hasEnoughCoins) return;

    const messageContent = content.trim();
    const mediaUrl = attachedMedia?.url;
    const mediaType = attachedMedia?.type;

    setContent("");
    setAttachedMedia(null);
    setSending(true);

    try {
      await onSend(messageContent, mediaUrl, mediaType);
    } catch (error) {
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

  const uploadFile = async (file: File, type: "photo" | "video" | "audio") => {
    // Validate file size (50MB for video, 10MB for audio, 5MB for photos)
    const maxSize = type === "video" ? 50 : type === "audio" ? 10 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File must be less than ${maxSize}MB`);
      return;
    }

    setUploading(true);
    const preview = type !== "audio" ? URL.createObjectURL(file) : undefined;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "message");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setAttachedMedia({
        url: data.url,
        type: file.type,
        preview,
      });

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} attached`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
      if (preview) URL.revokeObjectURL(preview);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoSelect = (file: File) => {
    uploadFile(file, "photo");
  };

  const handleVideoSelect = (file: File) => {
    uploadFile(file, "video");
  };

  const handleVoiceRecord = () => {
    setIsRecording(true);
  };

  const handleVoiceComplete = async (audioBlob: Blob) => {
    const file = new File([audioBlob], "voice-message.webm", { type: "audio/webm" });
    setIsRecording(false);
    await uploadFile(file, "audio");
  };

  const handleLibrarySelect = (item: { url: string; type: "photo" | "video"; coinPrice?: number }) => {
    setAttachedMedia({
      url: item.url,
      type: item.type === "video" ? "video/mp4" : "image/jpeg",
      preview: item.url,
    });
    // If it's PPV content, we could add price info here
  };

  const removeAttachment = () => {
    if (attachedMedia?.preview) {
      URL.revokeObjectURL(attachedMedia.preview);
    }
    setAttachedMedia(null);
  };

  // Voice recording mode
  if (isRecording) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleVoiceComplete}
        onCancel={() => setIsRecording(false)}
        uploading={uploading}
      />
    );
  }

  return (
    <div className="border-t bg-background p-4">
      {/* Coin cost indicator - only show for fans */}
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
        <div className="mb-3 relative inline-block">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            {attachedMedia.type.startsWith("video") ? (
              <div className="relative">
                <video
                  src={attachedMedia.preview || attachedMedia.url}
                  className="h-24 max-w-[200px] object-cover"
                />
                <div className="absolute top-1 left-1 p-1 rounded bg-black/60">
                  <Video className="h-3 w-3 text-white" />
                </div>
              </div>
            ) : attachedMedia.type.startsWith("audio") ? (
              <div className="flex items-center gap-2 p-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-amber-500" />
                </div>
                <span className="text-sm text-muted-foreground">Voice message</span>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={attachedMedia.preview || attachedMedia.url}
                  alt="Attachment"
                  className="h-24 max-w-[200px] object-cover"
                />
                <div className="absolute top-1 left-1 p-1 rounded bg-black/60">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={removeAttachment}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow-lg hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment menu (+ button) */}
        <AttachmentMenu
          onPhotoSelect={handlePhotoSelect}
          onVideoSelect={handleVideoSelect}
          onVoiceRecord={handleVoiceRecord}
          onLibraryOpen={() => setLibraryOpen(true)}
          uploading={uploading}
          disabled={disabled || sending}
          isModel={isModel}
        />

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending || uploading}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />

        {/* Send button with coin cost */}
        <Button
          onClick={handleSend}
          disabled={!canSend || !hasEnoughCoins}
          className={cn(
            "shrink-0 bg-gradient-to-r from-pink-500 to-violet-500 gap-1.5",
            coinCost > 0 && "pr-3"
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              {coinCost > 0 && (
                <span className="flex items-center gap-0.5 text-xs">
                  <span className="opacity-70">·</span>
                  {coinCost}
                  <Coins className="h-3 w-3" />
                </span>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Library picker dialog */}
      {isModel && modelId && (
        <LibraryPicker
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onSelect={handleLibrarySelect}
          modelId={modelId}
        />
      )}
    </div>
  );
}
