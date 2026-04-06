"use client";

import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Coins, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import type { Message, Actor, Model } from "@/types/database";
import type { OtherParticipantInfo } from "./ChatHeader";

interface TypingUser {
  name: string;
}

export interface ChatMessagesHandle {
  scrollToBottom: (smooth?: boolean) => void;
}

interface ChatMessagesProps {
  messages: Message[];
  reactionsMap: Record<string, { emoji: string; actor_id: string }[]>;
  currentActor: Actor;
  currentModel?: Model | null;
  otherInfo: OtherParticipantInfo;
  otherInitials: string;
  otherLastReadAt: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  coinCost: number;
  typingUsers: TypingUser[];
  showScrollButton: boolean;
  onLoadMore: () => void;
  onUnlockMedia: (messageId: string) => Promise<void>;
  onScrollStateChange: (isNearBottom: boolean, showScrollBtn: boolean) => void;
}

export const ChatMessages = forwardRef<ChatMessagesHandle, ChatMessagesProps>(
  function ChatMessages(
    {
      messages,
      reactionsMap,
      currentActor,
      currentModel,
      otherInfo,
      otherInitials,
      otherLastReadAt,
      hasMore,
      loadingMore,
      coinCost,
      typingUsers,
      showScrollButton,
      onLoadMore,
      onUnlockMedia,
      onScrollStateChange,
    },
    ref
  ) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const scrollRafRef = useRef<number | null>(null);

    const otherName = otherInfo.name;
    const otherAvatar = otherInfo.avatar;

    // Expose scrollToBottom to parent
    useImperativeHandle(ref, () => ({
      scrollToBottom(smooth = true) {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      },
    }));

    // Initial scroll to bottom on mount
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, []);

    // Handle scroll to detect position
    const handleScroll = useCallback(() => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const container = messagesContainerRef.current;
        if (!container) return;

        // Load more when scrolled near the top
        if (container.scrollTop < 100 && hasMore && !loadingMore) {
          onLoadMore();
        }

        // Check if near bottom
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const nearBottom = distanceFromBottom < 150;
        onScrollStateChange(nearBottom, !nearBottom && messages.length > 5);
      });
    }, [hasMore, loadingMore, onLoadMore, messages.length, onScrollStateChange]);

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

    return (
      <>
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
                  onClick={onLoadMore}
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
            ) : (
              messages.map((message, index) => {
                const isOwn = message.sender_id === currentActor.id;
                const showAvatar =
                  index === 0 ||
                  messages[index - 1].sender_id !== message.sender_id;

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
                            : currentActor.type === "admin"
                              ? "Admin"
                              : "You"
                          : otherName
                      }
                      senderAvatar={
                        isOwn
                          ? currentActor.type === "admin"
                            ? "/exa-logo-black.png"
                            : currentModel?.profile_photo_url
                          : otherAvatar
                      }
                      showAvatar={showAvatar}
                      showTimestamp={showTimestamp && !showSeen}
                      currentActorId={currentActor.id}
                      reactions={reactions}
                      onUnlock={onUnlockMedia}
                    />
                    {showSeen && (
                      <div className="flex justify-end pr-2 mt-1 mb-1">
                        <span className="text-xs text-muted-foreground">
                          Seen{otherLastReadAt ? ` · ${formatDistanceToNow(new Date(otherLastReadAt), { addSuffix: true })}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}

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
              onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
              size="icon"
              aria-label="Scroll to latest messages"
              className="h-10 w-10 rounded-full shadow-lg bg-background border hover:bg-muted"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        )}
      </>
    );
  }
);
