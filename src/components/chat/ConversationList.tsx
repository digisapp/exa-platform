"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  conversation_id: string;
  last_read_at: string | null;
  lastMessage: {
    content: string;
    created_at: string;
  } | null;
  otherParticipants: Array<{
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
      };
    }
    if (participant?.fan) {
      return {
        displayName: participant.fan.display_name || "Fan",
        avatarUrl: participant.fan.avatar_url,
        username: null,
      };
    }
    // Admin/system account
    if (participant?.type === "admin") {
      return {
        displayName: "EXA Team",
        avatarUrl: null,
        username: null,
      };
    }
    return {
      displayName: "Unknown",
      avatarUrl: null,
      username: null,
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

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chats..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Conversations List */}
      <Card>
        <CardContent className="p-0 divide-y">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const participant = conv.otherParticipants[0];
              const { displayName, avatarUrl } = getParticipantInfo(participant);
              const isUnread =
                conv.lastMessage &&
                (!conv.last_read_at ||
                  new Date(conv.lastMessage.created_at) > new Date(conv.last_read_at));

              return (
                <Link
                  key={conv.conversation_id}
                  href={`/chats/${conv.conversation_id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback>
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium truncate ${isUnread ? "text-foreground" : ""}`}>
                        {displayName}
                      </p>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm truncate ${
                        isUnread ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" />
                  )}
                </Link>
              );
            })
          ) : (
            <div className="p-8 text-center">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-1">No chats found</h3>
                  <p className="text-sm text-muted-foreground">
                    No conversations match &quot;{searchQuery}&quot;
                  </p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium mb-1">No chats yet</h3>
                  <p className="text-sm text-muted-foreground">
                    {actorType === "model"
                      ? "When fans or brands message you, conversations will appear here"
                      : "Start a conversation by visiting a model's profile"
                    }
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
