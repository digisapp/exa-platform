"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Heart, Loader2, Send, X } from "lucide-react";

/**
 * Spotlight admirers — aggregate-only "N fans liked you this week" card.
 *
 * PRIVACY IS THE CONSTRAINT: the fan-side Spotlight UI markets a plain
 * right-swipe as anonymous (BoostModal), so this surface NEVER shows who
 * liked — only counts. The thank-you blast goes to a server-resolved
 * audience (/api/spotlight/thank-blast) the model never sees individually,
 * and shares the regular blast's 1-per-hour budget.
 *
 * The dashboard RSC only mounts this when weekLikes > 0 (zero-state renders
 * nothing — the dashboard is deliberately decluttered). Informational card,
 * NOT a NudgeSlot occupant: the slot is for action-required nudges.
 */

const DEFAULT_MESSAGE =
  "Hey! I saw the Spotlight love this week — thank you for the like, it truly made my day 💖";

export function SpotlightAdmirers({
  weekLikes,
  allTimeLikes,
}: {
  weekLikes: number;
  allTimeLikes: number;
}) {
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendBlast = async () => {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/spotlight/thank-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setComposing(false);
        if ((data.sentCount || 0) > 0) {
          setSent(true);
          toast.success(
            `Thank-you sent to ${data.sentCount} fan${data.sentCount === 1 ? "" : "s"} 💌`
          );
        } else {
          toast.info(
            "This week's likes came from anonymous browsers — no inboxes to reach yet"
          );
        }
      } else {
        toast.error(data.error || "Couldn't send right now — try again in a bit");
      }
    } catch {
      toast.error("Couldn't send right now — try again in a bit");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-fuchsia-500/[0.06] to-transparent overflow-hidden shadow-[0_0_16px_rgba(236,72,153,0.1)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-pink-500/15 ring-1 ring-pink-500/30 flex items-center justify-center">
          <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {weekLikes} fan{weekLikes === 1 ? "" : "s"} liked you in Spotlight this week
          </p>
          <p className="text-xs text-white/60 truncate">
            {allTimeLikes > weekLikes ? `${allTimeLikes.toLocaleString()} likes all-time · ` : ""}
            likes stay anonymous — but you can still say thanks
          </p>
        </div>
        {sent ? (
          <span className="shrink-0 text-xs font-semibold text-emerald-400">
            Sent ✓
          </span>
        ) : (
          <button
            onClick={() => setComposing((c) => !c)}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white hover:from-pink-400 hover:to-fuchsia-400 transition-all shadow-[0_0_12px_rgba(236,72,153,0.35)]"
          >
            <Send className="h-3.5 w-3.5" />
            Send a thank-you blast
          </button>
        )}
      </div>

      {composing && !sent && (
        <div className="px-4 pb-4 space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full rounded-xl bg-white/[0.04] border border-white/10 focus:border-pink-500/50 focus:outline-none px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none"
            placeholder={DEFAULT_MESSAGE}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-white/40 leading-snug">
              Delivered privately to everyone who liked you this week — who
              they are stays anonymous. One blast per hour.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setComposing(false)}
                aria-label="Cancel thank-you blast"
                className="h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={sendBlast}
                disabled={sending || message.trim().length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white hover:from-pink-400 hover:to-fuchsia-400 transition-all disabled:opacity-50"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
