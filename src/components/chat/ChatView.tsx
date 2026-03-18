"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages, ChatMessagesHandle } from "./ChatMessages";
import { IncomingCallDialog } from "@/components/video";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { toast } from "sonner";
import type { Message, Actor, Model, Conversation, Fan, Brand } from "@/types/database";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";

interface Participant {
  actor_id: string;
  actor: Actor;
  model?: Model | null;
  fan?: Fan | null;
  brand?: Brand | null;
}

interface ChatViewProps {
  conversation: Conversation;
  initialMessages: Message[];
  currentActor: Actor;
  currentModel?: Model | null;
  currentFan?: Fan | null;
  otherParticipant: Participant;
  hasMoreMessages?: boolean;
}

export function ChatView({
  conversation,
  initialMessages,
  currentActor,
  currentModel,
  currentFan,
  otherParticipant,
  hasMoreMessages = false,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reactionsMap, setReactionsMap] = useState<Record<string, { emoji: string; actor_id: string }[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(hasMoreMessages);
  const coinBalanceContext = useCoinBalanceOptional();
  const [localCoinBalance, setLocalCoinBalance] = useState(
    coinBalanceContext?.balance ?? currentFan?.coin_balance ?? currentModel?.coin_balance ?? 0
  );
  const [incomingCall, setIncomingCall] = useState<{
    sessionId: string;
    callerName: string;
    callerAvatar?: string;
    callType?: "video" | "voice";
  } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const chatMessagesRef = useRef<ChatMessagesHandle>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Get current user's display name for typing indicator
  const currentUserName = currentModel?.first_name
    ? `${currentModel.first_name} ${currentModel.last_name || ""}`.trim()
    : currentFan?.display_name || "User";

  // Typing indicator
  const { typingUsers, broadcastTyping, stopTyping } = useTypingIndicator({
    conversationId: conversation.id,
    currentActorId: currentActor.id,
    currentActorName: currentUserName,
  });

  // Get other participant's display info (memoized)
  const otherInfo = useMemo(() => {
    const { actor, model, fan, brand } = otherParticipant;

    if (actor.type === "model" && model) {
      return {
        name: model.first_name
          ? `${model.first_name} ${model.last_name || ""}`.trim()
          : model.username || "Model",
        avatar: model.profile_photo_url,
        username: model.username,
        type: "model" as const,
        lastActive: model.last_active_at,
      };
    }

    if (actor.type === "fan" && fan) {
      return {
        name: fan.display_name || fan.username || "Fan",
        avatar: fan.avatar_url,
        username: fan.username || null,
        type: "fan" as const,
        lastActive: null,
      };
    }

    if (actor.type === "brand" && brand) {
      return {
        name: brand.company_name || "Brand",
        avatar: brand.logo_url,
        username: null,
        type: "brand" as const,
        lastActive: null,
      };
    }

    return {
      name: "User",
      avatar: null,
      username: null,
      type: actor.type as "fan" | "brand" | "model",
      lastActive: null,
    };
  }, [otherParticipant]);

  const otherName = otherInfo.name;
  const otherAvatar = otherInfo.avatar;
  const otherInitials = useMemo(() =>
    otherName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  , [otherName]);

  // Determine if messages cost coins
  const isModelToModel =
    currentActor.type === "model" && otherParticipant.actor.type === "model";
  const modelMessageRate = otherParticipant.model?.message_rate || 10;
  const coinCost = isModelToModel || currentActor.type === "model" ? 0 : Math.max(10, modelMessageRate);

  // Can tip if the other participant is a model and we're not a model
  const canTip = otherParticipant.actor.type === "model" && currentActor.type !== "model";

  // Load older messages
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    setLoadingMore(true);

    try {
      const response = await fetch(
        `/api/messages/list?conversationId=${conversation.id}&before=${oldestMessage.id}`
      );
      const data = await response.json();

      if (response.ok && data.messages) {
        // Preserve scroll position
        const container = messagesContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.hasMore);

        if (data.reactions) {
          setReactionsMap((prev) => ({ ...prev, ...data.reactions }));
        }

        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight;
          }
        });
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [conversation.id, hasMore, loadingMore, messages]);

  // Scroll to bottom only for new messages (not when loading older)
  useEffect(() => {
    if (isNearBottom) {
      chatMessagesRef.current?.scrollToBottom(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

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
          let newMessage = payload.new as Message & { is_system?: boolean };
          // Strip media_url from locked PPV messages
          if (
            (newMessage.media_price ?? 0) > 0 &&
            newMessage.sender_id !== currentActor.id &&
            !(newMessage.media_viewed_by ?? []).includes(currentActor.id)
          ) {
            newMessage = { ...newMessage, media_url: null };
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          if (
            newMessage.is_system &&
            newMessage.content?.includes("tip") &&
            newMessage.sender_id !== currentActor.id
          ) {
            toast.success(`${otherName} sent you a tip!`, {
              icon: "🎁",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversation.id, supabase, currentActor.id, otherName]);

  // Mark messages as read
  useEffect(() => {
    async function markAsRead() {
      try {
        await (supabase
          .from("conversation_participants") as any)
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", conversation.id)
          .eq("actor_id", currentActor.id);
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    }
    markAsRead();
  }, [conversation.id, currentActor.id, supabase]);

  // Fetch and subscribe to other participant's last_read_at for read receipts
  useEffect(() => {
    (supabase
      .from("conversation_participants") as any)
      .select("last_read_at")
      .eq("conversation_id", conversation.id)
      .eq("actor_id", otherParticipant.actor_id)
      .single()
      .then(({ data }: { data: { last_read_at: string | null } | null }) => {
        if (data?.last_read_at) setOtherLastReadAt(data.last_read_at);
      });

    const readChannel = supabase
      .channel(`read:${conversation.id}:${otherParticipant.actor_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updated = payload.new as { actor_id: string; last_read_at: string | null };
          if (updated.actor_id === otherParticipant.actor_id && updated.last_read_at) {
            setOtherLastReadAt(updated.last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      readChannel.unsubscribe();
    };
  }, [conversation.id, otherParticipant.actor_id, supabase]);

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
          if (
            callSession.conversation_id === conversation.id &&
            callSession.status === "pending"
          ) {
            const callType = callSession.call_type || "video";
            setIncomingCall({
              sessionId: callSession.id,
              callerName: otherName,
              callerAvatar: otherAvatar || undefined,
              callType,
            });
            const callTypeLabel = callType === "voice" ? "voice" : "video";
            toast.info(`${otherName} is ${callTypeLabel} calling you...`);
          }
        }
      )
      .subscribe();

    return () => {
      callChannel.unsubscribe();
    };
  }, [currentActor.id, conversation.id, otherName, otherAvatar, supabase]);

  const handleUnlockMedia = async (messageId: string) => {
    try {
      const response = await fetch("/api/messages/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(
            `Insufficient coins. Need ${data.required}, have ${data.balance}`
          );
        } else {
          toast.error(data.error || "Failed to unlock");
        }
        throw new Error(data.error);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                media_url: data.mediaUrl || m.media_url,
                media_viewed_by: [
                  ...(m.media_viewed_by ?? []),
                  currentActor.id,
                ],
              }
            : m
        )
      );

      if (data.amountPaid > 0) {
        setLocalCoinBalance((prev) => Math.max(0, prev - data.amountPaid));
        coinBalanceContext?.deductCoins(data.amountPaid);
      }

      if (!data.alreadyUnlocked) {
        toast.success("Media unlocked!");
      }
    } catch {
      // Error already shown via toast above
    }
  };

  const handleSendMessage = async (
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    mediaPrice?: number,
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
          mediaPrice: mediaPrice || undefined,
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

      if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }

      if (data.coinsDeducted > 0) {
        setLocalCoinBalance((prev) => Math.max(0, prev - data.coinsDeducted));
        coinBalanceContext?.deductCoins(data.coinsDeducted);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceChange = useCallback((newBalance: number) => {
    setLocalCoinBalance(newBalance);
    coinBalanceContext?.setBalance(newBalance);
  }, [coinBalanceContext]);

  const handleScrollStateChange = useCallback((nearBottom: boolean, showBtn: boolean) => {
    setIsNearBottom(nearBottom);
    setShowScrollButton(showBtn);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-full max-md:h-[calc(100vh-180px)] relative">
      <ChatHeader
        conversation={conversation}
        currentActor={currentActor}
        otherParticipantActorId={otherParticipant.actor_id}
        otherParticipantActorType={otherParticipant.actor.type}
        otherParticipantModel={otherParticipant.model}
        otherInfo={otherInfo}
        otherInitials={otherInitials}
        canTip={canTip}
        localCoinBalance={localCoinBalance}
        onBalanceChange={handleBalanceChange}
      />

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <IncomingCallDialog
          sessionId={incomingCall.sessionId}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onClose={() => setIncomingCall(null)}
        />
      )}

      <ChatMessages
        ref={chatMessagesRef}
        messages={messages}
        reactionsMap={reactionsMap}
        currentActor={currentActor}
        currentModel={currentModel}
        otherInfo={otherInfo}
        otherInitials={otherInitials}
        otherLastReadAt={otherLastReadAt}
        hasMore={hasMore}
        loadingMore={loadingMore}
        coinCost={coinCost}
        typingUsers={typingUsers}
        showScrollButton={showScrollButton}
        onLoadMore={loadMoreMessages}
        onUnlockMedia={handleUnlockMedia}
        onScrollStateChange={handleScrollStateChange}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={loading}
        coinCost={coinCost}
        coinBalance={localCoinBalance}
        placeholder="Type a message..."
        isModel={currentActor.type === "model"}
        modelId={currentModel?.id}
        conversationId={conversation.id}
        onTyping={broadcastTyping}
        onStopTyping={stopTyping}
      />
    </div>
  );
}
