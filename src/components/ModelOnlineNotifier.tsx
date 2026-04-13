"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Video } from "lucide-react";
import Image from "next/image";

interface ModelOnlineNotifierProps {
  actorId: string;
}

interface OnlineModel {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string;
  video_call_rate: number | null;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

export function ModelOnlineNotifier({ actorId }: ModelOnlineNotifierProps) {
  const supabase = createClient();
  const router = useRouter();
  // Track which models we've already toasted in this session
  const notifiedRef = useRef<Map<string, number>>(new Map());
  const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const checkOnlineModels = useCallback(async () => {
    const cutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();

    const { data: models } = await supabase
      .from("models")
      .select(
        "id, username, first_name, last_name, profile_photo_url, video_call_rate, last_active_at, user_id"
      )
      .not("profile_photo_url", "is", null)
      .not("username", "is", null)
      .gte("last_active_at", cutoff) as { data: (OnlineModel & { last_active_at: string; user_id: string })[] | null };

    if (!models || models.length === 0) return;

    const now = Date.now();
    let toastIndex = 0;

    for (const model of models) {
      const lastNotified = notifiedRef.current.get(model.id);

      // If we already notified within the last 15 minutes, skip
      if (lastNotified && now - lastNotified < 15 * 60 * 1000) continue;

      notifiedRef.current.set(model.id, now);

      const displayName = model.first_name
        ? `${model.first_name} ${model.last_name || ""}`.trim()
        : model.username;

      const rate = model.video_call_rate;
      const rateText = rate ? `${rate} coins/min` : "";

      // Stagger toasts so they don't all appear at once
      const delay = toastIndex * 1500;
      toastIndex++;

      const timeoutId = setTimeout(() => {
        showModelOnlineToast({
          displayName,
          photoUrl: model.profile_photo_url,
          rateText,
          onCall: () => router.push(`/${model.username}`),
        });
      }, delay);

      pendingTimeoutsRef.current.push(timeoutId);
    }
  }, [supabase, router]);

  useEffect(() => {
    // Initial check after a short delay so the page settles
    const initialTimeout = setTimeout(checkOnlineModels, 3000);
    const interval = setInterval(checkOnlineModels, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      // Clear any pending staggered toasts
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current = [];
    };
  }, [checkOnlineModels]);

  return null;
}

function showModelOnlineToast({
  displayName,
  photoUrl,
  rateText,
  onCall,
}: {
  displayName: string;
  photoUrl: string;
  rateText: string;
  onCall: () => void;
}) {
  toast.custom(
    (t) => (
      <div
        className="relative animate-in slide-in-from-right-full fade-in duration-500 w-full max-w-sm cursor-pointer"
        onClick={() => toast.dismiss(t)}
      >
        {/* Glow */}
        <div className="absolute inset-0 blur-xl bg-gradient-to-r from-green-400/40 via-emerald-500/30 to-cyan-400/40 rounded-2xl scale-105" />

        <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-green-500/30 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-cyan-400" />

          <div className="p-4">
            {/* Online badge */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
                Model Online Now
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Model photo */}
              <div className="relative shrink-0">
                <div className="h-14 w-14 rounded-full ring-2 ring-green-500/60 overflow-hidden">
                  <Image
                    src={photoUrl}
                    alt={displayName}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{displayName}</p>
                <p className="text-sm text-gray-400">is available for a video call</p>
                {rateText && (
                  <p className="text-xs text-emerald-400 mt-0.5">{rateText}</p>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t);
                onCall();
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25"
            >
              <Video className="h-4 w-4" />
              Video Call {displayName.split(" ")[0]}
            </button>
          </div>
        </div>
      </div>
    ),
    {
      duration: 8000,
      position: "bottom-right",
      unstyled: true,
      style: { width: "100%" },
    }
  );
}
