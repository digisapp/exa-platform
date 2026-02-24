"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { TipDialog } from "./TipDialog";
import { TypingIndicator } from "./TypingIndicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { VideoCallButton, IncomingCallDialog } from "@/components/video";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ArrowLeft, Loader2, MoreVertical, Ban, Coins, ChevronDown, Users, Building2, Circle, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import type { Message, Actor, Model, Conversation, Fan, Brand } from "@/types/database";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";
import { formatDistanceToNow } from "date-fns";
import { ErrorBoundary } from "@/components/ui/error-boundary";

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
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
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
        router.push("/chats");
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

        // Merge reactions from the response
        if (data.reactions) {
          setReactionsMap((prev) => ({ ...prev, ...data.reactions }));
        }

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

  // Handle scroll to detect position (debounced via requestAnimationFrame)
  const scrollRafRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
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
    });
  }, [hasMore, loadingMore, loadMoreMessages, messages.length]);

  // Get other participant's display info based on their type (memoized)
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

    // Fallback
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          let newMessage = payload.new as Message & { is_system?: boolean };
          // Strip media_url from locked PPV messages to prevent URL inspection
          if (
            (newMessage.media_price ?? 0) > 0 &&
            newMessage.sender_id !== currentActor.id &&
            !(newMessage.media_viewed_by ?? []).includes(currentActor.id)
          ) {
            newMessage = { ...newMessage, media_url: null };
          }
          // Only add if not already in the list (avoid duplicates from optimistic updates)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Show toast notification for incoming tips (when someone tips you)
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
    // Fetch initial value
    (supabase
      .from("conversation_participants") as any)
      .select("last_read_at")
      .eq("conversation_id", conversation.id)
      .eq("actor_id", otherParticipant.actor_id)
      .single()
      .then(({ data }: { data: { last_read_at: string | null } | null }) => {
        if (data?.last_read_at) setOtherLastReadAt(data.last_read_at);
      });

    // Subscribe to realtime updates
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

      // Update message in local state: restore media_url and mark as unlocked
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

      // Update coin balance
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
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-full max-md:h-[calc(100vh-180px)] relative">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Link href="/chats" className="lg:hidden" aria-label="Back to chats">
          <Button variant="ghost" size="icon" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="relative">
          <Avatar className={cn(
            "h-10 w-10 ring-2 ring-background",
            otherInfo.type === "brand" && "ring-amber-500/30",
            otherInfo.type === "fan" && "ring-blue-500/30",
            otherInfo.type === "model" && "ring-pink-500/30"
          )}>
            <AvatarImage src={otherAvatar || undefined} />
            <AvatarFallback className={cn(
              "text-white font-semibold",
              otherInfo.type === "brand" && "bg-gradient-to-br from-amber-500 to-orange-600",
              otherInfo.type === "fan" && "bg-gradient-to-br from-blue-500 to-cyan-600",
              otherInfo.type === "model" && "bg-gradient-to-br from-pink-500 to-rose-600"
            )}>
              {otherInitials}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator - show green dot if active within last 5 mins */}
          {otherInfo.lastActive && (
            new Date().getTime() - new Date(otherInfo.lastActive).getTime() < 5 * 60 * 1000
          ) && (
            <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 text-green-500 stroke-background stroke-2" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">{otherName}</h2>
            {/* Type badge for fans/brands - helps models identify who they're talking to */}
            {otherInfo.type === "fan" && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
                <Users className="h-3 w-3 mr-1" />
                Fan
              </Badge>
            )}
            {otherInfo.type === "brand" && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Building2 className="h-3 w-3 mr-1" />
                Brand
              </Badge>
            )}
          </div>
          {/* Online status takes priority; fall back to username link */}
          {otherInfo.lastActive && new Date().getTime() - new Date(otherInfo.lastActive).getTime() < 5 * 60 * 1000 ? (
            <p className="text-xs font-medium text-green-500">Online</p>
          ) : otherInfo.username ? (
            <Link
              href={`/${otherInfo.username}`}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              @{otherInfo.username}
            </Link>
          ) : null}
        </div>

        {/* Voice Call button */}
        <VideoCallButton
          conversationId={conversation.id}
          coinBalance={localCoinBalance}
          isModel={currentActor.type === "model"}
          recipientIsModel={otherParticipant.actor.type === "model"}
          recipientActorId={otherParticipant.actor_id}
          recipientName={otherName}
          recipientAvatar={otherAvatar}
          videoCallRate={otherParticipant.model?.voice_call_rate || 5}
          callType="voice"
          onBalanceChange={(newBalance) => {
            setLocalCoinBalance(newBalance);
            coinBalanceContext?.setBalance(newBalance);
          }}
        />

        {/* Video Call button */}
        <VideoCallButton
          conversationId={conversation.id}
          coinBalance={localCoinBalance}
          isModel={currentActor.type === "model"}
          recipientIsModel={otherParticipant.actor.type === "model"}
          recipientActorId={otherParticipant.actor_id}
          recipientName={otherName}
          recipientAvatar={otherAvatar}
          videoCallRate={otherParticipant.model?.video_call_rate || 5}
          callType="video"
          onBalanceChange={(newBalance) => {
            setLocalCoinBalance(newBalance);
            coinBalanceContext?.setBalance(newBalance);
          }}
        />

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canTip && (
              <>
                <DropdownMenuItem onClick={() => setShowTipDialog(true)}>
                  <Gift className="h-4 w-4 mr-2 text-pink-500" />
                  Send a Tip
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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

      {/* Controlled Tip Dialog (opened from More menu) */}
      {canTip && (
        <TipDialog
          recipientId={otherParticipant.actor_id}
          recipientName={otherName}
          conversationId={conversation.id}
          coinBalance={localCoinBalance}
          open={showTipDialog}
          onOpenChange={setShowTipDialog}
          onTipSuccess={(amount, newBalance) => {
            setLocalCoinBalance(newBalance);
            coinBalanceContext?.setBalance(newBalance);
          }}
        />
      )}

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
      <ErrorBoundary>
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
            <div className={cn(
              "p-4 rounded-full mb-4",
              otherInfo.type === "brand" && "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
              otherInfo.type === "fan" && "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
              otherInfo.type === "model" && "bg-gradient-to-br from-pink-500/20 to-violet-500/20"
            )}>
              <Avatar className="h-16 w-16">
                <AvatarImage src={otherAvatar || undefined} />
                <AvatarFallback className={cn(
                  "text-xl text-white",
                  otherInfo.type === "brand" && "bg-gradient-to-br from-amber-500 to-orange-600",
                  otherInfo.type === "fan" && "bg-gradient-to-br from-blue-500 to-cyan-600",
                  otherInfo.type === "model" && "bg-gradient-to-br from-pink-500 to-violet-500"
                )}>
                  {otherInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{otherName}</h3>
              {otherInfo.type === "fan" && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
                  Fan
                </Badge>
              )}
              {otherInfo.type === "brand" && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                  Brand
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Start your conversation
            </p>
            {coinCost > 0 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Coins className="h-3 w-3 text-yellow-500" />
                {coinCost} coins per message
              </p>
            )}
          </div>
        ) : (() => {
          // Find the last own message that was read by the other participant
          const seenMessageId = otherLastReadAt
            ? messages.reduce<string | null>((last, msg) => {
                if (
                  msg.sender_id === currentActor.id &&
                  msg.created_at &&
                  new Date(msg.created_at) <= new Date(otherLastReadAt)
                ) {
                  return msg.id;
                }
                return last;
              }, null)
            : null;

          return messages.map((message, index) => {
            const isOwn = message.sender_id === currentActor.id;
            const showAvatar =
              index === 0 ||
              messages[index - 1].sender_id !== message.sender_id;

            // Show timestamp if:
            // - This is the last message
            // - OR next message is from different sender
            // - OR there's a time gap > 5 minutes to next message
            const isLastMessage = index === messages.length - 1;
            const nextMessage = messages[index + 1];
            const isDifferentSender = !!(nextMessage && nextMessage.sender_id !== message.sender_id);
            const hasTimeGap = !!(nextMessage && message.created_at && nextMessage.created_at &&
              (new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 5 * 60 * 1000));
            const showTimestamp = isLastMessage || isDifferentSender || hasTimeGap;
            const showSeen = message.id === seenMessageId;

            // Build reactions from batch-fetched data
            const rawReactions = reactionsMap[message.id] || [];
            const reactionsByEmoji: Record<string, { count: number; hasReacted: boolean }> = {};
            for (const r of rawReactions) {
              if (!reactionsByEmoji[r.emoji]) {
                reactionsByEmoji[r.emoji] = { count: 0, hasReacted: false };
              }
              reactionsByEmoji[r.emoji].count++;
              if (r.actor_id === currentActor.id) {
                reactionsByEmoji[r.emoji].hasReacted = true;
              }
            }
            const reactions = Object.entries(reactionsByEmoji).map(([emoji, info]) => ({
              emoji,
              count: info.count,
              hasReacted: info.hasReacted,
            }));

            return (
              <div key={message.id}>
                <MessageBubble
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
                  showTimestamp={showTimestamp && !showSeen}
                  currentActorId={currentActor.id}
                  reactions={reactions}
                  onUnlock={handleUnlockMedia}
                />
                {showSeen && (
                  <div className="flex justify-end pr-2 -mt-1 mb-1">
                    <span className="text-xs text-muted-foreground">
                      Seen{otherLastReadAt ? ` · ${formatDistanceToNow(new Date(otherLastReadAt), { addSuffix: true })}` : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          });
        })()}

        {/* Typing indicator */}
        <div aria-live="polite" aria-atomic="true">
          {typingUsers.length > 0 && (
            <TypingIndicator name={typingUsers[0].name} />
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>
      </ErrorBoundary>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 right-6">
          <Button
            onClick={() => scrollToBottom()}
            size="icon"
            aria-label="Scroll to latest messages"
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
