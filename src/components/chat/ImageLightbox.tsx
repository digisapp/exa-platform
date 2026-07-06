"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "Image", isOpen, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Active pointers (mouse/touch/pen) for pointer-event based pan + pinch
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  // Reset zoom and position when opening
  useEffect(() => {
    if (isOpen) {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      });
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(z + 0.5, 5));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(z - 0.5, 0.5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.5, 0.5));
  }, []);

  const handleDownload = useCallback(async () => {
    let url: string | null = null;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Fallback: open in new tab
      window.open(src, "_blank");
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }, [src]);

  // Pointer events cover mouse AND touch, so a zoomed image can be panned on
  // iPhone. Two simultaneous pointers drive a basic pinch-zoom.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = Array.from(pointersRef.current.values());
    if (points.length === 2) {
      // Second finger down: switch from panning to pinching
      setIsDragging(false);
      pinchStartRef.current = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        zoom,
      };
    } else if (points.length === 1 && zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = Array.from(pointersRef.current.values());
    if (points.length >= 2 && pinchStartRef.current) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const { distance: startDistance, zoom: startZoom } = pinchStartRef.current;
      if (startDistance > 0) {
        setZoom(Math.max(0.5, Math.min(5, startZoom * (distance / startDistance))));
      }
    } else if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoom((z) => Math.max(0.5, Math.min(5, z + delta)));
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Controls */}
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-center gap-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="text-white hover:bg-white/20"
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        <span className="text-white text-sm min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="text-white hover:bg-white/20"
          disabled={zoom >= 5}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="text-white hover:bg-white/20"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Image */}
      <div
        className={cn(
          "max-w-[90vw] max-h-[90vh] overflow-hidden touch-none",
          zoom > 1 ? "cursor-grab" : "cursor-zoom-in",
          isDragging && "cursor-grabbing"
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          className="max-w-full max-h-[90vh] object-contain select-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
          onClick={(e) => {
            if (!isDragging && zoom === 1) {
              handleZoomIn();
            }
            e.stopPropagation();
          }}
          draggable={false}
        />
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Pinch or scroll to zoom • Drag to pan • ESC to close
      </div>
    </div>
  );
}
