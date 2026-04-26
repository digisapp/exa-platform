"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Coins, UserPlus, MessageCircle, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/app/api/notifications/feed/route";

interface Props {
  initialUnreadCount?: number;
}

function timeAgo(date: string) {
  try {
    return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
}

function FeedRow({ item }: { item: FeedItem }) {
  const href =
    item.type === "message" && item.conversationId
      ? `/chats/${item.conversationId}`
      : item.type === "follower" && item.actor?.username
        ? `/${item.actor.username}`
        : item.type === "tip"
          ? "/wallet"
          : "/dashboard";

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors group"
    >
      {/* Avatar or icon */}
      <div className="shrink-0">
        {item.actor?.avatar ? (
          <Image
            src={item.actor.avatar}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center",
            item.type === "tip" && "bg-amber-500/15 ring-1 ring-amber-500/30",
            item.type === "follower" && "bg-pink-500/15 ring-1 ring-pink-500/30",
            item.type === "message" && "bg-blue-500/15 ring-1 ring-blue-500/30",
          )}>
            {item.type === "tip" && <Coins className="h-4 w-4 text-amber-400" />}
            {item.type === "follower" && <UserPlus className="h-4 w-4 text-pink-400" />}
            {item.type === "message" && <MessageCircle className="h-4 w-4 text-blue-400" />}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white/80 leading-snug truncate">
          <span className="font-semibold text-white">
            {item.actor?.name || "Someone"}
          </span>{" "}
          {item.type === "tip" && (
            <span className="text-white/60">
              tipped you{" "}
              <span className="text-amber-400 font-semibold">{item.amount} coins</span>
            </span>
          )}
          {item.type === "follower" && (
            <span className="text-white/60">followed you</span>
          )}
          {item.type === "message" && (
            <span className="text-white/60">sent a message</span>
          )}
        </p>
        {item.type === "message" && item.messagePreview && (
          <p className="text-[11px] text-white/35 truncate mt-0.5">
            &ldquo;{item.messagePreview}&rdquo;
          </p>
        )}
      </div>

      {/* Time */}
      <span className="text-[10px] text-white/30 shrink-0 group-hover:text-white/50 transition-colors">
        {timeAgo(item.createdAt)}
      </span>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-9 h-9 rounded-full bg-white/[0.06] shrink-0 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-white/[0.06] rounded animate-pulse w-3/4" />
        <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export function NotificationBell({ initialUnreadCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/feed");
      if (!res.ok) return;
      const data = await res.json();
      setFeed(data.feed ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount for an up-to-date badge count
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Refresh feed when opening
      fetchFeed().catch(() => {});
      // Mark all read (fire-and-forget) and clear badge immediately
      if (unreadCount > 0) {
        setUnreadCount(0);
        fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="relative w-80 p-0 bg-[#120a24]/97 backdrop-blur-xl border-violet-500/30 shadow-2xl shadow-violet-500/15 rounded-2xl overflow-hidden"
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-sm font-semibold text-white">Activity</span>
          </div>
          {unreadCount === 0 && fetched && feed.length > 0 && (
            <span className="text-[10px] text-white/30">All caught up</span>
          )}
        </div>

        {/* Feed */}
        <div className="py-1.5 max-h-[380px] overflow-y-auto">
          {loading && !fetched ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-white/10 mb-2" />
              <p className="text-sm text-white/30">No activity this week</p>
            </div>
          ) : (
            feed.map((item) => <FeedRow key={item.id} item={item} />)
          )}
        </div>

        {/* Footer */}
        {feed.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/[0.07]">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="text-[11px] text-white/40 hover:text-pink-400 transition-colors"
            >
              View all on dashboard →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
