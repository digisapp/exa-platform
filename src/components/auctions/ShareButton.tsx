"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async () => {
    // Use native Web Share API if available (mobile — can share to Instagram Stories, WhatsApp, etc.)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out this listing on EXA: ${title}`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // User cancelled share — don't fall through to clipboard
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied! Paste it in your Instagram story or DMs.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <button
      onClick={handleShare}
      className={
        className ??
        "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 transition-all shadow-lg shadow-pink-500/20 active:scale-95"
      }
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share
        </>
      )}
    </button>
  );
}
