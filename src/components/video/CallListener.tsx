"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { IncomingCallDialog } from "./IncomingCallDialog";
import { toast } from "sonner";

interface CallListenerProps {
  actorId: string;
}

export function CallListener({ actorId }: CallListenerProps) {
  const [incomingCall, setIncomingCall] = useState<{
    sessionId: string;
    callerName: string;
    callerAvatar?: string;
    callType?: "video" | "voice";
  } | null>(null);
  const supabase = createClient();

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

          if (callerActor.type === "model") {
            const { data: model } = await (supabase
              .from("models") as any)
              .select("first_name, last_name, username, profile_photo_url")
              .eq("user_id", callerActor.user_id)
              .single() as { data: { first_name?: string; last_name?: string; username?: string; profile_photo_url?: string } | null };

            if (model) {
              callerName = model.first_name
                ? `${model.first_name} ${model.last_name || ""}`.trim()
                : model.username || "Model";
              callerAvatar = model.profile_photo_url || undefined;
            }
          } else if (callerActor.type === "fan") {
            const { data: fan } = await (supabase
              .from("fans") as any)
              .select("display_name, avatar_url")
              .eq("id", callerActor.id)
              .single() as { data: { display_name?: string; avatar_url?: string } | null };

            if (fan) {
              callerName = fan.display_name || "Fan";
              callerAvatar = fan.avatar_url || undefined;
            }
          }

          const callType = callSession.call_type || "video";
          setIncomingCall({
            sessionId: callSession.id,
            callerName,
            callerAvatar,
            callType,
          });

          const callTypeLabel = callType === "voice" ? "voice" : "video";
          toast.info(`${callerName} is ${callTypeLabel} calling you...`, {
            duration: 5000,
          });
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
      onClose={() => setIncomingCall(null)}
    />
  );
}
