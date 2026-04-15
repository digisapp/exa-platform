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

export function ModelOnlineNotifier({ actorId }: ModelOnlineNotifierProps) {
  const supabase = createClient();
  const router = useRouter();
  // Track which models we've already toasted in this session (model id → timestamp)
  const notifiedRef = useRef<Map<string, number>>(new Map());

  const handleModelOnline = useCallback(
    async (modelRow: {
      id: string;
      username: string;
      first_name: string | null;
      last_name: string | null;
      profile_photo_url: string | null;
      video_call_rate: number | null;
      video_is_online: boolean;
    }) => {
      // Only care about models going online
      if (!modelRow.video_is_online) return;
      if (!modelRow.profile_photo_url || !modelRow.username) return;

      const now = Date.now();
      const lastNotified = notifiedRef.current.get(modelRow.id);
      // Don't re-notify for the same model within 15 minutes
      if (lastNotified && now - lastNotified < 15 * 60 * 1000) return;

      notifiedRef.current.set(modelRow.id, now);

      const displayName = modelRow.first_name
        ? `${modelRow.first_name} ${modelRow.last_name || ""}`.trim()
        : modelRow.username;

      const rate = modelRow.video_call_rate;
      const rateText = rate ? `${rate} coins/min` : "";

      showModelOnlineToast({
        displayName,
        photoUrl: modelRow.profile_photo_url,
        rateText,
        profileUrl: `/${modelRow.username}`,
        onCall: () => router.push(`/${modelRow.username}`),
      });
    },
    [router]
  );

  useEffect(() => {
    if (!actorId) return;

    const channel = supabase
      .channel("model-online-presence")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "models",
          filter: "video_is_online=eq.true",
        },
        (payload) => {
          const model = payload.new as any;
          handleModelOnline(model);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [actorId, supabase, handleModelOnline]);

  return null;
}

function showModelOnlineToast({
  displayName,
  photoUrl,
  rateText,
  profileUrl,
  onCall,
}: {
  displayName: string;
  photoUrl: string;
  rateText: string;
  profileUrl: string;
  onCall: () => void;
}) {
  toast.custom(
    (t) => (
      <div
        className="relative animate-in slide-in-from-right-full fade-in duration-500 w-full max-w-sm cursor-pointer"
        onClick={() => {
          toast.dismiss(t);
          window.open(profileUrl, "_blank", "noopener,noreferrer");
        }}
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

            {/* CTA Button — navigates to profile in same tab to start call flow */}
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
      duration: 12000,
      position: "bottom-right",
      unstyled: true,
      style: { width: "100%" },
    }
  );
}
