"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { BuyCoinsModal } from "@/components/coins/BuyCoinsModal";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Coins, X, Video, Mic, Camera, Lock, Reply, Gift, Sticker as StickerIcon, ChevronRight } from "lucide-react";
import { StickerPicker, type PickedSticker } from "@/components/live-wall/StickerPicker";
import type { Message } from "@/types/database";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AttachmentMenu } from "./AttachmentMenu";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "./VoiceRecorder";
import { LibraryPicker } from "./LibraryPicker";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { CHAT_MEDIA_MAX_COINS, CHAT_MEDIA_MIN_COINS } from "@/lib/coin-config";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { detectInPersonRequest, IN_PERSON_WARNING_COPY } from "@/lib/in-person-request";
import { trackEvent } from "@/lib/analytics-client";

const DRAFT_PREFIX = "chat_draft_";

interface MessageInputProps {
  onSend: (
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    mediaPrice?: number,
    mediaPreviewUrl?: string,
  ) => Promise<void>;
  disabled?: boolean;
  coinCost?: number;
  coinBalance?: number;
  placeholder?: string;
  isModel?: boolean;
  /** Admins coordinate real-world gigs in DMs — exempt from the virtual-first block. */
  isAdmin?: boolean;
  modelId?: string;
  conversationId?: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  /** When set, shows a Gift button in the composer that opens the tip dialog (fan → model chats) */
  onTipClick?: () => void;
}

