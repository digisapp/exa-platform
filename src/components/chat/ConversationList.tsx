"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    model: {
      first_name: string | null;
      last_name: string | null;
      username: string;
      profile_photo_url: string | null;
    } | null;
  }>;
}

interface ConversationListProps {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const otherPerson = conv.otherParticipants[0]?.model;
      if (!otherPerson) return false;

      const displayName = otherPerson.first_name
        ? `${otherPerson.first_name} ${otherPerson.last_name || ""}`.trim()
        : otherPerson.username;

      return (
        displayName.toLowerCase().includes(query) ||
        otherPerson.username.toLowerCase().includes(query)
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
              const otherPerson = conv.otherParticipants[0]?.model;
              const displayName = otherPerson?.first_name
                ? `${otherPerson.first_name} ${otherPerson.last_name || ""}`.trim()
                : otherPerson?.username || "Unknown";
              const isUnread =
                conv.lastMessage &&
                (!conv.last_read_at ||
                  new Date(conv.lastMessage.created_at) > new Date(conv.last_read_at));

              return (
                <Link
                  key={conv.conversation_id}
                  href={`/messages/${conv.conversation_id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherPerson?.profile_photo_url || undefined} />
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
                  <h3 className="font-medium mb-1">No messages yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a conversation to connect with models
                  </p>
                  <Button asChild>
                    <Link href="/models">Browse Models</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
