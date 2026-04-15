"use client";

import { useState, useRef, useCallback } from "react";
import { Send, ImageIcon, X, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveWallMentionPopover } from "./LiveWallMentionPopover";

const EMOJI_GRID = [
  // Smileys
  "😂", "🤣", "😍", "🥰", "😘", "😎", "🤩", "😏",
  "🥺", "😭", "😤", "🤔", "😈", "🤭", "😮", "🙄",
  // Hearts & fire
  "❤️", "🔥", "💯", "✨", "👑", "💕", "💪", "🙌",
  "💖", "🖤", "💜", "❤️‍🔥", "💗", "💝", "🫶", "💞",
  // Reactions
  "👏", "👀", "🎉", "🙏", "💀", "👍", "🤝", "🤷",
  // Miami vibes
  "🌴", "🌊", "💧", "🎥", "🩷", "🪸", "🐚", "🌺",
  "🥂", "🍾", "🪩", "🏆", "👙", "🕶️", "☀️", "🌅",
  // Fun & glam
  "💋", "🌹", "⭐", "🎶", "📸", "💎", "🦋", "🐆",
  "🦩", "🔮", "🌙", "🦁", "🎯", "🫧", "🌈", "🤑",
];

interface Props {
  isLoggedIn: boolean;
  onSend: (content: string, imageUrl?: string, imageType?: string) => Promise<void>;
  onAuthPrompt: () => void;
}

export function LiveWallInput({ isLoggedIn, onSend, onAuthPrompt }: Props) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      onAuthPrompt();
      return;
    }

    const trimmed = value.trim();
    if ((!trimmed && !imagePreview) || isSending) return;

    setIsSending(true);
    try {
      let uploadedUrl: string | undefined;
      let uploadedType: string | undefined;

      // Upload image if attached
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        // Upload to Supabase Storage via a simple fetch
        const ext = imageFile.name.split(".").pop() || "jpg";
        const fileName = `live-wall/${Date.now()}.${ext}`;

        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from("public-uploads")
          .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });

        if (!error && data) {
          const { data: urlData } = supabase.storage
            .from("public-uploads")
            .getPublicUrl(data.path);
          uploadedUrl = urlData.publicUrl;
          uploadedType = "upload";
        }
      } else if (imagePreview && !imageFile) {
        // GIF URL (already a URL)
        uploadedUrl = imagePreview;
        uploadedType = "gif";
      }

      await onSend(trimmed, uploadedUrl, uploadedType);
      setValue("");
      setImagePreview(null);
      setImageFile(null);
      inputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.slice(0, 280);
      setValue(newValue);

      // Detect @mention trigger
      const cursorPos = e.target.selectionStart || newValue.length;
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);

      if (atMatch) {
        setMentionStart(cursorPos - atMatch[0].length);
        setMentionQuery(atMatch[1]);
        setShowMentions(true);
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }
    },
    []
  );

  const handleMentionSelect = useCallback(
    (username: string) => {
      const before = value.slice(0, mentionStart);
      const after = value.slice(
        mentionStart + mentionQuery.length + 1 // +1 for the @
      );
      const newValue = `${before}@${username} ${after}`;
      setValue(newValue);
      setShowMentions(false);
      setMentionQuery("");
      inputRef.current?.focus();
    },
    [value, mentionStart, mentionQuery]
  );

  return (
    <div className="relative border-t border-white/10">
      {/* Image preview */}
      {imagePreview && (
        <div className="px-2 pt-2 flex items-start gap-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              className="h-16 w-auto rounded-lg border border-white/10 object-cover"
            />
            <button
              onClick={() => {
                setImagePreview(null);
                setImageFile(null);
              }}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Mention autocomplete */}
      <LiveWallMentionPopover
        query={mentionQuery}
        onSelect={handleMentionSelect}
        onClose={() => setShowMentions(false)}
        visible={showMentions && isLoggedIn}
      />

      {/* Input row */}
      <div className="flex items-center gap-2.5 p-3">
        {/* Image upload button */}
        {isLoggedIn && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              title="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </>
        )}

        {/* Emoji picker button */}
        {isLoggedIn && (
          <div className="relative">
            <button
              onClick={() => setShowEmojis((prev) => !prev)}
              className={cn(
                "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                showEmojis
                  ? "bg-pink-500/20 text-pink-400"
                  : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
              )}
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>

            {showEmojis && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[320px] rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 p-2.5">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_GRID.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        const newVal = (value + emoji).slice(0, 280);
                        setValue(newVal);
                        setShowEmojis(false);
                        inputRef.current?.focus();
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 hover:scale-110 transition-all text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (showMentions) return; // Let mention popover handle enter/arrows
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onFocus={() => {
            if (!isLoggedIn) {
              onAuthPrompt();
              inputRef.current?.blur();
            }
          }}
          placeholder={isLoggedIn ? "Say something... Use @ to mention" : "Sign in to chat..."}
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40 transition-colors"
          disabled={isSending}
        />
        {value.length > 0 && (
          <span className="text-[10px] text-white/30 tabular-nums">
            {value.length}/280
          </span>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSending || (!value.trim() && !imagePreview)}
          className={cn(
            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
            value.trim() || imagePreview
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:scale-110 shadow-lg shadow-pink-500/25"
              : "bg-white/5 text-white/20"
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
