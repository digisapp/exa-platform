"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Coins, X, Video, Mic, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttachmentMenu } from "./AttachmentMenu";
import { VoiceRecorder } from "./VoiceRecorder";
import { LibraryPicker } from "./LibraryPicker";

const DRAFT_PREFIX = "chat_draft_";

interface MessageInputProps {
  onSend: (content: string, mediaUrl?: string, mediaType?: string) => Promise<void>;
  disabled?: boolean;
  coinCost?: number;
  coinBalance?: number;
  placeholder?: string;
  isModel?: boolean;
  modelId?: string;
  conversationId?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  coinCost = 0,
  coinBalance = 0,
  placeholder = "Type a message...",
  isModel = false,
  modelId,
  conversationId,
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
  const draftKey = conversationId ? `${DRAFT_PREFIX}${conversationId}` : null;

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!draftKey) return;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setContent(savedDraft);
      }
    } catch (error) {
      // localStorage might be unavailable
    }
  }, [draftKey]);

  // Save draft to localStorage (debounced)
  useEffect(() => {
    if (!draftKey) return;

    const timeoutId = setTimeout(() => {
      try {
        if (content.trim()) {
          localStorage.setItem(draftKey, content);
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch (error) {
        // localStorage might be unavailable or full
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [content, draftKey]);

  // Clear draft helper
  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      // Ignore
    }
  }, [draftKey]);

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
      clearDraft(); // Clear draft on successful send
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

  // Helper to safely parse JSON response
  const safeJsonParse = async (response: Response) => {
    try {
      return await response.json();
    } catch {
      if (response.status === 413) {
        throw new Error("File too large for upload");
      }
      throw new Error("Server error - please try again");
    }
  };

  // Upload via signed URL for large files (bypasses Vercel's 4.5MB limit)
  const uploadViaSigned = async (file: File): Promise<string> => {
    // Step 1: Get signed URL
    const signedResponse = await fetch("/api/upload/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    const signedData = await safeJsonParse(signedResponse);
    if (!signedResponse.ok) throw new Error(signedData.error || "Failed to get upload URL");

    // Step 2: Upload directly to Supabase Storage
    const uploadResponse = await fetch(signedData.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResponse.ok) throw new Error("Upload to storage failed");

    // Step 3: Complete the upload
    const completeResponse = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: signedData.storagePath,
        bucket: signedData.bucket,
        uploadMeta: signedData.uploadMeta,
      }),
    });

    const completeData = await safeJsonParse(completeResponse);
    if (!completeResponse.ok) throw new Error(completeData.error || "Failed to complete upload");

    return completeData.url;
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = async (file: File, type: "photo" | "video" | "audio") => {
    // Validate file size (50MB for video, 10MB for audio, 5MB for photos)
    const maxSize = type === "video" ? 50 : type === "audio" ? 10 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      const typeLabel = type === "video" ? "Video" : type === "audio" ? "Voice message" : "Photo";
      toast.error(
        `${typeLabel} too large`,
        {
          description: `Your file is ${formatFileSize(file.size)}. Maximum size is ${maxSize}MB.`,
          duration: 5000,
        }
      );
      return;
    }

    setUploading(true);
    const preview = type !== "audio" ? URL.createObjectURL(file) : undefined;

    try {
      let uploadedUrl: string;
      const VERCEL_LIMIT = 4 * 1024 * 1024; // 4MB (conservative)
      const isVideo = type === "video";
      const isAudio = type === "audio";
      const isLargeFile = file.size > VERCEL_LIMIT;

      // Videos, audio, and large files use signed URL approach
      // (signed URL bypasses Vercel's body size limit by uploading direct to Supabase)
      if (isVideo || isAudio || isLargeFile) {
        uploadedUrl = await uploadViaSigned(file);
      } else {
        // Small images/audio can use direct upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "message");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await safeJsonParse(response);

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        uploadedUrl = data.url;
      }

      setAttachedMedia({
        url: uploadedUrl,
        type: file.type,
        preview,
      });

      const typeLabel = type === "video" ? "Video" : type === "audio" ? "Voice message" : "Photo";
      toast.success(`${typeLabel} attached`);
    } catch (error) {
      const typeLabel = type === "video" ? "video" : type === "audio" ? "voice message" : "photo";
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Provide user-friendly error messages
      if (errorMessage.includes("too large") || errorMessage.includes("413")) {
        toast.error("File too large", {
          description: `Your ${typeLabel} exceeds the size limit. Please try a smaller file.`,
          duration: 5000,
        });
      } else if (errorMessage.includes("Invalid file type")) {
        toast.error("Unsupported format", {
          description: `This ${typeLabel} format isn't supported. Try MP4 for videos or JPG/PNG for photos.`,
          duration: 5000,
        });
      } else if (errorMessage.includes("storage failed")) {
        toast.error("Upload failed", {
          description: "We couldn't save your file. Please check your connection and try again.",
          duration: 5000,
        });
      } else {
        toast.error("Upload failed", {
          description: errorMessage,
          duration: 5000,
        });
      }
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
