"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  src: string;
  isOwn?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Custom audio player for voice messages — the native <audio controls>
 * element renders stock browser chrome that clashes with the chat's glass
 * styling. WebM voice recordings often report Infinity duration until they
 * finish playing once, so the duration label and seek bar degrade gracefully.
 */
export function VoiceMessagePlayer({ src, isOwn = false, className }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const readDuration = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      readDuration();
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);

    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("durationchange", readDuration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    return () => {
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("durationchange", readDuration);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      setLoading(true);
      audio.play().catch(() => setLoading(false));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-2xl min-w-[220px] max-w-[280px]",
        isOwn
          ? "bg-white/10"
          : "bg-white/[0.05] border border-white/10 backdrop-blur-sm",
        className
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95",
          "bg-gradient-to-br from-pink-500 to-violet-500 text-white",
          "shadow-[0_0_12px_rgba(236,72,153,0.4)] hover:shadow-[0_0_18px_rgba(236,72,153,0.6)]"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current translate-x-[1px]" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          ref={barRef}
          onClick={handleSeek}
          role="slider"
          aria-label="Voice message progress"
          aria-valuemin={0}
          aria-valuemax={duration ? Math.round(duration) : 0}
          aria-valuenow={Math.round(currentTime)}
          className={cn("h-1.5 rounded-full bg-white/15 overflow-hidden", duration && "cursor-pointer")}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-400 to-violet-400 shadow-[0_0_6px_rgba(236,72,153,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] tabular-nums text-white/50">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : "Voice message"}</span>
        </div>
      </div>
    </div>
  );
}
