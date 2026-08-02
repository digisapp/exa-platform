"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Target, PartyPopper, Loader2, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GOAL_PRESETS,
  GOAL_MIN_COINS,
  GOAL_MAX_COINS,
  GOAL_REWARD_MAX_LEN,
  goalPercent,
  type ModelGoal,
} from "@/lib/goal-config";

interface Props {
  initialGoal: ModelGoal | null;
  username: string;
}

/**
 * Dashboard tip-goal manager. Three states:
 * - no goal (or cancelled/stale-completed) → creation form
 * - active → progress + share prompt + cancel
 * - freshly completed → celebration + deliver-the-reward prompt + new-goal
 *
 * All writes go through /api/goals (service role); progress_coins itself is
 * ledger-trigger-maintained and read-only here.
 */
export function ModelGoalCard({ initialGoal, username }: Props) {
  const [goal, setGoal] = useState<ModelGoal | null>(initialGoal);
  const [rewardText, setRewardText] = useState("");
  const [targetCoins, setTargetCoins] = useState<number>(GOAL_PRESETS[1]);
  const [busy, setBusy] = useState(false);

  const showActive = goal?.status === "active";
  const showCompleted =
    goal?.status === "completed" &&
    !!goal.completed_at &&
    Date.now() - new Date(goal.completed_at).getTime() < 72 * 3600_000;
  const showForm = !showActive && !showCompleted;

  const createGoal = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardText, targetCoins }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create goal");
      setGoal(data.goal);
      setRewardText("");
      toast.success("Goal is live on your profile — share it with your fans!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create goal");
    } finally {
      setBusy(false);
    }
  };

  const cancelGoal = async () => {
    if (busy || !goal) return;
    setBusy(true);
    try {
      const res = await fetch("/api/goals", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGoal({ ...goal, status: "cancelled" });
      toast("Goal cancelled");
    } catch {
      toast.error("Failed to cancel goal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl border overflow-hidden",
        showCompleted
          ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-transparent"
          : "border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent"
      )}
    >
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          {showCompleted ? (
            <PartyPopper className="h-4 w-4 text-cyan-300" />
          ) : (
            <Target className="h-4 w-4 text-pink-400" />
          )}
          <h3 className="text-sm font-semibold">Tip goal</h3>
        </div>
        {(showActive || showCompleted) && (
          <Link
            href={`/${username}`}
            className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
          >
            View on profile <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </header>

      <div className="p-4">
        {showActive && goal && (
          <>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm text-white/85 break-words">{goal.reward_text}</p>
              <button
                onClick={cancelGoal}
                disabled={busy}
                className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                title="Cancel goal"
                aria-label="Cancel goal"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400 transition-all"
                style={{ width: `${Math.max(goalPercent(goal), 3)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/50 tabular-nums">
              {goal.progress_coins.toLocaleString()} / {goal.target_coins.toLocaleString()} coins
              ({goalPercent(goal)}%) — every tip counts. Mention it in chat and on your socials.
            </p>
          </>
        )}

        {showCompleted && goal && (
          <>
            <p className="text-sm text-white/90 mb-1">
              🎉 Your supporters hit <span className="font-semibold">{goal.target_coins.toLocaleString()} coins</span>!
            </p>
            <p className="text-xs text-white/60 mb-3">
              Time to deliver: <span className="text-white/85">{goal.reward_text}</span> — post it or send a blast, then set the next goal.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGoal(null)}
              className="border-pink-500/40 text-pink-300 hover:bg-pink-500/10"
            >
              Set a new goal
            </Button>
          </>
        )}

        {showForm && (
          <>
            <p className="text-xs text-white/60 mb-3">
              Set a public goal on your profile — every tip from every fan counts toward it,
              and when it fills, the whole platform hears about it.
            </p>
            <input
              type="text"
              value={rewardText}
              onChange={(e) => setRewardText(e.target.value)}
              maxLength={GOAL_REWARD_MAX_LEN}
              placeholder='What unlocks? e.g. "Backstage photo drop from my next shoot"'
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 mb-2"
            />
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTargetCoins(preset)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
                    targetCoins === preset
                      ? "bg-pink-500/20 border-pink-400/50 text-pink-300"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                  )}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
              <input
                type="number"
                min={GOAL_MIN_COINS}
                max={GOAL_MAX_COINS}
                value={targetCoins}
                onChange={(e) => setTargetCoins(parseInt(e.target.value) || 0)}
                className="w-24 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-pink-500/50 tabular-nums"
                aria-label="Goal target in coins"
              />
              <span className="text-[11px] text-white/40">coins</span>
            </div>
            <Button
              size="sm"
              onClick={createGoal}
              disabled={busy || rewardText.trim().length < 3 || targetCoins < GOAL_MIN_COINS || targetCoins > GOAL_MAX_COINS}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Launch goal"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
