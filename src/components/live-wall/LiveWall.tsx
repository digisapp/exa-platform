"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LiveWallMessage,
  type LiveWallMessageData,
} from "./LiveWallMessage";
import { LiveWallInput } from "./LiveWallInput";
import { toast } from "sonner";
import { MessageSquare, ChevronDown } from "lucide-react";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";

interface CurrentUser {
  actorId: string;
  actorType: string;
}

interface Props {
  initialMessages: LiveWallMessageData[];
  currentUser: CurrentUser | null;
}

export function LiveWall({ initialMessages, currentUser }: Props) {
  const [messages, setMessages] = useState<LiveWallMessageData[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase.channel("live-wall");

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_wall_messages",
        },
        (payload) => {
          const newMsg = payload.new as LiveWallMessageData;
          setMessages((prev) => {
            // Dedupe — avoid adding if already present (optimistic add)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            // Keep only last 50
            return updated.slice(-50);
          });
          if (!isOpenRef.current) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_wall_messages",
        },
        (payload) => {
          const updated = payload.new as LiveWallMessageData & {
            is_deleted: boolean;
          };
          setMessages((prev) =>
            updated.is_deleted
              ? prev.filter((m) => m.id !== updated.id)
              : prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Send message
  const handleSend = useCallback(async (content: string) => {
    try {
      const res = await fetch("/api/live-wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    }
  }, []);

  // React to message
  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUser) {
        setShowAuthDialog(true);
        return;
      }

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...m.reactions };
          const actors = [...(reactions[emoji] || [])];
          const idx = actors.indexOf(currentUser.actorId);
          if (idx !== -1) {
            actors.splice(idx, 1);
          } else {
            actors.push(currentUser.actorId);
          }
          if (actors.length === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = actors;
          }
          return { ...m, reactions };
        })
      );

      try {
        const res = await fetch("/api/live-wall/react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, emoji }),
        });
        if (!res.ok) throw new Error("Failed");
      } catch {
        // Realtime will fix state
      }
    },
    [currentUser]
  );

  // Admin delete
  const handleDelete = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await fetch(`/api/live-wall?id=${messageId}`, { method: "DELETE" });
    } catch {
      // Realtime will fix state
    }
  }, []);

  const isAdmin = currentUser?.actorType === "admin";

  return (
    <>
      {/* Auth dialog (invisible trigger) */}
      {showAuthDialog && (
        <FanSignupDialog>
          <span
            ref={(el) => {
              if (el) {
                el.click();
                setShowAuthDialog(false);
              }
            }}
          />
        </FanSignupDialog>
      )}

      {/* ── Mobile: floating pill + slide-up panel ── */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-pink-500/25 hover:scale-105 transition-transform"
          >
            <MessageSquare className="h-4 w-4" />
            EXA Live
            {isConnected && (
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}

        {isOpen && (
          <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="mx-2 mb-2 rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl shadow-pink-500/10 overflow-hidden max-h-[70vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">EXA Live</span>
                  {isConnected && (
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-[200px] max-h-[50vh]"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-8">
                    <p className="text-sm text-white/30">
                      No messages yet. Be the first!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <LiveWallMessage
                      key={msg.id}
                      message={msg}
                      currentActorId={currentUser?.actorId}
                      isAdmin={isAdmin}
                      onReact={handleReact}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>

              {/* Input */}
              <LiveWallInput
                isLoggedIn={!!currentUser}
                onSend={handleSend}
                onAuthPrompt={() => setShowAuthDialog(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop: inline section ── */}
      <div className="hidden md:block">
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <MessageSquare className="h-4 w-4 text-pink-400" />
            <span className="text-sm font-bold text-white">EXA Live</span>
            {isConnected && (
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            )}
            <span className="ml-auto text-[10px] text-white/30">
              {messages.length} messages
            </span>
          </div>

          {/* Messages */}
          <div
            ref={!isOpen ? scrollRef : undefined}
            className="overflow-y-auto p-2 space-y-0.5 h-[360px]"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-white/30">
                  No messages yet. Be the first!
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <LiveWallMessage
                  key={msg.id}
                  message={msg}
                  currentActorId={currentUser?.actorId}
                  isAdmin={isAdmin}
                  onReact={handleReact}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          {/* Input */}
          <LiveWallInput
            isLoggedIn={!!currentUser}
            onSend={handleSend}
            onAuthPrompt={() => setShowAuthDialog(true)}
          />
        </div>
      </div>
    </>
  );
}
