"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LiveWallMessage,
  type LiveWallMessageData,
} from "./LiveWallMessage";
import { LiveWallInput } from "./LiveWallInput";
import { toast } from "sonner";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";

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
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isExpanded) scrollToBottom();
  }, [messages, isExpanded, scrollToBottom]);

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
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            return updated.slice(-50);
          });
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
      {/* Auth prompt dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md bg-black/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center">
              Join the conversation
            </DialogTitle>
            <DialogDescription className="text-white/50 text-center">
              Sign in or create an account to chat on EXA Live
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/signin" className="w-full">
              <Button className="w-full exa-gradient-button rounded-full h-11">
                Sign In
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/30">or sign up as</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ModelSignupDialog>
                <Button
                  variant="outline"
                  className="w-full rounded-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50"
                >
                  Model
                </Button>
              </ModelSignupDialog>
              <FanSignupDialog>
                <Button
                  variant="outline"
                  className="w-full rounded-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                >
                  Fan
                </Button>
              </FanSignupDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Live Wall — visible on both mobile and desktop */}
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
        {/* Header (clickable to expand/collapse on mobile) */}
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-full flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02] cursor-pointer md:cursor-default"
        >
          <MessageSquare className="h-4 w-4 text-pink-400" />
          <span className="text-sm font-bold text-white">EXA Live</span>
          {isConnected && (
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          )}
          <span className="ml-auto text-[10px] text-white/30 mr-2">
            {messages.length} messages
          </span>
          {/* Expand/collapse chevron (mobile only) */}
          <span className="md:hidden text-white/30">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {/* Messages + Input (collapsible) */}
        {isExpanded && (
          <>
            <div
              ref={scrollRef}
              className="overflow-y-auto p-2 space-y-0.5 h-[280px] md:h-[360px]"
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

            <LiveWallInput
              isLoggedIn={!!currentUser}
              onSend={handleSend}
              onAuthPrompt={() => setShowAuthDialog(true)}
            />
          </>
        )}
      </div>
    </>
  );
}
