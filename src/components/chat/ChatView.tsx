"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages, ChatMessagesHandle } from "./ChatMessages";
import { IncomingCallDialog } from "@/components/video";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
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

// Optimistic message status
export type MessageStatus = "sending" | "sent" | "failed";

// Extended message type with optimistic fields
export interface OptimisticMessage extends Message {
  _status?: MessageStatus;
  _tempId?: string;
}

let tempIdCounter = 0;
function generateTempId() {
  return `temp_${Date.now()}_${++tempIdCounter}`;
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
  const [messages, setMessages] = useState<OptimisticMessage[]>(initialMessages);
  const [reactionsMap, setReactionsMap] = useState<Record<string, { emoji: string; actor_id: string }[]>>({});
  const [repliedMessagesMap, setRepliedMessagesMap] = useState<Record<string, { id: string; content: string | null; sender_id: string; media_type: string | null }>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(hasMoreMessages);
  const coinBalanceContext = useCoinBalanceOptional();
  const [localCoinBalance, setLocalCoinBalance] = useState(
    coinBalanceContext?.balance ?? currentFan?.coin_balance ?? currentModel?.coin_balance ?? 0
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
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
  const coinCost = isModelToModel || currentActor.type === "model" || currentActor.type === "admin" ? 0 : Math.max(10, modelMessageRate);

  // Can tip if the other participant is a model and we're not a model
  const canTip = otherParticipant.actor.type === "model" && currentActor.type !== "model";

  // --- Extracted hooks ---

  // Real-time messages
  useRealtimeMessages({
    conversationId: conversation.id,
    currentActorId: currentActor.id,
    onNewMessage: useCallback((newMessage: Message) => {
      setMessages((prev) => {
        // Replace optimistic message if this is our own message coming back
        const optimisticIdx = prev.findIndex(
          (m) => m._tempId && m.sender_id === newMessage.sender_id && m._status === "sending"
        );
        if (optimisticIdx !== -1) {
          const updated = [...prev];
          updated[optimisticIdx] = { ...newMessage, _status: "sent" as const };
          return updated;
        }
        // Deduplicate
        if (prev.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      // Track unread count only when scrolled away from bottom
      if (newMessage.sender_id !== currentActor.id && !isNearBottomRef.current) {
        setNewMessageCount((prev) => prev + 1);
      }
    }, [currentActor.id]),
    onSystemTip: useCallback(() => {
      toast.success(`${otherName} sent you a tip!`, {
        icon: "🎁",
        duration: 5000,
      });
    }, [otherName]),
  });

  // Read receipts
  const otherLastReadAt = useReadReceipts({
    conversationId: conversation.id,
    otherActorId: otherParticipant.actor_id,
  });

  // Incoming calls
  const { incomingCall, dismissCall } = useIncomingCalls({
    currentActorId: currentActor.id,
    conversationId: conversation.id,
    callerName: otherName,
    callerAvatar: otherAvatar,
    onCallReceived: useCallback((callType: "video" | "voice") => {
      const callTypeLabel = callType === "voice" ? "voice" : "video";
      toast.info(`${otherName} is ${callTypeLabel} calling you...`);
    }, [otherName]),
  });

  // Mark messages as read (uses API to reset unread_count atomically)
  useEffect(() => {
    async function markAsRead() {
      try {
        await fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: conversation.id }),
        });
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    }
    markAsRead();
  }, [conversation.id]);

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

        if (data.repliedMessages) {
          setRepliedMessagesMap((prev) => ({ ...prev, ...data.repliedMessages }));
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

  // Refetch coin balance from server (used after errors to correct optimistic state)
  const refetchCoinBalance = useCallback(async () => {
    try {
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("id", currentActor.id)
        .single();

      if (!actor) return;

      let balance = 0;
      if (actor.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("id", actor.id)
          .single();
        balance = fan?.coin_balance ?? 0;
      } else if (actor.type === "brand") {
        const { data: brand } = await (supabase
          .from("brands") as any)
          .select("coin_balance")
          .eq("id", actor.id)
          .single();
        balance = brand?.coin_balance ?? 0;
      } else if (actor.type === "model") {
        const { data: model } = await supabase
          .from("models")
          .select("coin_balance")
          .eq("id", actor.id)
          .single();
        balance = (model as any)?.coin_balance ?? 0;
      }

      setLocalCoinBalance(balance);
      coinBalanceContext?.setBalance(balance);
    } catch {
      // Silent fail - balance will self-correct on next page load
    }
  }, [currentActor.id, supabase, coinBalanceContext]);

  // Optimistic message sending
  const handleSendMessage = async (
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    mediaPrice?: number,
  ) => {
    const currentReplyToId = replyingTo?.id || undefined;
    setReplyingTo(null);

    // Create optimistic message and show it immediately
    const tempId = generateTempId();
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentActor.id,
      content: content || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      media_price: mediaPrice || null,
      media_viewed_by: null,
      created_at: new Date().toISOString(),
      flagged_at: null,
      flagged_by: null,
      flagged_reason: null,
      is_flagged: null,
      is_system: null,
      media_duration: null,
      media_expires_at: null,
      media_file_size: null,
      media_thumbnail_url: null,
      media_view_mode: null,
      read_at: null,
      recipient_id: null,
      recipient_instagram: null,
      sender_type: currentActor.type,
      transaction_id: null,
      _status: "sending",
      _tempId: tempId,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Optimistically deduct coins
    if (coinCost > 0) {
      setLocalCoinBalance((prev) => Math.max(0, prev - coinCost));
      coinBalanceContext?.deductCoins(coinCost);
    }

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
          replyToId: currentReplyToId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Mark optimistic message as failed
        setMessages((prev) =>
          prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" as const } : m)
        );

        // Reverse optimistic coin deduction
        if (coinCost > 0) {
          setLocalCoinBalance((prev) => prev + coinCost);
          coinBalanceContext?.setBalance(localCoinBalance);
        }

        if (response.status === 402) {
          toast.error(
            `Insufficient coins. Need ${data.required}, have ${data.balance}`
          );
          if (typeof data.balance === "number") {
            setLocalCoinBalance(data.balance);
            coinBalanceContext?.setBalance(data.balance);
          }
        } else {
          toast.error(data.error || "Failed to send message");
        }
        refetchCoinBalance();
        return;
      }

      // Replace optimistic message with real one from server
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === tempId
              ? { ...data.message, _status: "sent" as const }
              : m
          )
        );
      }

      // Use server-reported coin deduction (may differ from our estimate)
      if (data.coinsDeducted > 0 && data.coinsDeducted !== coinCost) {
        const diff = data.coinsDeducted - coinCost;
        setLocalCoinBalance((prev) => Math.max(0, prev - diff));
        coinBalanceContext?.deductCoins(diff);
      }
    } catch {
      // Network error - mark as failed
      setMessages((prev) =>
        prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" as const } : m)
      );
      if (coinCost > 0) {
        setLocalCoinBalance((prev) => prev + coinCost);
        coinBalanceContext?.setBalance(localCoinBalance);
      }
      toast.error("Failed to send message. Check your connection.");
    }
  };

  // Retry a failed optimistic message
  const handleRetryMessage = useCallback(async (tempId: string) => {
    const failedMsg = messages.find((m) => m._tempId === tempId && m._status === "failed");
    if (!failedMsg) return;

    // Remove the failed message and re-send
    setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
    await handleSendMessage(
      failedMsg.content || "",
      failedMsg.media_url || undefined,
      failedMsg.media_type || undefined,
      failedMsg.media_price || undefined,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Dismiss a failed message
  const handleDismissFailedMessage = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
  }, []);

  const handleBalanceChange = useCallback((newBalance: number) => {
    setLocalCoinBalance(newBalance);
    coinBalanceContext?.setBalance(newBalance);
  }, [coinBalanceContext]);

  const handleScrollStateChange = useCallback((nearBottom: boolean, showBtn: boolean) => {
    setIsNearBottom(nearBottom);
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(showBtn);
    // Reset new message count when user scrolls to bottom
    if (nearBottom) {
      setNewMessageCount(0);
    }
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
          onClose={dismissCall}
        />
      )}

      <ChatMessages
        ref={chatMessagesRef}
        messages={messages}
        reactionsMap={reactionsMap}
        repliedMessagesMap={repliedMessagesMap}
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
        newMessageCount={newMessageCount}
        onLoadMore={loadMoreMessages}
        onUnlockMedia={handleUnlockMedia}
        onScrollStateChange={handleScrollStateChange}
        onReply={setReplyingTo}
        onRetryMessage={handleRetryMessage}
        onDismissFailedMessage={handleDismissFailedMessage}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        coinCost={coinCost}
        coinBalance={localCoinBalance}
        placeholder="Type a message..."
        isModel={currentActor.type === "model"}
        modelId={currentModel?.id}
        conversationId={conversation.id}
        onTyping={broadcastTyping}
        onStopTyping={stopTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
