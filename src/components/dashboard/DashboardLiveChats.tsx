"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ArrowUpRight, ImageIcon, Mic, Video } from "lucide-react";

type ChatItem = {
  conversationId: string;
  name: string;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  mediaType: string | null;
  unreadCount: number;
  isSystem: boolean;
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mediaLabel(mediaType: string | null) {
  if (!mediaType) return null;
  if (mediaType.startsWith("image"))
    return (
      <span className="flex items-center gap-1 text-white/50">
        <ImageIcon className="h-3 w-3" /> Photo
      </span>
    );
  if (mediaType.startsWith("video"))
    return (
      <span className="flex items-center gap-1 text-white/50">
        <Video className="h-3 w-3" /> Video
      </span>
    );
  if (mediaType.startsWith("audio"))
    return (
      <span className="flex items-center gap-1 text-white/50">
        <Mic className="h-3 w-3" /> Voice
      </span>
    );
  return null;
}

export function DashboardLiveChats({ chats }: { chats: ChatItem[] }) {
  const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-semibold">EXA Live Chats</h2>
          {totalUnread > 0 && (
            <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {totalUnread}
            </span>
          )}
        </div>
        <Link
          href="/chats"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {chats.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="p-4 rounded-full bg-white/5 inline-block mb-3">
              <MessageCircle className="h-7 w-7 text-white/30" />
            </div>
            <p className="text-sm text-white/60">No conversations yet</p>
            <p className="text-xs text-white/40 mt-1">
              Messages from fans and brands will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {chats.map((chat) => (
              <Link
                key={chat.conversationId}
                href={`/chats/${chat.conversationId}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors group"
              >
                {/* Avatar */}
                {chat.avatar ? (
                  <Image
                    src={chat.avatar}
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                    <span className="text-sm font-bold text-white/70">
                      {chat.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm truncate ${
                        chat.unreadCount > 0
                          ? "font-semibold text-white"
                          : "font-medium text-white/80"
                      }`}
                    >
                      {chat.name}
                    </span>
                    <span className="text-[10px] text-white/40 shrink-0">
                      {getTimeAgo(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-xs truncate ${
                        chat.unreadCount > 0
                          ? "text-white/70"
                          : "text-white/40"
                      }`}
                    >
                      {chat.isSystem
                        ? "System message"
                        : chat.lastMessage
                          ? chat.lastMessage
                          : chat.mediaType
                            ? mediaLabel(chat.mediaType)
                            : "Sent media"}
                    </p>
                  </div>
                </div>

                {/* Unread badge */}
                {chat.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                    {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
