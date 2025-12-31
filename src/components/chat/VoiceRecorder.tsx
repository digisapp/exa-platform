"use client";

import { useRef, useEffect, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, X, Send, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
  uploading?: boolean;
}

type RecorderState = {
  status: "starting" | "recording" | "stopped";
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
};

type RecorderAction =
  | { type: "START_RECORDING" }
  | { type: "STOP_RECORDING"; audioBlob: Blob; audioUrl: string }
  | { type: "TICK" }
  | { type: "ERROR" };

function recorderReducer(state: RecorderState, action: RecorderAction): RecorderState {
  switch (action.type) {
    case "START_RECORDING":
      return { ...state, status: "recording" };
    case "STOP_RECORDING":
      return {
        ...state,
        status: "stopped",
        audioBlob: action.audioBlob,
        audioUrl: action.audioUrl,
      };
    case "TICK":
      return { ...state, recordingTime: state.recordingTime + 1 };
    case "ERROR":
      return state;
    default:
      return state;
  }
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  uploading = false,
}: VoiceRecorderProps) {
  const [state, dispatch] = useReducer(recorderReducer, {
    status: "starting",
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          stream.getTracks().forEach((track) => track.stop());
          if (mountedRef.current) {
            dispatch({ type: "STOP_RECORDING", audioBlob: blob, audioUrl: url });
          }
        };

        mediaRecorder.start();
        if (mountedRef.current) {
          dispatch({ type: "START_RECORDING" });

          timerRef.current = setInterval(() => {
            if (mountedRef.current) {
              dispatch({ type: "TICK" });
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error accessing microphone:", error);
        if (mountedRef.current) {
          onCancel();
        }
      }
    };

    initRecording();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup audioUrl on unmount
  useEffect(() => {
    const url = state.audioUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.audioUrl]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSend = () => {
    if (state.audioBlob) {
      onRecordingComplete(state.audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isRecording = state.status === "recording";
  const isStarting = state.status === "starting";
  const isStopped = state.status === "stopped";

  return (
    <div className="flex items-center gap-3 p-4 border-t bg-background">
      {/* Cancel button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onCancel}
        disabled={uploading}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Recording indicator / Audio preview */}
      <div className="flex-1 flex items-center gap-3">
        {isRecording ? (
          <>
            {/* Pulsing mic indicator */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Mic className="h-5 w-5 text-red-500" />
              </div>
              <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            </div>

            {/* Timer */}
            <div className="flex-1">
              <p className="text-sm font-medium">Recording...</p>
              <p className="text-xs text-muted-foreground">{formatTime(state.recordingTime)}</p>
            </div>
          </>
        ) : isStopped && state.audioUrl ? (
          <>
            {/* Audio preview */}
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Mic className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <audio src={state.audioUrl} controls className="h-8 w-full max-w-[200px]" />
            </div>
          </>
        ) : isStarting ? (
          <div className="flex-1 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Starting...</span>
          </div>
        ) : null}
      </div>

      {/* Stop / Send button */}
      {isRecording ? (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={stopRecording}
          className="shrink-0"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : isStopped && state.audioBlob ? (
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={uploading}
          className="shrink-0 bg-gradient-to-r from-pink-500 to-violet-500"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
