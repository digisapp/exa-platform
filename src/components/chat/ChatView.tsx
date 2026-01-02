"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { TipDialog } from "./TipDialog";
import { VideoCallButton, IncomingCallDialog } from "@/components/video";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Message, Actor, Model, Conversation, Fan } from "@/types/database";

interface Participant {
  actor_id: string;
  actor: Actor;
  model?: Model | null;
}

interface ChatViewProps {
  conversation: Conversation;
  initialMessages: Message[];
  currentActor: Actor;
  currentModel?: Model | null;
  currentFan?: Fan | null;
  otherParticipant: Participant;
}

export function ChatView({
  conversation,
  initialMessages,
  currentActor,
  currentModel,
  currentFan,
  otherParticipant,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [localCoinBalance, setLocalCoinBalance] = useState(
    currentFan?.coin_balance || currentModel?.coin_balance || 0
  );
  const [incomingCall, setIncomingCall] = useState<{
    sessionId: string;
    callerName: string;
    callerAvatar?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Get other participant's display info
  const otherName =
    otherParticipant.model?.first_name
      ? `${otherParticipant.model.first_name} ${otherParticipant.model.last_name || ""}`.trim()
      : otherParticipant.model?.username || "User";
  const otherAvatar = otherParticipant.model?.profile_photo_url;
  const otherInitials = otherName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Determine if messages cost coins
  const isModelToModel =
    currentActor.type === "model" && otherParticipant.actor.type === "model";
  const coinCost = isModelToModel || currentActor.type === "model" ? 0 : 10;

  // Can tip if the other participant is a model and we're not a model
  const canTip = otherParticipant.actor.type === "model" && currentActor.type !== "model";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if not already in the list (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversation.id, supabase]);

  // Mark messages as read
  useEffect(() => {
    async function markAsRead() {
      await (supabase
        .from("conversation_participants") as any)
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversation.id)
        .eq("actor_id", currentActor.id);
    }
    markAsRead();
  }, [conversation.id, currentActor.id, supabase]);

  // Subscribe to incoming video calls
  useEffect(() => {
    const callChannel = supabase
      .channel(`calls:${currentActor.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_call_sessions",
          filter: `recipient_id=eq.${currentActor.id}`,
        },
        (payload) => {
          const callSession = payload.new as any;
          // Only show if it's for this conversation and pending
          if (
            callSession.conversation_id === conversation.id &&
            callSession.status === "pending"
          ) {
            setIncomingCall({
              sessionId: callSession.id,
              callerName: otherName,
              callerAvatar: otherAvatar || undefined,
            });
            toast.info(`${otherName} is calling you...`);
          }
        }
      )
      .subscribe();

    return () => {
      callChannel.unsubscribe();
    };
  }, [currentActor.id, conversation.id, otherName, otherAvatar, supabase]);

  const handleSendMessage = async (
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ) => {
    setLoading(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          content,
          mediaUrl,
          mediaType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(
            `Insufficient coins. Need ${data.required}, have ${data.balance}`
          );
        } else {
          toast.error(data.error || "Failed to send message");
        }
        throw new Error(data.error);
      }

      // Optimistically add the message (will be deduplicated by realtime)
      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }

      if (data.coinsDeducted > 0) {
        // Could update local coin balance here if needed
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Link href="/chats">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <Avatar className="h-10 w-10">
          <AvatarImage src={otherAvatar || undefined} />
          <AvatarFallback>{otherInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{otherName}</h2>
          {otherParticipant.model?.username && (
            <Link
              href={`/${otherParticipant.model.username}`}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              @{otherParticipant.model.username}
            </Link>
          )}
        </div>

        {/* Video Call button */}
        <VideoCallButton
          conversationId={conversation.id}
          coinBalance={localCoinBalance}
          isModel={currentActor.type === "model"}
          recipientIsModel={otherParticipant.actor.type === "model"}
          recipientActorId={otherParticipant.actor_id}
          recipientName={otherName}
          onBalanceChange={(newBalance) => setLocalCoinBalance(newBalance)}
        />

        {/* Tip button */}
        {canTip && (
          <TipDialog
            recipientId={otherParticipant.actor_id}
            recipientName={otherName}
            conversationId={conversation.id}
            coinBalance={localCoinBalance}
            onTipSuccess={(amount, newBalance) => {
              setLocalCoinBalance(newBalance);
            }}
          />
        )}
      </div>

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <IncomingCallDialog
          sessionId={incomingCall.sessionId}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onClose={() => setIncomingCall(null)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === currentActor.id;
            const showAvatar =
              index === 0 ||
              messages[index - 1].sender_id !== message.sender_id;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                senderName={
                  isOwn
                    ? currentModel?.first_name
                      ? `${currentModel.first_name} ${currentModel.last_name || ""}`.trim()
                      : "You"
                    : otherName
                }
                senderAvatar={
                  isOwn ? currentModel?.profile_photo_url : otherAvatar
                }
                showAvatar={showAvatar}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={loading}
        coinCost={coinCost}
        coinBalance={localCoinBalance}
        placeholder={
          coinCost > 0
            ? `Message (${coinCost} coins)...`
            : "Type a message..."
        }
        isModel={currentActor.type === "model"}
        modelId={currentModel?.id}
      />
    </div>
  );
}
