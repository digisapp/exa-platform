"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, MessageSquare, Sparkles, Users, Building2, Pin, Archive, ArchiveRestore, MoreVertical, Coins, Camera, Video, Mic } from "lucide-react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SwipeableConversationItem } from "./SwipeableConversationItem";

interface Conversation {
  conversation_id: string;
  last_read_at: string | null;
  is_pinned?: boolean;
  is_archived?: boolean;
  unread_count?: number;
  lastMessage: {
    content: string | null;
    created_at: string;
    sender_id: string;
    media_url?: string | null;
    media_type?: string | null;
    is_system?: boolean;
  } | null;
  otherParticipants: Array<{
    id?: string;
    type?: string;
    model: {
      first_name: string | null;
      last_name: string | null;
      username: string;
      profile_photo_url: string | null;
    } | null;
    fan: {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
    brand: {
      company_name: string | null;
      logo_url: string | null;
    } | null;
  }>;
}

interface ConversationListProps {
  conversations: Conversation[];
  actorType?: string;
  compact?: boolean;
  currentActorId?: string;
}

type FilterType = "all" | "fans" | "brands" | "archived";

// Helper to format time nicely (Yesterday, Tuesday, etc.)
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  const daysDiff = differenceInDays(now, date);
  if (daysDiff < 7) {
    return format(date, "EEEE"); // Day name like "Tuesday"
  }
  return format(date, "MMM d"); // "Jan 15"
}

