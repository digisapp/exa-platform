import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { cleanMessage } from "@/lib/profanity";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  GOAL_MIN_COINS,
  GOAL_MAX_COINS,
  GOAL_REWARD_MAX_LEN,
} from "@/lib/goal-config";

const adminClient = createServiceRoleClient();

const createSchema = z.object({
  rewardText: z
    .string()
    .trim()
    .min(3, "Describe the reward (3+ characters)")
    .max(GOAL_REWARD_MAX_LEN, `Reward is too long (${GOAL_REWARD_MAX_LEN} char max)`),
  targetCoins: z
    .number()
    .int()
    .min(GOAL_MIN_COINS, `Minimum goal is ${GOAL_MIN_COINS} coins`)
    .max(GOAL_MAX_COINS, `Maximum goal is ${GOAL_MAX_COINS.toLocaleString()} coins`),
});

/** Resolve the calling user to a claimed model actor, or null. */
async function getModelActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "model") return null;
  return { userId: user.id, actorId: actor.id };
}

const GOAL_COLUMNS =
  "id, reward_text, target_coins, progress_coins, status, completed_at, created_at";

/** GET — the model's current goal (active, or the most recent one). */
export async function GET() {
  try {
    const caller = await getModelActor();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: goal } = await (adminClient as any)
      .from("model_goals")
      .select(GOAL_COLUMNS)
      .eq("model_actor_id", caller.actorId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ goal: goal ?? null });
  } catch (error) {
    logger.error("Goal GET error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST — create the model's goal (one active at a time). */
export async function POST(request: NextRequest) {
  try {
    const caller = await getModelActor();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "general",
      caller.userId
    );
    if (rateLimitResponse) return rateLimitResponse;

    const validation = createSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const rewardText = cleanMessage(validation.data.rewardText);

    const { data: goal, error } = await (adminClient as any)
      .from("model_goals")
      .insert({
        model_actor_id: caller.actorId,
        reward_text: rewardText,
        target_coins: validation.data.targetCoins,
      })
      .select(GOAL_COLUMNS)
      .single();

    if (error) {
      // Partial unique index: one active goal per model
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already have an active goal — finish or cancel it first" },
          { status: 409 }
        );
      }
      logger.error("Goal insert error", error);
      return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
    }

    return NextResponse.json({ success: true, goal });
  } catch (error) {
    logger.error("Goal POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE — cancel the model's active goal (history row stays). */
export async function DELETE() {
  try {
    const caller = await getModelActor();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await (adminClient as any)
      .from("model_goals")
      .update({ status: "cancelled" })
      .eq("model_actor_id", caller.actorId)
      .eq("status", "active");

    if (error) {
      logger.error("Goal cancel error", error);
      return NextResponse.json({ error: "Failed to cancel goal" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Goal DELETE error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
