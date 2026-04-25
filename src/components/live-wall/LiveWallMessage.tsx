"use client";

import { Fragment, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trash2, Pin, Coins } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

export interface LiveWallMessageData {
  id: string;
  actor_id: string | null;
  actor_type: string;
  display_name: string;
  avatar_url: string | null;
  profile_slug: string | null;
  content: string;
  message_type: string;
  reactions: Record<string, string[]>;
  image_url: string | null;
  image_type: string | null;
  is_pinned: boolean;
  tip_total: number;
  created_at: string;
}

const ACTOR_BADGE_STYLES: Record<string, string> = {
  model: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  fan: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  brand: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const ALLOWED_EMOJIS = ["🔥", "❤️", "👑"] as const;

/** Tip glow tier — lower thresholds for micro-tip economy */
function getTipTier(tipTotal: number): "none" | "amber" | "gradient" | "animated" {
  if (tipTotal >= 100) return "animated";
  if (tipTotal >= 50) return "gradient";
  if (tipTotal >= 10) return "amber";
  return "none";
}

/** Parse content and render @mentions as pink links */
function renderContentWithMentions(content: string) {
  if (!content) return null;
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          href={`/models/${username}`}
          className="text-pink-400 font-semibold hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Check if system message is a tip or milestone event */
function isTipSystemMessage(content: string): boolean {
  return (
    (content.includes(" tipped ") && content.includes(" coins!")) ||
    content.includes(" coins received")
  );
}

/** Coin tip button: tap = 1 coin micro-tip, long-press (500ms) = open super tip picker */
function CoinTipButton({
  tipTotal,
  onTip,
  onSuperTip,
  displayName,
  disabled,
}: {
  tipTotal: number;
  onTip: () => Promise<boolean>;
  onSuperTip: () => void;
  displayName: string;
  disabled?: boolean;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [isPressed, setIsPressed] = useState(false);
  const [flyups, setFlyups] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef(0);

  const cancelLongPress = useCallback(() => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startLongPress = useCallback(() => {
    if (disabled) return;
    didLongPress.current = false;
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setIsPressed(false);
      onSuperTip();
    }, 500);
  }, [onSuperTip, disabled]);

  const endPress = useCallback(async () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!didLongPress.current && !disabled) {
      // Only animate if the tip was actually initiated (not blocked by balance/state checks)
      const tipInitiated = await onTip();
      if (tipInitiated) {
        const id = Date.now();
        setFlyups((prev) => [...prev, id]);
        setTimeout(() => setFlyups((prev) => prev.filter((f) => f !== id)), 900);
        // Show "Hold for Super Tip" hint on first 3 taps
        tapCount.current += 1;
        if (tapCount.current <= 3) {
          setShowHint(true);
          if (hintTimer.current) clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(() => setShowHint(false), 5000);
        }
      }
    }
  }, [onTip, disabled]);

  return (
    <div className="relative inline-flex">
      <button
        onTouchStart={startLongPress}
        onTouchEnd={(e) => { e.preventDefault(); endPress(); }}
        onTouchCancel={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={endPress}
        onMouseLeave={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
        className={cn(
          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs select-none",
          "transition-all duration-200",
          disabled && "opacity-40 cursor-not-allowed",
          !disabled && tipTotal > 0
            ? "bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30"
            : !disabled
              ? "bg-white/5 border border-white/10 opacity-60 hover:opacity-100"
              : "",
          isPressed && "scale-125 bg-amber-500/40 border-amber-500/50 shadow-lg shadow-amber-500/20 opacity-100"
        )}
        title="Tap to tip 1 coin · Hold for super tip"
        aria-label={`Tip ${displayName}`}
      >
        <span className={cn("text-sm transition-transform duration-200", isPressed && "scale-110")}>
          💰
        </span>
        {tipTotal > 0 && (
          <span className="text-[10px] text-amber-400 font-semibold">
            {tipTotal.toLocaleString()}
          </span>
        )}
      </button>

      {/* Inline "+1" flyup animations */}
      {flyups.map((id) => (
        <span
          key={id}
          className="absolute -top-1 left-1/2 -translate-x-1/2 text-amber-400 text-xs font-bold pointer-events-none animate-tip-flyup"
        >
          +1
        </span>
      ))}

      {/* "Hold for Super Tip" hint tooltip */}
      {showHint && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-black/90 border border-amber-500/40 text-amber-300 text-[10px] font-medium pointer-events-none animate-fade-in shadow-lg shadow-amber-500/10 z-20">
          Hold for Super Tip 💎
        </span>
      )}
    </div>
  );
}

interface Props {
  message: LiveWallMessageData;
  currentActorId?: string | null;
  isAdmin?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, pin: boolean) => void;
  onTip?: (messageId: string) => Promise<boolean>;
  onSuperTip?: (messageId: string) => void;
  isTipping?: boolean;
  isPinnedDisplay?: boolean;
  /** Rendered inline next to the tip button so it anchors right above it */
  tipPickerSlot?: React.ReactNode;
}

