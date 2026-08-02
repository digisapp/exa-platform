import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { sendPushToActor } from "@/lib/push";

/**
 * Fire the one-time celebration for a model's completed tip goal: a public
 * Live Wall system line + a push to the model ('earnings' toggle). Called
 * from the two tip routes after a successful tip — the trigger has already
 * flipped status to 'completed' by then; this claims `celebrated` with a
 * conditional update so concurrent tips can't double-post.
 *
 * No bell row: notifications feed items are reconstructed from
 * coin_transactions money actions (see earning-notifications.ts) and a
 * goal completion has no ledger row — inserting one would ghost the badge.
 *
 * Never throws — a missed celebration must never fail the tip.
 */
export async function maybeCelebrateGoalCompletion(
  service: SupabaseClient<any>,
  modelActorId: string
): Promise<void> {
  try {
    const { data: claimed } = await (service as any)
      .from("model_goals")
      .update({ celebrated: true })
      .eq("model_actor_id", modelActorId)
      .eq("status", "completed")
      .eq("celebrated", false)
      .select("id, reward_text, target_coins");

    const goal = claimed?.[0];
    if (!goal) return;

    const { data: actor } = await (service as any)
      .from("actors")
      .select("user_id")
      .eq("id", modelActorId)
      .single();

    let username: string | null = null;
    if (actor?.user_id) {
      const { data: model } = await (service as any)
        .from("models")
        .select("username")
        .eq("user_id", actor.user_id)
        .maybeSingle();
      username = model?.username ?? null;
    }
    const wallName = username ? `@${username}` : "A model";

    const { error: wallError } = await (service as any)
      .from("live_wall_messages")
      .insert({
        actor_type: "system",
        display_name: "EXA",
        content: `🎯 ${wallName} hit their ${goal.target_coins.toLocaleString()}-coin goal — ${goal.reward_text}! 🎉`,
        message_type: "system",
      });
    if (wallError) {
      logger.error("Goal celebration wall insert error", wallError);
    }

    await sendPushToActor(
      modelActorId,
      {
        title: "🎯 Goal reached!",
        body: `Your supporters hit your ${goal.target_coins.toLocaleString()}-coin goal — time to deliver: ${goal.reward_text}`,
        url: "/dashboard",
        tag: `goal-complete-${goal.id}`,
      },
      "earnings"
    );
  } catch (error) {
    logger.error("Goal celebration error", error);
  }
}
