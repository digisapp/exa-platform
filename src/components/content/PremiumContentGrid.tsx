"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PremiumContentCard } from "./PremiumContentCard";
import { Lock, Loader2 } from "lucide-react";

interface PremiumContent {
  id: string;
  title?: string | null;
  description?: string | null;
  media_type: string;
  preview_url?: string | null;
  coin_price: number;
  isUnlocked: boolean;
  mediaUrl?: string | null;
}

interface PremiumContentGridProps {
  modelId: string;
  initialCoinBalance: number;
  isOwner?: boolean;
  /** Deep-linked content_items.id — scrolled to and briefly ring-highlighted */
  highlightId?: string;
}

export function PremiumContentGrid({
  modelId,
  initialCoinBalance,
  isOwner = false,
  highlightId,
}: PremiumContentGridProps) {
  const [content, setContent] = useState<PremiumContent[]>([]);
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Once content is in, scroll the linked card into view and pulse a ring on
  // it so the visitor knows which item the share link pointed at.
  useEffect(() => {
    if (loading || !highlightId) return;
    if (!content.some((c) => c.id === highlightId)) return;
    setHighlighted(highlightId);
    const scrollT = setTimeout(
      () => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      100,
    );
    const clearT = setTimeout(() => setHighlighted(null), 3500);
    return () => {
      clearTimeout(scrollT);
      clearTimeout(clearT);
    };
  }, [loading, highlightId, content]);

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch(`/api/content?modelId=${modelId}`);
        const data = await response.json();

        if (response.ok) {
          setContent(data.content || []);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [modelId]);

  const handleUnlock = (contentId: string, newBalance: number) => {
    setCoinBalance(newBalance);
    setContent((prev) =>
      prev.map((item) =>
        item.id === contentId ? { ...item, isUnlocked: true } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No content yet</p>
      </div>
    );
  }

  // Separate videos and photos for better layout
  const videos = content.filter(item => item.media_type === "video");
  const photos = content.filter(item => item.media_type !== "video");

  return (
    <div className="space-y-4">
      {/* Videos - 2 columns: wider cards give autoplay previews room */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map((item) => (
            <div
              key={item.id}
              ref={item.id === highlighted ? highlightRef : undefined}
              className={cn(
                "rounded-xl transition-shadow duration-500",
                item.id === highlighted && "ring-2 ring-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.5)]",
              )}
            >
              <PremiumContentCard
                content={item}
                coinBalance={coinBalance}
                onUnlock={handleUnlock}
                isOwner={isOwner}
              />
            </div>
          ))}
        </div>
      )}

      {/* Photos - 3 columns */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((item) => (
            <div
              key={item.id}
              ref={item.id === highlighted ? highlightRef : undefined}
              className={cn(
                "rounded-xl transition-shadow duration-500",
                item.id === highlighted && "ring-2 ring-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.5)]",
              )}
            >
              <PremiumContentCard
                content={item}
                coinBalance={coinBalance}
                onUnlock={handleUnlock}
                isOwner={isOwner}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
