"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { Pin, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableConversationItemProps {
  children: ReactNode;
  isPinned?: boolean;
  isArchived?: boolean;
  onPin: () => void;
  onArchive: () => void;
}

const SWIPE_THRESHOLD = 70;

export function SwipeableConversationItem({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isPinned,
  isArchived,
  onPin,
  onArchive,
}: SwipeableConversationItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isHorizontalRef = useRef<boolean | null>(null);
  const translateXRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
    isHorizontalRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;

    // Determine direction on first significant movement
    if (isHorizontalRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
        if (!isHorizontalRef.current) {
          isDraggingRef.current = false;
          setIsDragging(false);
          return;
        }
      } else {
        return;
      }
    }

    if (!isHorizontalRef.current) return;

    // Clamp: right swipe reveals left actions (pin), left swipe reveals right actions (archive)
    const clamped = Math.max(-120, Math.min(120, deltaX));
    translateXRef.current = clamped;
    setTranslateX(clamped);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    isHorizontalRef.current = null;

    // Use ref for the latest translateX value (avoids stale closure)
    const currentX = translateXRef.current;
    if (currentX > SWIPE_THRESHOLD) {
      onPin();
    } else if (currentX < -SWIPE_THRESHOLD) {
      onArchive();
    }

    translateXRef.current = 0;
    setTranslateX(0);
  }, [onPin, onArchive]);

  const leftProgress = Math.min(1, Math.max(0, translateX / SWIPE_THRESHOLD));
  const rightProgress = Math.min(1, Math.max(0, -translateX / SWIPE_THRESHOLD));

  return (
    <div className="relative overflow-hidden rounded-xl lg:overflow-visible">
      {/* Left action (pin) — revealed on swipe right */}
      {translateX > 0 && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-center rounded-l-xl transition-colors",
            leftProgress >= 1 ? "bg-pink-500" : "bg-pink-500/40"
          )}
          style={{ width: Math.abs(translateX) }}
        >
          <Pin className={cn(
            "h-5 w-5 -rotate-45 transition-transform",
            leftProgress >= 1 ? "text-white scale-110" : "text-white/70"
          )} />
        </div>
      )}

      {/* Right action (archive) — revealed on swipe left */}
      {translateX < 0 && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl transition-colors",
            rightProgress >= 1 ? "bg-amber-500" : "bg-amber-500/40"
          )}
          style={{ width: Math.abs(translateX) }}
        >
          {isArchived ? (
            <ArchiveRestore className={cn(
              "h-5 w-5 transition-transform",
              rightProgress >= 1 ? "text-white scale-110" : "text-white/70"
            )} />
          ) : (
            <Archive className={cn(
              "h-5 w-5 transition-transform",
              rightProgress >= 1 ? "text-white scale-110" : "text-white/70"
            )} />
          )}
        </div>
      )}

      {/* Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
