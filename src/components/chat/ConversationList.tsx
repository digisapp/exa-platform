"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Search, MessageSquare, Sparkles, Users, Building2 } from "lucide-react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Conversation {
  conversation_id: string;
  last_read_at: string | null;
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
}

type FilterType = "all" | "fans" | "brands";

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

export function ConversationList({ conversations, actorType }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

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
        displayName: participant.fan?.display_name || "Fan",
        avatarUrl: participant.fan?.avatar_url || null,
        username: null,
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

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

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

    return filtered;
  }, [conversations, searchQuery, filter, actorType]);

  // Count unread messages
  const unreadCount = useMemo(() => {
    return conversations.filter((conv) => {
      return (
        conv.lastMessage &&
        (!conv.last_read_at ||
          new Date(conv.lastMessage.created_at) > new Date(conv.last_read_at))
      );
    }).length;
  }, [conversations]);

  // Count by participant type (for model tabs)
  const typeCounts = useMemo(() => {
    const counts = { fans: 0, brands: 0 };
    conversations.forEach((conv) => {
      const participant = conv.otherParticipants[0];
      const info = getParticipantInfo(participant);
      if (info.type === "fan") counts.fans++;
      else if (info.type === "brand") counts.brands++;
    });
    return counts;
  }, [conversations]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          className="pl-10 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs (only for models) */}
      {actorType === "model" && (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="fans" className="gap-2">
              <Users className="h-4 w-4" />
              Fans
              {typeCounts.fans > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({typeCounts.fans})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-2">
              <Building2 className="h-4 w-4" />
              Brands
              {typeCounts.brands > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({typeCounts.brands})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Conversations List */}
      {filteredConversations.length > 0 ? (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const participant = conv.otherParticipants[0];
            const { displayName, avatarUrl, type } = getParticipantInfo(participant);
            const isUnread =
              conv.lastMessage &&
              (!conv.last_read_at ||
                new Date(conv.lastMessage.created_at) > new Date(conv.last_read_at));

            return (
              <Link
                key={conv.conversation_id}
                href={`/chats/${conv.conversation_id}`}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md",
                  isUnread
                    ? "bg-pink-500/5 border-pink-500/20 hover:border-pink-500/30"
                    : "bg-card hover:bg-muted/50 border-border"
                )}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-background">
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
                  {isUnread && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
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
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatMessageTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm truncate mt-0.5",
                      isUnread ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {getMessagePreview(conv.lastMessage)}
                  </p>
                </div>
              </Link>
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
