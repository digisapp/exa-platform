"use client";

import { useState, useEffect, memo } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string;
  url: string;
}

// In-memory cache shared across all instances
const previewCache = new Map<string, LinkPreviewData | null>();

interface LinkPreviewProps {
  url: string;
  isOwn: boolean;
}

export const LinkPreview = memo(function LinkPreview({ url, isOwn }: LinkPreviewProps) {
  const [data, setData] = useState<LinkPreviewData | null>(previewCache.get(url) ?? null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) {
      const cached = previewCache.get(url);
      setData(cached ?? null);
      setLoading(false);
      if (!cached) setError(true);
      return;
    }

    let cancelled = false;

    async function fetchPreview() {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error();
        const preview = await res.json();
        if (!cancelled) {
          previewCache.set(url, preview);
          setData(preview);
        }
      } catch {
        if (!cancelled) {
          previewCache.set(url, null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPreview();
    return () => { cancelled = true; };
  }, [url]);

  if (error || loading) return null;
  if (!data || (!data.title && !data.description)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block mt-2 rounded-lg overflow-hidden border transition-opacity hover:opacity-90",
        isOwn ? "border-white/20 bg-white/10" : "border-border bg-background/60"
      )}
    >
      {data.image && !imgError && (
        <div className="relative w-full h-32 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt={data.title || "Link preview"}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="p-2.5">
        <div className={cn(
          "flex items-center gap-1 text-[10px] mb-0.5",
          isOwn ? "text-white/50" : "text-muted-foreground"
        )}>
          <ExternalLink className="h-2.5 w-2.5" />
          {data.siteName}
        </div>
        {data.title && (
          <p className={cn(
            "text-xs font-medium line-clamp-2",
            isOwn ? "text-white" : "text-foreground"
          )}>
            {data.title}
          </p>
        )}
        {data.description && (
          <p className={cn(
            "text-[11px] line-clamp-2 mt-0.5",
            isOwn ? "text-white/60" : "text-muted-foreground"
          )}>
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
});
