"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { IncomingCallDialog } from "./IncomingCallDialog";
import { unlockRingtoneAudio } from "./ringtone";
import { toast } from "sonner";
import { vipTierOf } from "@/lib/vip-config";

interface CallListenerProps {
  actorId: string;
}

export function CallListener({ actorId }: CallListenerProps) {
  const [incomingCall, setIncomingCall] = useState<{
    sessionId: string;
    callerName: string;
    callerAvatar?: string;
    callType?: "video" | "voice";
    callerTierKey?: string | null;
  } | null>(null);
  const supabase = createClient();

  // Unlock the shared ringtone AudioContext on the first user gesture so iOS
  // Safari doesn't start it suspended (incoming-call dialogs mount from a
  // realtime event, which is not a gesture — the oscillators would be silent).
  useEffect(() => {
    const events = ["touchstart", "pointerdown", "click"] as const;
    const unlock = () => {
      unlockRingtoneAudio();
      events.forEach((e) => window.removeEventListener(e, unlock, true));
    };
    events.forEach((e) => window.addEventListener(e, unlock, { capture: true, once: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, unlock, true));
    };
  }, []);

  // Ask for notification permission once so incoming calls can reach a
  // backgrounded tab. Best-effort: some browsers require a user gesture and
  // will just ignore this.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Subscribe to incoming video calls globally
  useEffect(() => {
    if (!actorId) return;

    const callChannel = supabase
      .channel(`global-calls:${actorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_call_sessions",
          filter: `recipient_id=eq.${actorId}`,
        },
        async (payload) => {
          const callSession = payload.new as any;

          // Only show if pending
          if (callSession.status !== "pending") return;

          // Get caller info
          const { data: callerActor } = await supabase
            .from("actors")
            .select("id, type, user_id")
            .eq("id", callSession.initiated_by)
            .single() as { data: { id: string; type: string; user_id: string } | null };

          if (!callerActor) return;

          let callerName = "Someone";
          let callerAvatar: string | undefined;
          let callerLifetimeSpend: number | null = null;

          if (callerActor.type === "model") {
            const { data: model } = await (supabase
              .from("models") as any)
              .select("username, profile_photo_url")
              .eq("user_id", callerActor.user_id)
              .single() as { data: { username?: string; profile_photo_url?: string } | null };

            if (model) {
              callerName = model.username || "Model";
              callerAvatar = model.profile_photo_url || undefined;
            }
          } else if (callerActor.type === "fan") {
            const { data: fan } = await (supabase
              .from("fans") as any)
              .select("display_name, avatar_url, lifetime_spend_coins")
              .eq("id", callerActor.id)
              .single() as { data: { display_name?: string; avatar_url?: string; lifetime_spend_coins?: number | null } | null };

            if (fan) {
              callerName = fan.display_name || "Fan";
              callerAvatar = fan.avatar_url || undefined;
              callerLifetimeSpend = fan.lifetime_spend_coins ?? null;
            }
          }

          const callType = callSession.call_type || "video";
          const callerTier = vipTierOf(callerLifetimeSpend);
          setIncomingCall({
            sessionId: callSession.id,
            callerName,
            callerAvatar,
            callType,
            callerTierKey: callerTier?.key ?? null,
          });

          const callTypeLabel = callType === "voice" ? "voice" : "video";
          // VIP callers announce with their earned tier — badge only, no amounts
          toast.info(
            callerTier
              ? `${callerTier.emoji} ${callerTier.label} supporter ${callerName} is ${callTypeLabel} calling you...`
              : `${callerName} is ${callTypeLabel} calling you...`,
            {
              duration: 5000,
            }
          );

          // The toast is invisible if the tab is backgrounded — fire an OS
          // notification too so the call can actually be answered.
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            try {
              const notification = new Notification(`${callerName} is calling you on EXA`, {
                body: `Incoming ${callTypeLabel} call — tap to answer`,
                icon: callerAvatar || "/favicon.ico",
                tag: `exa-call-${callSession.id}`,
              });
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch {
              // Notification constructor can throw on some mobile browsers
            }
          }
        }
      )
      .subscribe();

    return () => {
      callChannel.unsubscribe();
    };
  }, [actorId, supabase]);

  if (!incomingCall) return null;

  return (
    <IncomingCallDialog
      sessionId={incomingCall.sessionId}
      callerName={incomingCall.callerName}
      callerAvatar={incomingCall.callerAvatar}
      callType={incomingCall.callType}
      callerTierKey={incomingCall.callerTierKey}
      onClose={() => setIncomingCall(null)}
    />
  );
}
