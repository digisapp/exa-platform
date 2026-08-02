"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Target, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { goalPercent, type ModelGoal } from "@/lib/goal-config";

interface Props {
  goal: ModelGoal;
  modelName: string;
  isOwner: boolean;
}

/**
 * Public tip-goal meter on the model profile. Progress updates live via a
 * postgres_changes subscription on the goal row (progress_coins is
 * trigger-maintained from the tips ledger), so a fan who tips sees the bar
 * move without a refresh — and sees the celebration state when it fills.
 *
 * Shows only the model's own public target — never who contributed or any
 * fan spend data.
 */
export function ModelGoalMeter({ goal: initialGoal, modelName, isOwner }: Props) {
  const [goal, setGoal] = useState(initialGoal);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`goal:${initialGoal.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "model_goals",
          filter: `id=eq.${initialGoal.id}`,
        },
        (payload) => {
          const updated = payload.new as Partial<ModelGoal>;
          setGoal((prev) => ({ ...prev, ...updated }));
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [initialGoal.id]);

  if (goal.status === "cancelled") return null;

  const completed = goal.status === "completed";
  const percent = completed ? 100 : goalPercent(goal);
  const remaining = Math.max(0, goal.target_coins - goal.progress_coins);

  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border p-4 overflow-hidden relative",
        completed
          ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-pink-500/10"
          : "border-pink-500/30 bg-white/[0.04]"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {completed ? (
          <PartyPopper className="h-4 w-4 text-cyan-300 shrink-0" />
        ) : (
          <Target className="h-4 w-4 text-pink-400 shrink-0" />
        )}
        <span className="text-sm font-semibold text-white truncate">
          {completed ? "Goal reached!" : isOwner ? "Your goal" : `${modelName}'s goal`}
        </span>
        <span className="ml-auto text-xs font-bold text-white/70 tabular-nums shrink-0">
          {goal.progress_coins.toLocaleString()} / {goal.target_coins.toLocaleString()} coins
        </span>
      </div>

      <p className="text-sm text-white/80 mb-3 break-words">
        {completed ? (
          <>
            Unlocked by the supporters: <span className="font-medium text-white">{goal.reward_text}</span> 🎉
          </>
        ) : (
          goal.reward_text
        )}
      </p>

      {/* Meter */}
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            completed
              ? "bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500"
              : "bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-400"
          )}
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>

      {!completed && (
        <p className="mt-2 text-[11px] text-white/50">
          {percent}% there — {remaining.toLocaleString()} coins to go.
          {!isOwner && " Every tip counts toward it."}
        </p>
      )}
    </div>
  );
}
