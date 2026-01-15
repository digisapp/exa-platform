"use client";

import { useState, useEffect } from "react";
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
}

export function PremiumContentGrid({
  modelId,
  initialCoinBalance,
  isOwner = false,
}: PremiumContentGridProps) {
  const [content, setContent] = useState<PremiumContent[]>([]);
  const [coinBalance, setCoinBalance] = useState(initialCoinBalance);
  const [loading, setLoading] = useState(true);

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
      {/* Videos - 2 columns for landscape aspect ratio */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map((item) => (
            <PremiumContentCard
              key={item.id}
              content={item}
              coinBalance={coinBalance}
              onUnlock={handleUnlock}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}

      {/* Photos - 3 columns for portrait aspect ratio */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((item) => (
            <PremiumContentCard
              key={item.id}
              content={item}
              coinBalance={coinBalance}
              onUnlock={handleUnlock}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}
    </div>
  );
}
