"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LiveWallMessage,
  type LiveWallMessageData,
} from "./LiveWallMessage";
import { LiveWallInput } from "./LiveWallInput";
import { toast } from "sonner";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  Volume2,
  VolumeX,
  ArrowDown,
  Coins,
} from "lucide-react";
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
import { LiveWallTipPicker } from "./LiveWallTipPicker";

interface CurrentUser {
  actorId: string;
  actorType: string;
  coinBalance: number;
}

interface Props {
  initialMessages: LiveWallMessageData[];
  currentUser: CurrentUser | null;
}

// ─── Sound ───────────────────────────────────────────────
function playChime(ctx: AudioContext) {
  try {
    if (ctx.state === "suspended") ctx.resume();

    // Two-note gentle chime: C5 → E5
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio errors
  }
}

export function LiveWall({ initialMessages, currentUser }: Props) {
  const [messages, setMessages] = useState<LiveWallMessageData[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tippingMessageId, setTippingMessageId] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState(currentUser?.coinBalance ?? 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());
  const isAtBottomRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioInitRef = useRef(false);

  // ─── Audio init on first interaction ───────────────────
  useEffect(() => {
    const stored = localStorage.getItem("liveWallSoundMuted");
    if (stored === "true") setSoundEnabled(false);

    const initAudio = () => {
      if (audioInitRef.current) return;
      audioInitRef.current = true;
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) audioCtxRef.current = new Ctx();
      } catch {
        // No audio support
      }
    };

    const events = ["touchstart", "click", "keydown"];
    const handler = () => {
      initAudio();
      events.forEach((e) => document.removeEventListener(e, handler, true));
    };
    events.forEach((e) => document.addEventListener(e, handler, true));
    return () => {
      events.forEach((e) => document.removeEventListener(e, handler, true));
    };
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("liveWallSoundMuted", (!next).toString());
      return next;
    });
  }, []);

  // ─── Scroll helpers ────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    setNewMsgCount(0);
    setIsAtBottom(true);
    isAtBottomRef.current = true;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;
    if (atBottom) setNewMsgCount(0);
  }, []);

  // Auto-scroll when at bottom and new messages arrive
  useEffect(() => {
    if (isExpanded && isAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, isExpanded, scrollToBottom]);

  // ─── Supabase Realtime (Postgres Changes + Presence) ──
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase.channel("live-wall", {
      config: { presence: { key: currentUser?.actorId || `anon-${Math.random().toString(36).slice(2)}` } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_wall_messages" },
        (payload) => {
          const newMsg = payload.new as LiveWallMessageData;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg].slice(-50);
          });

          // Sound + scroll tracking
          if (!isAtBottomRef.current) {
            setNewMsgCount((c) => c + 1);
          }

          // Play sound if not own message
          if (
            audioCtxRef.current &&
            newMsg.actor_id !== currentUser?.actorId
          ) {
            // Read enabled state directly from ref to avoid stale closure
            const muted = localStorage.getItem("liveWallSoundMuted") === "true";
            if (!muted) playChime(audioCtxRef.current);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_wall_messages" },
        (payload) => {
          const updated = payload.new as LiveWallMessageData & { is_deleted: boolean };
          setMessages((prev) =>
            updated.is_deleted
              ? prev.filter((m) => m.id !== updated.id)
              : prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      // Presence for online count
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          await channel.track({
            actor_type: currentUser?.actorType || "viewer",
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send message ──────────────────────────────────────
  const handleSend = useCallback(
    async (content: string, imageUrl?: string, imageType?: string) => {
      try {
        const res = await fetch("/api/live-wall", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, imageUrl, imageType }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send");
        }
        // Scroll to bottom after sending
        setTimeout(scrollToBottom, 100);
      } catch (err: any) {
        toast.error(err.message || "Failed to send message");
      }
    },
    [scrollToBottom]
  );

  // ─── Reactions ─────────────────────────────────────────
  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUser) {
        setShowAuthDialog(true);
        return;
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...m.reactions };
          const actors = [...(reactions[emoji] || [])];
          const idx = actors.indexOf(currentUser.actorId);
          if (idx !== -1) actors.splice(idx, 1);
          else actors.push(currentUser.actorId);
          if (actors.length === 0) delete reactions[emoji];
          else reactions[emoji] = actors;
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

  // ─── Admin: delete ─────────────────────────────────────
  const handleDelete = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await fetch(`/api/live-wall?id=${messageId}`, { method: "DELETE" });
    } catch {
      // Realtime will fix state
    }
  }, []);

  // ─── Admin: pin/unpin ──────────────────────────────────
  const handlePin = useCallback(async (messageId: string, pin: boolean) => {
    // Optimistic: unpin all, then pin target
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        is_pinned: m.id === messageId ? pin : false,
      }))
    );

    try {
      const res = await fetch("/api/live-wall/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, pin }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      toast.error("Failed to update pin");
    }
  }, []);

  // ─── Tipping ─────────────────────────────────────────
  const sendTip = useCallback(
    async (messageId: string, amount: number) => {
      try {
        const res = await fetch("/api/live-wall/tip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, amount }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 402) {
            toast.error("Not enough coins", {
              description: `You need ${data.required} coins but only have ${data.balance}`,
              action: {
                label: "Get Coins",
                onClick: () => (window.location.href = "/coins"),
              },
            });
          } else {
            toast.error(data.error || "Failed to send tip");
          }
          return;
        }

        setCoinBalance(data.newBalance);

        // Optimistic: bump tip_total in local state for instant feedback
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, tip_total: data.tipTotal } : m
          )
        );

        if (amount >= 10) {
          toast.success(`Tipped ${amount} coins!`);
        }

        // Play coin sound (short chirp for micro, ascending for big)
        if (audioCtxRef.current) {
          const ctx = audioCtxRef.current;
          try {
            if (ctx.state === "suspended") ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            if (amount >= 10) {
              // Big tip: ascending tone
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
              gain.gain.setValueAtTime(0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.3);
            } else {
              // Micro tip: quick ping
              osc.frequency.setValueAtTime(1200, ctx.currentTime);
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.1);
            }
            osc.connect(gain);
            gain.connect(ctx.destination);
          } catch {
            // ignore
          }
        }
      } catch {
        toast.error("Failed to send tip");
      }
    },
    []
  );

  // Micro-tip: 1 coin on tap
  const handleMicroTip = useCallback(
    (messageId: string) => {
      if (!currentUser) {
        setShowAuthDialog(true);
        return;
      }
      if (coinBalance < 1) {
        toast.error("Not enough coins", {
          action: {
            label: "Get Coins",
            onClick: () => (window.location.href = "/coins"),
          },
        });
        return;
      }
      // Optimistic balance deduct
      setCoinBalance((b) => b - 1);
      sendTip(messageId, 1);
    },
    [currentUser, coinBalance, sendTip]
  );

  // Super tip: open picker
  const handleSuperTipClick = useCallback(
    (messageId: string) => {
      if (!currentUser) {
        setShowAuthDialog(true);
        return;
      }
      setTippingMessageId((prev) => (prev === messageId ? null : messageId));
    },
    [currentUser]
  );

  const handleSuperTipSend = useCallback(
    async (amount: number) => {
      if (!tippingMessageId) return;
      await sendTip(tippingMessageId, amount);
      setTippingMessageId(null);
    },
    [tippingMessageId, sendTip]
  );

  const isAdmin = currentUser?.actorType === "admin";
  const isFan = currentUser?.actorType === "fan";
  const pinnedMessage = messages.find((m) => m.is_pinned);
  const tippingMessage = tippingMessageId
    ? messages.find((m) => m.id === tippingMessageId)
    : null;

  return (
    <>
      {/* Auth prompt dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md border-violet-500/20 shadow-xl shadow-violet-500/10 bg-gradient-to-b from-[#1a1025] to-[#0f0a18] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white text-center flex items-center justify-center gap-2">
              <MessageSquare className="h-5 w-5 text-pink-500" /> Join the conversation
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center">
              Sign in or create an account to chat on EXA Live Chat
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/signin" className="w-full">
              <Button className="w-full rounded-full h-11 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold shadow-lg shadow-pink-500/20 transition-all hover:shadow-pink-500/30">
                Sign In
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-500/15" />
              <span className="text-xs text-muted-foreground">or sign up as</span>
              <div className="h-px flex-1 bg-violet-500/15" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ModelSignupDialog>
                <Button
                  variant="outline"
                  className="w-full rounded-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50 transition-all"
                >
                  Model
                </Button>
              </ModelSignupDialog>
              <FanSignupDialog>
                <Button
                  variant="outline"
                  className="w-full rounded-full border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all"
                >
                  Fan
                </Button>
              </FanSignupDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Inline Live Wall ── */}
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/10 bg-gradient-to-r from-pink-500/[0.03] to-violet-500/[0.03]">
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2.5 md:cursor-default"
          >
            <MessageSquare className="h-5 w-5 text-pink-400" />
            <span className="text-base font-bold text-white">EXA Live Chat</span>
            {isConnected && (
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* Online count */}
            {onlineCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <Eye className="h-3 w-3" />
                {onlineCount} watching
              </span>
            )}

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className="text-white/30 hover:text-white/60 transition-colors"
              title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Expand/collapse (mobile) */}
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="md:hidden text-white/30"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Messages + Input (collapsible) */}
        {isExpanded && (
          <>
            {/* Pinned message (above scroll) */}
            {pinnedMessage && (
              <LiveWallMessage
                message={pinnedMessage}
                currentActorId={currentUser?.actorId}
                isAdmin={isAdmin}
                onReact={handleReact}
                onDelete={handleDelete}
                onPin={handlePin}
                onTip={handleMicroTip}
                onSuperTip={handleSuperTipClick}
                isPinnedDisplay
              />
            )}

            {/* Scrollable message area */}
            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="overflow-y-auto p-3 space-y-1 h-[380px] md:h-[480px]"
              >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-white/30">
                      {isFan ? "No messages yet. Stay tuned!" : "No messages yet. Be the first!"}
                    </p>
                  </div>
                ) : (
                  messages
                    .filter((m) => !m.is_pinned) // Don't show pinned in scroll area
                    .map((msg) => (
                      <div key={msg.id} className="relative">
                        <LiveWallMessage
                          message={msg}
                          currentActorId={currentUser?.actorId}
                          isAdmin={isAdmin}
                          onReact={handleReact}
                          onDelete={handleDelete}
                          onPin={handlePin}
                          onTip={handleMicroTip}
                          onSuperTip={handleSuperTipClick}
                        />
                        {/* Super Tip picker (anchored to message, opens on long-press) */}
                        {tippingMessageId === msg.id && tippingMessage && (
                          <LiveWallTipPicker
                            recipientName={tippingMessage.display_name}
                            coinBalance={coinBalance}
                            onTip={handleSuperTipSend}
                            onClose={() => setTippingMessageId(null)}
                          />
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Scroll-to-bottom pill */}
              {!isAtBottom && newMsgCount > 0 && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-pink-500/90 text-white text-xs font-semibold backdrop-blur-sm shadow-lg flex items-center gap-1.5 hover:bg-pink-500 transition-colors z-10"
                >
                  <ArrowDown className="h-3 w-3" />
                  {newMsgCount} new message{newMsgCount > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {isFan ? (
              <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <Eye className="h-4 w-4" />
                  <span>React & tip to support your favorite models</span>
                </div>
                <Link
                  href="/coins"
                  className="flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors shrink-0"
                >
                  <Coins className="h-3 w-3" />
                  <span>{coinBalance.toLocaleString()}</span>
                </Link>
              </div>
            ) : (
              <LiveWallInput
                isLoggedIn={!!currentUser}
                onSend={handleSend}
                onAuthPrompt={() => setShowAuthDialog(true)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
