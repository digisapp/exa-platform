"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  url?: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const handleShare = async () => {
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (error) {
        // User cancelled or error - silently ignore
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  return (
    <button
      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      onClick={handleShare}
      title="Share"
    >
      <Share2 className="h-4 w-4 text-white/70" />
    </button>
  );
}
