"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, VideoOff } from "lucide-react";

interface PreCallDeviceCheckProps {
  callType: "video" | "voice";
  onReadyChange: (ready: boolean) => void;
}

// Live camera preview + mic level meter shown before a call starts, so
// permission problems surface here instead of after coins are on the line.
export function PreCallDeviceCheck({ callType, onReadyChange }: PreCallDeviceCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onReadyChangeRef = useRef(onReadyChange);
  useEffect(() => { onReadyChangeRef.current = onReadyChange; }, [onReadyChange]);

  const [error, setError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let rafId = 0;
    let cancelled = false;

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (callType === "video" && videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(1, avg / 96));
          rafId = requestAnimationFrame(tick);
        };
        tick();

        setError(null);
        onReadyChangeRef.current(true);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(
            callType === "video"
              ? "Camera and microphone access is blocked. Allow access in your browser's site settings, then try again."
              : "Microphone access is blocked. Allow access in your browser's site settings, then try again."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError(
            callType === "video"
              ? "No camera or microphone found. Connect one and try again."
              : "No microphone found. Connect one and try again."
          );
        } else {
          setError("Couldn't access your devices. Close other apps using them and try again.");
        }
        onReadyChangeRef.current(false);
      }
    }

    onReadyChangeRef.current(false);
    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, [callType]);

  if (error) {
    return (
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
        <VideoOff className="h-5 w-5 mx-auto mb-1 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {callType === "video" && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video rounded-lg bg-black object-cover scale-x-[-1]"
        />
      )}
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-[width] duration-75"
            style={{ width: `${Math.round(micLevel * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