export function LiveWallMessage({
  message,
  currentActorId,
  isAdmin,
  onReact,
  onDelete,
  onPin,
  onTip,
  onSuperTip,
  isTipping,
  isPinnedDisplay,
  tipPickerSlot,
}: Props) {
  // System messages
  if (message.message_type === "system") {
    const isTipEvent = isTipSystemMessage(message.content);
    return (
      <div className="flex items-center gap-2 py-1.5 px-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
        {isTipEvent ? (
          <span className="text-xs font-medium text-amber-400/80 whitespace-nowrap flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {message.content}
          </span>
        ) : (
          <span className="text-xs text-white/40 italic whitespace-nowrap">
            {message.content}
          </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
      </div>
    );
  }

  const timeAgo = formatDistanceToNowStrict(new Date(message.created_at), {
    addSuffix: false,
  });
  const badgeStyle = ACTOR_BADGE_STYLES[message.actor_type] || "";
  const tipTier = getTipTier(message.tip_total || 0);

  const profileHref =
    message.profile_slug && message.actor_type === "model"
      ? `/models/${message.profile_slug}`
      : null;

  const nameElement = profileHref ? (
    <Link
      href={profileHref}
      className="text-sm font-bold text-white truncate max-w-[140px] hover:text-pink-400 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      {message.display_name}
    </Link>
  ) : (
    <span className="text-sm font-bold text-white truncate max-w-[140px]">
      {message.display_name}
    </span>
  );

  const isOwnMessage = currentActorId && message.actor_id === currentActorId;
  const canTip = message.actor_id && !isOwnMessage;

  const messageInner = (
    <div
      className={cn(
        "group flex gap-3 py-2.5 px-3 rounded-xl transition-colors relative",
        tipTier === "none" && "hover:bg-white/[0.02]",
        tipTier === "amber" && "bg-amber-500/[0.04]",
        tipTier === "gradient" && "bg-gradient-to-r from-amber-500/[0.04] via-pink-500/[0.04] to-amber-500/[0.04]",
        tipTier === "animated" && "bg-gradient-to-r from-amber-500/[0.06] via-pink-500/[0.06] to-violet-500/[0.06]"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0 mt-0.5 ring-2 ring-pink-500/50">
        <AvatarImage src={message.avatar_url || undefined} />
        <AvatarFallback className="bg-muted text-white/60 text-sm">
          {message.display_name.replace("@", "")[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {nameElement}
          {badgeStyle && (
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0 rounded-full border capitalize leading-4",
                badgeStyle
              )}
            >
              {message.actor_type}
            </span>
          )}
          <span className="text-[10px] text-white/30">{timeAgo}</span>

          {/* Actions: admin only (tip moved to reactions row) */}
          <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 ml-auto flex items-center gap-1 transition-all">
            {/* Admin pin */}
            {isAdmin && (
              <button
                onClick={() => onPin?.(message.id, !message.is_pinned)}
                className={cn(
                  "text-white/20 hover:text-amber-400 transition-colors",
                  message.is_pinned && "text-amber-400 opacity-100"
                )}
                title={message.is_pinned ? "Unpin" : "Pin"}
                aria-label={message.is_pinned ? "Unpin message" : "Pin message"}
              >
                <Pin className="h-3 w-3" />
              </button>
            )}
            {/* Delete (own message or admin) */}
            {(isOwnMessage || isAdmin) && (
              <button
                onClick={() => onDelete?.(message.id)}
                className="text-white/20 hover:text-red-400 transition-colors"
                title="Delete message"
                aria-label="Delete message"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Text with mentions */}
        {message.content && (
          <p className="text-[15px] text-white/85 break-words leading-relaxed mt-0.5">
            {renderContentWithMentions(message.content)}
          </p>
        )}

        {/* Image / GIF */}
        {message.image_url && (
          <div className="mt-1.5 max-w-[240px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.image_url}
              alt=""
              className="rounded-lg max-h-[200px] w-auto object-cover border border-white/10"
              loading="lazy"
            />
          </div>
        )}

        {/* Reactions + Tip */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {ALLOWED_EMOJIS.map((emoji) => {
            const actors = message.reactions?.[emoji] || [];
            const hasReacted = currentActorId
              ? actors.includes(currentActorId)
              : false;
            return (
              <button
                key={emoji}
                onClick={() => onReact?.(message.id, emoji)}
                aria-label={`React with ${emoji}`}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all",
                  actors.length > 0
                    ? hasReacted
                      ? "bg-pink-500/20 border border-pink-500/30"
                      : "bg-white/5 border border-white/10"
                    : "bg-white/5 border border-white/10 opacity-60 hover:opacity-100"
                )}
              >
                <span className="text-sm">{emoji}</span>
                {actors.length > 0 && (
                  <span
                    className={cn(
                      "text-[10px]",
                      hasReacted ? "text-pink-400" : "text-white/40"
                    )}
                  >
                    {actors.length}
                  </span>
                )}
              </button>
            );
          })}
          {/* Coin tip button — tap = 1 coin, long-press = super tip picker */}
          {canTip && (
            <div className="relative">
              <CoinTipButton
                tipTotal={message.tip_total || 0}
                onTip={() => onTip?.(message.id) ?? Promise.resolve(false)}
                onSuperTip={() => onSuperTip?.(message.id)}
                displayName={message.display_name}
                disabled={isTipping}
              />
              {tipPickerSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Pinned display: gradient border wrapper
  if (isPinnedDisplay) {
    return (
      <div className="mx-2 mt-2 rounded-xl bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 p-[1px]">
        <div className="rounded-xl bg-black/90">
          <div className="flex items-center gap-1.5 px-3 pt-1.5">
            <Pin className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-400">Pinned</span>
          </div>
          {messageInner}
        </div>
      </div>
    );
  }

  // Tip tier gradient border wrappers
  if (tipTier === "gradient") {
    return (
      <div className="mx-1 rounded-lg bg-gradient-to-r from-amber-500/40 via-pink-500/40 to-amber-500/40 p-[1px]">
        <div className="rounded-lg bg-black/80">{messageInner}</div>
      </div>
    );
  }

  if (tipTier === "animated") {
    return (
      <div className="mx-1 rounded-lg bg-gradient-to-r from-amber-400 via-pink-500 to-violet-500 p-[1px] animate-gradient bg-[length:200%_100%]">
        <div className="rounded-lg bg-black/80">{messageInner}</div>
      </div>
    );
  }

  if (tipTier === "amber") {
    return (
      <div className="mx-1 rounded-lg border border-amber-500/30">
        {messageInner}
      </div>
    );
  }

  return messageInner;
}
