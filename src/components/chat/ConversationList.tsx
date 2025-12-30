"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, MessageSquare, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Conversation {
  conversation_id: string;
  last_read_at: string | null;
  lastMessage: {
    content: string;
    created_at: string;
    sender_id: string;
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
  }>;
}

interface ConversationListProps {
  conversations: Conversation[];
  actorType?: string;
}

export function ConversationList({ conversations, actorType }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to get display name and avatar for a participant
  const getParticipantInfo = (participant: Conversation["otherParticipants"][0]) => {
    if (participant?.model) {
      return {
        displayName: participant.model.first_name
          ? `${participant.model.first_name} ${participant.model.last_name || ""}`.trim()
          : participant.model.username,
        avatarUrl: participant.model.profile_photo_url,
        username: participant.model.username,
        type: "model",
      };
    }
    if (participant?.fan) {
      return {
        displayName: participant.fan.display_name || "Fan",
        avatarUrl: participant.fan.avatar_url,
        username: null,
        type: "fan",
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
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const participant = conv.otherParticipants[0];
      const info = getParticipantInfo(participant);

      return (
        info.displayName.toLowerCase().includes(query) ||
        (info.username && info.username.toLowerCase().includes(query))
      );
    });
  }, [conversations, searchQuery]);

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
                    </div>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm truncate mt-0.5",
                      isUnread ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {conv.lastMessage?.content || "No messages yet"}
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