export function ConversationList({ conversations: initialConversations, actorType, compact, currentActorId }: ConversationListProps) {
  const pathname = usePathname();
  const selectedId = pathname.startsWith("/chats/") ? pathname.split("/chats/")[1] : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [conversations, setConversations] = useState(initialConversations);

  // Sync from props when initial data changes (navigation)
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  // Get stable conversation IDs for subscription filter
  const conversationIds = useMemo(
    () => conversations.map((c) => c.conversation_id),
    // Only recompute when the set of IDs actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations.map((c) => c.conversation_id).join(",")]
  );

  // Real-time subscription: update last message + sort order when new messages arrive
  useEffect(() => {
    if (!currentActorId || conversationIds.length === 0) return;

    const supabase = createClient();

    // Subscribe per-conversation (filtered server-side) to avoid receiving all messages system-wide.
    // Supabase postgres_changes only supports eq filters, so we subscribe to each conversation.
    // Cap at 50 to avoid too many channels; beyond that, fall back to unfiltered.
    const useFiltered = conversationIds.length <= 50;

    const handleNewMessage = (payload: any) => {
      const msg = payload.new as any;

      setConversations((prev) => {
        if (!prev.some((c) => c.conversation_id === msg.conversation_id)) return prev;

        const updated = prev.map((conv) => {
          if (conv.conversation_id !== msg.conversation_id) return conv;
          // Increment unread count for messages from others (not our own sends)
          const isOwnMessage = msg.sender_id === currentActorId;
          return {
            ...conv,
            lastMessage: {
              content: msg.content,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
              media_url: msg.media_url,
              media_type: msg.media_type,
              is_system: msg.is_system,
            },
            // Only increment unread for other people's messages, and not for the currently open conversation
            unread_count: !isOwnMessage && conv.conversation_id !== selectedId
              ? (conv.unread_count || 0) + 1
              : conv.unread_count,
          };
        });
        // Re-sort by latest message
        return [...updated].sort((a, b) => {
          const aTime = a.lastMessage?.created_at || "";
          const bTime = b.lastMessage?.created_at || "";
          return bTime.localeCompare(aTime);
        });
      });
    };

    if (useFiltered) {
      const channels = conversationIds.map((convId) =>
        supabase
          .channel(`conv-list:${convId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${convId}`,
            },
            handleNewMessage
          )
          .subscribe()
      );

      return () => {
        channels.forEach((ch) => ch.unsubscribe());
      };
    } else {
      // Fallback: unfiltered subscription for users with many conversations
      const channel = supabase
        .channel("conversation-list-updates")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          handleNewMessage
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [currentActorId, conversationIds]);

  // Helper to detect tip system messages
  const isTipMessage = (message: Conversation["lastMessage"]) => {
    return message?.is_system && message.content?.includes("coin tip");
  };

  // Helper to get message preview text
  const getMessagePreview = (message: Conversation["lastMessage"]) => {
    if (!message) return "No messages yet";

    // System messages (tips, etc.)
    if (message.is_system && message.content) {
      return message.content;
    }

    // Text message
    if (message.content) {
      return message.content;
    }

    // Media-only message
    if (message.media_url) {
      if (message.media_type?.startsWith("image/")) {
        return "Sent a photo";
      }
      if (message.media_type?.startsWith("video/")) {
        return "Sent a video";
      }
      if (message.media_type?.startsWith("audio/")) {
        return "Sent a voice message";
      }
      return "Sent an attachment";
    }

    return "No messages yet";
  };

  // Helper to get display name and avatar for a participant
  const getParticipantInfo = (participant: Conversation["otherParticipants"][0]) => {
    if (participant?.type === "model" && participant?.model) {
      return {
        displayName: participant.model.first_name
          ? `${participant.model.first_name} ${participant.model.last_name || ""}`.trim()
          : participant.model.username,
        avatarUrl: participant.model.profile_photo_url,
        username: participant.model.username,
        type: "model",
      };
    }
    if (participant?.type === "fan") {
      return {
        displayName: participant.fan?.display_name || participant.fan?.username || "Fan",
        avatarUrl: participant.fan?.avatar_url || null,
        username: participant.fan?.username || null,
        type: "fan",
      };
    }
    if (participant?.type === "brand") {
      return {
        displayName: participant.brand?.company_name || "Brand",
        avatarUrl: participant.brand?.logo_url || null,
        username: null,
        type: "brand",
      };
    }
    if (participant?.type === "admin") {
      return {
        displayName: "EXA Team",
        avatarUrl: null,
        username: null,
        type: "admin",
      };
    }
    return {
      displayName: "Unknown",
      avatarUrl: null,
      username: null,
      type: "unknown",
    };
  };

  // Pin/archive actions
  const handlePin = async (conversationId: string, pinned: boolean) => {
    setConversations((prev) =>
      prev.map((c) => c.conversation_id === conversationId ? { ...c, is_pinned: pinned } : c)
    );
    try {
      const res = await fetch("/api/conversations/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, pinned }),
      });
      if (!res.ok) throw new Error();
      toast.success(pinned ? "Conversation pinned" : "Conversation unpinned");
    } catch {
      setConversations((prev) =>
        prev.map((c) => c.conversation_id === conversationId ? { ...c, is_pinned: !pinned } : c)
      );
      toast.error("Failed to update pin");
    }
  };

  const handleArchive = async (conversationId: string, archived: boolean) => {
    setConversations((prev) =>
      prev.map((c) => c.conversation_id === conversationId ? { ...c, is_archived: archived } : c)
    );
    try {
      const res = await fetch("/api/conversations/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, archived }),
      });
      if (!res.ok) throw new Error();
      toast.success(archived ? "Conversation archived" : "Conversation unarchived");
    } catch {
      setConversations((prev) =>
        prev.map((c) => c.conversation_id === conversationId ? { ...c, is_archived: !archived } : c)
      );
      toast.error("Failed to update archive");
    }
  };

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Archive filter
    if (filter === "archived") {
      filtered = filtered.filter((conv) => conv.is_archived);
    } else {
      // Hide archived by default
      filtered = filtered.filter((conv) => !conv.is_archived);

      // Apply type filter (only for models)
      if (filter !== "all" && actorType === "model") {
        filtered = filtered.filter((conv) => {
          const participant = conv.otherParticipants[0];
          const info = getParticipantInfo(participant);
          if (filter === "fans") return info.type === "fan";
          if (filter === "brands") return info.type === "brand";
          return true;
        });
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((conv) => {
        const participant = conv.otherParticipants[0];
        const info = getParticipantInfo(participant);
        return (
          info.displayName.toLowerCase().includes(query) ||
          (info.username && info.username.toLowerCase().includes(query))
        );
      });
    }

    // Sort: pinned first, then by latest message
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aTime = a.lastMessage?.created_at || "";
      const bTime = b.lastMessage?.created_at || "";
      return bTime.localeCompare(aTime);
    });
  }, [conversations, searchQuery, filter, actorType]);

  // Use DB-tracked unread count (more reliable than client-side timestamp comparison)
  const unreadCount = useMemo(() => {
    return conversations
      .filter((conv) => !conv.is_archived)
      .reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  }, [conversations]);

  // Count by participant type (for model tabs)
  const archivedCount = useMemo(() => {
    return conversations.filter((conv) => conv.is_archived).length;
  }, [conversations]);

  const typeCounts = useMemo(() => {
    const counts = { fans: 0, brands: 0 };
    conversations.filter((c) => !c.is_archived).forEach((conv) => {
      const participant = conv.otherParticipants[0];
      const info = getParticipantInfo(participant);
      if (info.type === "fan") counts.fans++;
      else if (info.type === "brand") counts.brands++;
    });
    return counts;
  }, [conversations]);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Stats Bar - hidden in compact mode */}
      {!compact && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-pink-500/10 text-pink-500 hover:bg-pink-500/20">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      )}

      {/* Search */}
      <div className={cn("relative", compact && "px-3")}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" style={compact ? { left: '1.5rem' } : undefined} />
        <Input
          placeholder="Search conversations..."
          className={cn("pl-10 h-11", compact && "h-9 text-sm")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs (only for models) */}
      {actorType === "model" && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className={cn("w-full grid grid-cols-4", compact && "mx-3 w-[calc(100%-1.5rem)]")}>
            <TabsTrigger value="all" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="fans" className="gap-1.5">
              <Users className="h-4 w-4" />
              Fans
              {typeCounts.fans > 0 && (
                <span className="ml-0.5 text-xs text-muted-foreground">({typeCounts.fans})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-1.5">
              <Building2 className="h-4 w-4" />
              Brands
              {typeCounts.brands > 0 && (
                <span className="ml-0.5 text-xs text-muted-foreground">({typeCounts.brands})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5">
              <Archive className="h-4 w-4" />
              {archivedCount > 0 && (
                <span className="text-xs text-muted-foreground">({archivedCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Conversations List */}
      {filteredConversations.length > 0 ? (
        <div className={cn("space-y-2", compact && "space-y-1 px-2")}>
          {filteredConversations.map((conv) => {
            const participant = conv.otherParticipants[0];
            const { displayName, avatarUrl, type } = getParticipantInfo(participant);
            const convUnread = conv.unread_count || 0;
            const isUnread = convUnread > 0;
            const isSelected = conv.conversation_id === selectedId;

            return (
              <SwipeableConversationItem
                key={conv.conversation_id}
                isPinned={conv.is_pinned}
                isArchived={conv.is_archived}
                onPin={() => handlePin(conv.conversation_id, !conv.is_pinned)}
                onArchive={() => handleArchive(conv.conversation_id, !conv.is_archived)}
              >
              <div className="relative group/conv">
                <Link
                  href={`/chats/${conv.conversation_id}`}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md active:scale-[0.98] active:opacity-90",
                    isSelected
                      ? "bg-pink-500/10 border-pink-500/30 ring-1 ring-pink-500/20"
                      : isUnread
                        ? "bg-pink-500/5 border-pink-500/20 hover:border-pink-500/30"
                        : "bg-card hover:bg-muted/50 border-border",
                    compact && "p-3 rounded-lg gap-3"
                  )}
                >
                  <div className="relative">
                    <Avatar className={cn("h-12 w-12 ring-2 ring-background", compact && "h-10 w-10")}>
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className={cn(
                        "text-white font-semibold",
                        type === "admin" ? "bg-gradient-to-br from-violet-500 to-purple-600" :
                        type === "model" ? "bg-gradient-to-br from-pink-500 to-rose-600" :
                        type === "brand" ? "bg-gradient-to-br from-amber-500 to-orange-600" :
                        "bg-gradient-to-br from-blue-500 to-cyan-600"
                      )}>
                        {type === "admin" ? "EXA" : displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isUnread && !isSelected && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {conv.is_pinned && (
                          <Pin className="h-3 w-3 text-pink-500 flex-shrink-0 -rotate-45" />
                        )}
                        <p className={cn(
                          "font-semibold truncate",
                          isUnread && "text-foreground"
                        )}>
                          {displayName}
                        </p>
                        {type === "admin" && (
                          <Sparkles className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                        )}
                        {type === "brand" && (
                          <Building2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {convUnread > 0 && !isSelected && (
                          <Badge variant="secondary" className="bg-pink-500 text-white text-[10px] h-5 min-w-5 px-1.5 justify-center">
                            {convUnread > 99 ? "99+" : convUnread}
                          </Badge>
                        )}
                        {conv.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(conv.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={cn(
                        "text-sm truncate mt-0.5 flex items-center gap-1",
                        isUnread ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {isTipMessage(conv.lastMessage) && (
                        <Coins className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                      {!conv.lastMessage?.is_system && conv.lastMessage?.media_url && !conv.lastMessage?.content && (
                        conv.lastMessage.media_type?.startsWith("image/") ? (
                          <Camera className="h-3 w-3 text-pink-500 flex-shrink-0" />
                        ) : conv.lastMessage.media_type?.startsWith("video/") ? (
                          <Video className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        ) : conv.lastMessage.media_type?.startsWith("audio/") ? (
                          <Mic className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        ) : null
                      )}
                      <span className="truncate">{getMessagePreview(conv.lastMessage)}</span>
                    </p>
                  </div>
                </Link>

                {/* Pin / Archive context menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover/conv:opacity-100 transition-opacity z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm border"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.preventDefault()}>
                      <DropdownMenuItem onClick={() => handlePin(conv.conversation_id, !conv.is_pinned)}>
                        <Pin className="h-4 w-4 mr-2" />
                        {conv.is_pinned ? "Unpin" : "Pin conversation"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(conv.conversation_id, !conv.is_archived)}>
                        {conv.is_archived ? (
                          <><ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive</>
                        ) : (
                          <><Archive className="h-4 w-4 mr-2" /> Archive</>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              </SwipeableConversationItem>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            {searchQuery ? (
              <>
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  No conversations match &quot;{searchQuery}&quot;
                </p>
              </>
            ) : (
              <>
                <div className="p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 mb-4">
                  <MessageCircle className="h-8 w-8 text-pink-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {actorType === "model"
                    ? "When fans message you, conversations will appear here"
                    : "Start a conversation by visiting a model's profile"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