export function MessageInput({
  onSend,
  disabled = false,
  coinCost = 0,
  coinBalance = 0,
  placeholder = "Message…",
  isModel = false,
  isAdmin = false,
  modelId,
  conversationId,
  onTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
  onTipClick,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // `url` is what the message carries as media_url: a chat-media storage path
  // for fresh uploads, an http URL for library attachments (see
  // src/lib/chat-media.ts). `previewUrl` is a signed display URL for paths;
  // `preview` is a local blob URL while one exists.
  const [attachedMedia, setAttachedMedia] = useState<{
    url: string;
    type: string;
    preview?: string;
    previewUrl?: string;
  } | null>(null);
  const [mediaPrice, setMediaPrice] = useState<number | null>(null);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [virtualFirstWarningOpen, setVirtualFirstWarningOpen] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const stickerBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = conversationId ? `${DRAFT_PREFIX}${conversationId}` : null;

  const isStickerAttachment = attachedMedia?.type === "image/sticker";

  // Auto-grow fallback: iOS Safari doesn't support CSS `field-sizing`, which
  // the shared Textarea relies on. Cap matches the existing max-h-32 (128px).
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [content]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!draftKey) return;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setContent(savedDraft);
      }
    } catch {
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
      } catch {
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
    } catch {
      // Ignore
    }
  }, [draftKey]);

  const canSend = (content.trim() || attachedMedia) && !disabled && !sending && !uploading;
  const hasEnoughCoins = coinCost === 0 || coinBalance >= coinCost;

  // Mobile only: while composing, the aux buttons fold behind a chevron so the
  // textarea gets the row width (Messenger pattern). sm+ always shows the full
  // row via responsive classes, so this state has no effect on desktop.
  const composerCollapsed = !manuallyExpanded && (inputFocused || content.length > 0);

  const performSend = async () => {
    // Haptic feedback on send
    hapticFeedback("light");

    const messageContent = content.trim();
    const mediaUrl = attachedMedia?.url;
    const mediaType = attachedMedia?.type;
    const mediaPreview = attachedMedia?.preview;
    const mediaPreviewUrl = attachedMedia?.previewUrl;
    const currentMediaPrice = mediaPrice ?? undefined;

    // Revoke blob URL to prevent memory leak
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setContent("");
    setAttachedMedia(null);
    setMediaPrice(null);
    setShowPriceInput(false);
    setSending(true);

    // Stop typing indicator when sending
    onStopTyping?.();

    try {
      await onSend(messageContent, mediaUrl, mediaType, currentMediaPrice, mediaPreviewUrl);
      clearDraft(); // Clear draft on successful send
    } catch {
      hapticFeedback("error");
      setContent(messageContent);
      if (mediaUrl && mediaType) {
        // Blob preview was already revoked; previewUrl still displays paths.
        setAttachedMedia({ url: mediaUrl, type: mediaType, previewUrl: mediaPreviewUrl });
      }
      if (currentMediaPrice) {
        setMediaPrice(currentMediaPrice);
        setShowPriceInput(true);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleSend = () => {
    if (!canSend || !hasEnoughCoins) return;

    // Virtual-first hard block: fans/brands can't send in-person meetup or
    // contact-exchange requests — the dialog is a stop, not a nudge (the
    // server rejects these too). Models/admins coordinate real-life shoots.
    if (!isModel && !isAdmin) {
      const detection = detectInPersonRequest(content);
      if (detection.matched) {
        // Composer blocks never reach the server, so log them here or the
        // admin audit trail / repeat-offender flag only sees API attempts.
        // user_id is attached server-side from the session.
        trackEvent("message_blocked_in_person", {
          metadata: {
            context: "composer",
            phrase: detection.phrase,
            content: content.slice(0, 300),
          },
        });
        setVirtualFirstWarningOpen(true);
        return;
      }
    }

    performSend();
  };

  // Handle content change with typing indicator
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Typing re-collapses a chevron-expanded action row
    setManuallyExpanded(false);
    // Broadcast typing when user types
    if (e.target.value.trim()) {
      onTyping?.();
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

  // Upload chat media via signed URL to the PRIVATE chat-media bucket
  // (also bypasses Vercel's 4.5MB limit). Returns the storage path (sent as
  // the message's media_url) and a signed previewUrl for local display.
  const uploadViaSigned = async (
    file: File
  ): Promise<{ path: string; previewUrl: string }> => {
    // Step 1: Get signed URL
    const signedResponse = await fetch("/api/upload/chat", {
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

    // Step 2: Upload directly to Supabase Storage with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedData.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Scale to 10-90% (10% for getting signed URL, 90% for upload, 10% for completing)
          setUploadProgress(Math.round(10 + (e.loaded / e.total) * 80));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Upload to storage failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Upload to storage failed"));
      xhr.send(file);
    });

    // Step 3: Complete the upload
    const completeResponse = await fetch("/api/upload/chat/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: signedData.storagePath,
        uploadMeta: signedData.uploadMeta,
      }),
    });

    const completeData = await safeJsonParse(completeResponse);
    if (!completeResponse.ok) throw new Error(completeData.error || "Failed to complete upload");

    return { path: completeData.path, previewUrl: completeData.previewUrl };
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
    setUploadProgress(0);
    const preview = type !== "audio" ? URL.createObjectURL(file) : undefined;

    try {
      // Everything goes through the chat-media signed-URL pipeline: the old
      // small-file path (/api/upload) landed chat photos in the public
      // portfolio bucket. The message carries the storage path; previewUrl is
      // a signed display URL.
      const { path, previewUrl } = await uploadViaSigned(file);

      setAttachedMedia({
        url: path,
        type: file.type,
        preview,
        previewUrl,
      });

      const typeLabel = type === "video" ? "Video" : type === "audio" ? "Voice message" : "Photo";
      toast.success(`${typeLabel} attached`);
    } catch (err) {
      const typeLabel = type === "video" ? "video" : type === "audio" ? "voice message" : "photo";
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

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
      setUploadProgress(0);
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

  const handleStickerSelect = (s: PickedSticker) => {
    // Stickers are free EXA-library attachments: public URL, never priced.
    setAttachedMedia({ url: s.url, type: "image/sticker", previewUrl: s.url });
    setMediaPrice(null);
    setShowPriceInput(false);
    setShowStickers(false);
  };

  const handleLibrarySelect = (item: { url: string; type: "photo" | "video"; coinPrice?: number }) => {
    setAttachedMedia({
      url: item.url,
      type: item.type === "video" ? "video/mp4" : "image/jpeg",
      preview: item.url,
    });
    // Carry the library item's PPV price onto the attachment so it's charged
    // when sent. Without this, a priced library item was silently attached for
    // free.
    if (item.coinPrice && item.coinPrice > 0) {
      setMediaPrice(item.coinPrice);
      setShowPriceInput(true);
    } else {
      setMediaPrice(null);
      setShowPriceInput(false);
    }
  };

  const removeAttachment = () => {
    if (attachedMedia?.preview) {
      URL.revokeObjectURL(attachedMedia.preview);
    }
    setAttachedMedia(null);
    setMediaPrice(null);
    setShowPriceInput(false);
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
    <div className="border-t border-white/10 bg-white/[0.03] backdrop-blur-sm px-3 pt-3 sm:px-4 sm:pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Low-balance warning — the send button already shows the per-message
          cost, so the banner only appears when the fan can't afford to send */}
      {coinCost > 0 && !hasEnoughCoins && (
        <div className="flex items-center gap-2 text-sm mb-2 px-3 py-2 rounded-xl border text-rose-300 bg-rose-500/10 border-rose-500/30">
          <Coins className="h-4 w-4 text-amber-400" />
          <span>Not enough coins — need {coinCost}, you have {coinBalance}</span>
          <button
            type="button"
            onClick={() => setBuyCoinsOpen(true)}
            className="ml-auto text-xs font-semibold text-pink-300 hover:text-pink-200 whitespace-nowrap"
          >
            Get coins →
          </button>
        </div>
      )}
      <BuyCoinsModal isOpen={buyCoinsOpen} onClose={() => setBuyCoinsOpen(false)} />

      {/* Reply-to bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2.5 rounded-xl bg-pink-500/10 border-l-[3px] border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.15)]">
          <Reply className="h-4 w-4 text-pink-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-pink-300">Replying</p>
            <p className="text-sm text-white/70 truncate">
              {replyingTo.content ||
                (replyingTo.media_type === "image/sticker"
                  ? "Sticker"
                  : replyingTo.media_url
                    ? "Photo/Video"
                    : "Message")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 rounded-full text-white/60 hover:bg-rose-500/15 hover:text-rose-300"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Attached media preview */}
      {attachedMedia && (
        <div className="mb-3 relative inline-block">
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            {attachedMedia.type.startsWith("video") ? (
              <div className="relative">
                <video
                  src={attachedMedia.preview || attachedMedia.previewUrl || attachedMedia.url}
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
            ) : isStickerAttachment ? (
              <div className="relative p-1">
                <Image
                  src={attachedMedia.url}
                  alt="Sticker"
                  width={96}
                  height={96}
                  className="h-24 w-24 object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="relative">
                <Image
                  src={attachedMedia.preview || attachedMedia.previewUrl || attachedMedia.url}
                  alt="Attachment"
                  width={200}
                  height={96}
                  className="h-24 max-w-[200px] object-cover"
                  unoptimized
                />
                <div className="absolute top-1 left-1 p-1 rounded bg-black/60">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={removeAttachment}
            className="tap-target absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow-lg hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && uploadProgress > 0 && (
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
            />
          </div>
        </div>
      )}

      {/* PPV price toggle for models with media attached (stickers are never priced) */}
      {isModel && attachedMedia && !attachedMedia.type.startsWith("audio") && !isStickerAttachment && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => {
              if (showPriceInput) {
                setShowPriceInput(false);
                setMediaPrice(null);
              } else {
                setShowPriceInput(true);
                setMediaPrice(CHAT_MEDIA_MIN_COINS);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              showPriceInput
                ? "bg-pink-500/20 text-pink-200 border border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10"
            )}
          >
            <Lock className="h-3 w-3" />
            {showPriceInput ? "Price Set" : "Set Price"}
          </button>
          {showPriceInput && (
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <input
                type="number"
                min={CHAT_MEDIA_MIN_COINS}
                max={CHAT_MEDIA_MAX_COINS}
                value={mediaPrice ?? CHAT_MEDIA_MIN_COINS}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setMediaPrice(
                    isNaN(val)
                      ? null
                      : Math.max(CHAT_MEDIA_MIN_COINS, Math.min(CHAT_MEDIA_MAX_COINS, val))
                  );
                }}
                className="w-20 h-7 px-2 text-xs rounded-lg border border-pink-500/30 bg-white/5 text-white focus:border-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                placeholder={`${CHAT_MEDIA_MIN_COINS}`}
              />
              <span className="text-xs text-white/50">coins</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Collapsed action row (mobile only): one chevron re-expands the buttons */}
        {composerCollapsed && (
          <button
            type="button"
            onPointerDown={(e) => {
              // Expand on pointerdown and swallow the default so the textarea
              // keeps focus and the keyboard stays open
              e.preventDefault();
              setManuallyExpanded(true);
            }}
            aria-label="Show message actions"
            className="sm:hidden shrink-0 h-11 w-11 flex items-center justify-center rounded-2xl text-white/60 hover:text-pink-200 hover:bg-pink-500/10 active:scale-95 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Attachment menu (+ button) */}
        <div className={cn("shrink-0", composerCollapsed && "hidden sm:block")}>
          <AttachmentMenu
            onPhotoSelect={handlePhotoSelect}
            onVideoSelect={handleVideoSelect}
            onVoiceRecord={handleVoiceRecord}
            onLibraryOpen={() => setLibraryOpen(true)}
            uploading={uploading}
            disabled={disabled || sending}
            isModel={isModel}
          />
        </div>

        {/* Super Tip (fan → model only) */}
        {onTipClick && (
          <button
            type="button"
            onClick={onTipClick}
            disabled={disabled}
            title="Send a tip or gift"
            aria-label="Send a tip or gift"
            className={cn(
              "shrink-0 h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl text-pink-300 hover:text-pink-200 hover:bg-pink-500/10 active:scale-95 transition-all disabled:opacity-40",
              composerCollapsed && "hidden sm:flex"
            )}
          >
            <Gift className="h-5 w-5" />
          </button>
        )}

        {/* EXA sticker picker */}
        <button
          type="button"
          ref={stickerBtnRef}
          onClick={() => setShowStickers((prev) => !prev)}
          disabled={disabled || sending || uploading}
          title="EXA stickers"
          aria-label="EXA stickers"
          className={cn(
            "shrink-0 h-11 w-11 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl active:scale-95 transition-all disabled:opacity-40",
            showStickers
              ? "text-pink-300 bg-pink-500/10"
              : "text-white/60 hover:text-pink-200 hover:bg-pink-500/10",
            composerCollapsed && "hidden sm:flex"
          )}
        >
          <StickerIcon className="h-5 w-5" />
        </button>
        {showStickers && createPortal(
          <StickerPicker
            onSelect={handleStickerSelect}
            onClose={() => setShowStickers(false)}
          />,
          document.body
        )}

        {/* Emoji picker (desktop only) */}
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            const textarea = textareaRef.current;
            if (textarea) {
              const start = textarea.selectionStart ?? content.length;
              const end = textarea.selectionEnd ?? content.length;
              const newContent = content.slice(0, start) + emoji + content.slice(end);
              setContent(newContent);
              // Restore cursor position after the inserted emoji
              requestAnimationFrame(() => {
                textarea.focus();
                const newPos = start + emoji.length;
                textarea.setSelectionRange(newPos, newPos);
              });
            } else {
              setContent((prev) => prev + emoji);
            }
          }}
          disabled={disabled || sending || uploading}
        />

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={placeholder}
          disabled={disabled || sending || uploading}
          maxLength={5000}
          className="min-h-[44px] sm:min-h-[48px] max-h-32 resize-none text-base md:text-[15px] rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:border-pink-400/60 focus-visible:ring-pink-500/20 focus-visible:shadow-[0_0_16px_rgba(236,72,153,0.25)]"
          rows={1}
        />

        {/* Send button with coin cost */}
        <Button
          onClick={handleSend}
          disabled={!canSend || !hasEnoughCoins}
          className={cn(
            "relative shrink-0 h-11 sm:h-12 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 gap-1.5 rounded-2xl shadow-[0_0_24px_rgba(236,72,153,0.45)] hover:shadow-[0_0_32px_rgba(236,72,153,0.65)] active:scale-[0.98] transition-all border-0 disabled:opacity-40 disabled:shadow-none",
            coinCost > 0 ? "w-11 px-0 sm:w-auto sm:px-4" : "w-11 sm:w-12"
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-5 w-5" />
              {coinCost > 0 && (
                <span className="hidden sm:flex items-center gap-0.5 text-sm font-semibold">
                  {coinCost}
                  <Coins className="h-3.5 w-3.5" />
                </span>
              )}
            </>
          )}
          {/* Mobile: per-message cost as a corner badge so the button stays square */}
          {coinCost > 0 && (
            <span className="sm:hidden absolute -top-2 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#120a24] border border-amber-400/40 text-amber-300 shadow-md">
              {coinCost}
              <Coins className="h-2.5 w-2.5" />
            </span>
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

      {/* Virtual-first hard block — in-person meetup / contact-exchange
          requests never send; the fan keeps their draft to rephrase */}
      <AlertDialog open={virtualFirstWarningOpen} onOpenChange={setVirtualFirstWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{IN_PERSON_WARNING_COPY.title}</AlertDialogTitle>
            <AlertDialogDescription>{IN_PERSON_WARNING_COPY.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{IN_PERSON_WARNING_COPY.dismiss}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
