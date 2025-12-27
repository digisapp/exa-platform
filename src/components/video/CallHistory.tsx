"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { VideoCallSession } from "@/types/video-calls";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface CallHistoryProps {
  conversationId: string;
  currentActorId: string;
}

interface CallHistoryItem extends VideoCallSession {
  isOutgoing: boolean;
}

export function CallHistory({ conversationId, currentActorId }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCallHistory() {
      const { data, error } = await (supabase
        .from("video_call_sessions") as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .in("status", ["ended", "missed", "declined"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching call history:", error);
        return;
      }

      const callsWithDirection = (data || []).map((call: VideoCallSession) => ({
        ...call,
        isOutgoing: call.initiated_by === currentActorId,
      }));

      setCalls(callsWithDirection);
      setLoading(false);
    }

    fetchCallHistory();
  }, [conversationId, currentActorId, supabase]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallIcon = (call: CallHistoryItem) => {
    if (call.status === "missed") {
      return <PhoneMissed className="h-4 w-4 text-red-400" />;
    }
    if (call.status === "declined") {
      return <PhoneMissed className="h-4 w-4 text-orange-400" />;
    }
    if (call.isOutgoing) {
      return <PhoneOutgoing className="h-4 w-4 text-blue-400" />;
    }
    return <PhoneIncoming className="h-4 w-4 text-green-400" />;
  };

  const getCallLabel = (call: CallHistoryItem) => {
    if (call.status === "missed") return "Missed call";
    if (call.status === "declined") return "Declined";
    if (call.isOutgoing) return "Outgoing call";
    return "Incoming call";
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Loading call history...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No call history yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {calls.map((call) => (
        <div
          key={call.id}
          className={cn(
            "p-3 flex items-center gap-3",
            call.status === "missed" || call.status === "declined"
              ? "bg-red-500/5"
              : ""
          )}
        >
          <div className="flex-shrink-0">{getCallIcon(call)}</div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{getCallLabel(call)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
            </p>
          </div>

          {call.duration_seconds && call.duration_seconds > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration_seconds)}
            </div>
          )}

          {call.coins_charged > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <Coins className="h-3 w-3" />
              {call.coins_charged}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
