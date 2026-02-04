"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TipNotificationListenerProps {
  actorId: string;
}

export function TipNotificationListener({ actorId }: TipNotificationListenerProps) {
  const supabase = createClient();
  const router = useRouter();
  const shownTipsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to all new messages and filter for tips
    const channel = supabase
      .channel(`tips:${actorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const message = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string | null;
            is_system?: boolean;
          };

          // Skip if not a system message about tips
          if (!message.is_system || !message.content?.includes("tip")) {
            return;
          }

          // Skip if we sent this tip
          if (message.sender_id === actorId) {
            return;
          }

          // Skip if we already showed this notification (deduplication)
          if (shownTipsRef.current.has(message.id)) {
            return;
          }

          // Check if we're a participant in this conversation
          const { data: participation } = await supabase
            .from("conversation_participants")
            .select("actor_id")
            .eq("conversation_id", message.conversation_id)
            .eq("actor_id", actorId)
            .maybeSingle();

          if (!participation) {
            return; // Not our conversation
          }

          // Get the sender's name
          const { data: senderActor } = await supabase
            .from("actors")
            .select("type, user_id")
            .eq("id", message.sender_id)
            .single();

          let senderName = "Someone";
          if (senderActor?.type === "fan") {
            const { data: fan } = await supabase
              .from("fans")
              .select("display_name")
              .eq("id", message.sender_id)
              .maybeSingle();
            senderName = fan?.display_name || "A fan";
          } else if (senderActor?.type === "model" && senderActor.user_id) {
            const { data: model } = await supabase
              .from("models")
              .select("first_name, username")
              .eq("user_id", senderActor.user_id)
              .maybeSingle();
            senderName = model?.first_name || model?.username || "A model";
          }

          // Mark as shown and display toast
          shownTipsRef.current.add(message.id);

          // Extract amount from message if possible (e.g., "💝 Sent a 10 coin tip!")
          const amountMatch = message.content?.match(/(\d+)\s*coin/i);
          const amount = amountMatch ? amountMatch[1] : "";

          toast.success(
            amount
              ? `${senderName} sent you a ${amount} coin tip!`
              : `${senderName} sent you a tip!`,
            {
              icon: "💝",
              duration: 8000,
              action: {
                label: "Reply",
                onClick: () => {
                  router.push(`/chats/${message.conversation_id}`);
                },
              },
            }
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [actorId, supabase, router]);

  return null; // This component doesn't render anything
}
