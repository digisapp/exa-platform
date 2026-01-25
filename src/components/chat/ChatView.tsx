"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { TipDialog } from "./TipDialog";
import { VideoCallButton, IncomingCallDialog } from "@/components/video";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, MoreVertical, Ban, Coins, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Message, Actor, Model, Conversation, Fan } from "@/types/database";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";

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
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Handle blocking a user
  const handleBlockUser = async () => {
    if (isBlocking) return;

    setIsBlocking(true);
    try {
      const response = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: otherParticipant.actor_id,
        }),
      });

      if (response.ok) {
        toast.success(`${otherName} has been blocked`);
        setShowBlockDialog(false);
        // Redirect to chats list
        window.location.href = "/chats";
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to block user");
      }
    } catch {
      toast.error("Failed to block user");
    } finally {
      setIsBlocking(false);
    }
  };

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

        // Restore scroll position after messages are prepended
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

  // Helper to scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Handle scroll to detect position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Load more when scrolled near the top (within 100px)
    if (container.scrollTop < 100 && hasMore && !loadingMore) {
      loadMoreMessages();
    }

    // Check if near bottom (within 150px)
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < 150;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 5);
  }, [hasMore, loadingMore, loadMoreMessages, messages.length]);

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
  // Models chat free with each other, fans/brands pay the model's rate (minimum 10)
  const isModelToModel =
    currentActor.type === "model" && otherParticipant.actor.type === "model";
  const modelMessageRate = otherParticipant.model?.message_rate || 10;
  const coinCost = isModelToModel || currentActor.type === "model" ? 0 : Math.max(10, modelMessageRate);

  // Can tip if the other participant is a model and we're not a model
  const canTip = otherParticipant.actor.type === "model" && currentActor.type !== "model";

  // Initial scroll to bottom on mount
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, []); // Only run once on mount

  // Scroll to bottom only for new messages (not when loading older)
  useEffect(() => {
    // Only auto-scroll if user is near the bottom
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]); // Only trigger on message count change, not content

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
        setLocalCoinBalance((prev) => Math.max(0, prev - data.coinsDeducted));
        // Also update the global context so navbar updates
        coinBalanceContext?.deductCoins(data.coinsDeducted);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] relative">
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

        {/* Coin balance for fans/brands paying for messages */}
        {coinCost > 0 && (
          <Link
            href="/coins"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
          >
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{localCoinBalance}</span>
          </Link>
        )}

        {/* Video Call button */}
        <VideoCallButton
          conversationId={conversation.id}
          coinBalance={localCoinBalance}
          isModel={currentActor.type === "model"}
          recipientIsModel={otherParticipant.actor.type === "model"}
          recipientActorId={otherParticipant.actor_id}
          recipientName={otherName}
          onBalanceChange={(newBalance) => {
            setLocalCoinBalance(newBalance);
            coinBalanceContext?.setBalance(newBalance);
          }}
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
              // Also update the global context so navbar updates
              coinBalanceContext?.setBalance(newBalance);
            }}
          />
        )}

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Block {otherName}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {otherName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won&apos;t be able to message you or see your profile. You can
              unblock them later from your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking ? "Blocking..." : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {hasMore && !loadingMore && messages.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMoreMessages}
              className="text-muted-foreground"
            >
              Load earlier messages
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={otherAvatar || undefined} />
                <AvatarFallback className="text-xl bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                  {otherInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <h3 className="font-semibold text-lg">{otherName}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start your conversation
            </p>
            {coinCost > 0 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Coins className="h-3 w-3 text-yellow-500" />
                {coinCost} coins per message
              </p>
            )}
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
                currentActorId={currentActor.id}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 right-6">
          <Button
            onClick={() => scrollToBottom()}
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg bg-background border hover:bg-muted"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      )}

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
        conversationId={conversation.id}
      />
    </div>
  );
}
