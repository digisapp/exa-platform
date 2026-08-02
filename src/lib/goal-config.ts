/**
 * Model tip goals — one public goal per model, every tip counts toward it.
 *
 * progress_coins is trigger-maintained (trg_model_goal_progress on
 * coin_transactions, 20260802000003) from tip_received +
 * live_wall_tip_received — never write it from app code. Bounds here are
 * duplicated in the table CHECK constraints; change the two together.
 *
 * Product guardrails:
 * - The goal target is the model's own public number — fine to show.
 *   Individual fan contributions are spend data and never surface.
 * - v1 reward delivery is the model's promise (she posts/blasts it when
 *   the goal completes) — no escrow, no automated content unlock.
 */

export const GOAL_MIN_COINS = 100;
export const GOAL_MAX_COINS = 100000;
export const GOAL_REWARD_MAX_LEN = 140;

/** Suggested targets for the dashboard creation form. */
export const GOAL_PRESETS = [500, 1000, 2500, 5000] as const;

export type ModelGoalStatus = "active" | "completed" | "cancelled";

export interface ModelGoal {
  id: string;
  reward_text: string;
  target_coins: number;
  progress_coins: number;
  status: ModelGoalStatus;
  completed_at: string | null;
  created_at: string;
}

/** Clamped 0–100 integer percent for meter widths and labels. */
export function goalPercent(goal: Pick<ModelGoal, "progress_coins" | "target_coins">): number {
  if (goal.target_coins <= 0) return 0;
  return Math.min(100, Math.floor((goal.progress_coins / goal.target_coins) * 100));
}
