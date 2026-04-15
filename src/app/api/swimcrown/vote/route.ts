import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const voteSchema = z.object({
  contestant_id: z.string().uuid("Invalid contestant ID"),
  coins: z.number().int().min(1, "Minimum 1 coin").max(100, "Maximum 100 coins"),
});

// POST - Cast a vote for a SwimCrown contestant
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "game", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate input
    const validationResult = voteSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { contestant_id, coins } = validationResult.data;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "No actor found" }, { status: 400 });
    }

    const actorId = actor.id;

    // Get current competition
    const { data: competition } = await (supabase as any)
      .from("swimcrown_competitions")
      .select("id, status")
      .order("year", { ascending: false })
      .limit(1)
      .single();

    if (!competition) {
      return NextResponse.json(
        { error: "No active competition found" },
        { status: 404 }
      );
    }

    if (!["voting", "accepting_entries"].includes(competition.status)) {
      return NextResponse.json(
        { error: "Voting is not currently open" },
        { status: 400 }
      );
    }

    // Get coin balance based on actor type
    let coinBalance = 0;

    if (actor.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      coinBalance = model?.coin_balance || 0;
    } else if (actor.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      coinBalance = fan?.coin_balance || 0;
    } else if (actor.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      coinBalance = brand?.coin_balance || 0;
    }

    if (coinBalance < coins) {
      return NextResponse.json(
        {
          error: `Not enough coins. You have ${coinBalance}, need ${coins}.`,
          needCoins: true,
        },
        { status: 402 }
      );
    }

    // Cast vote via RPC (atomically deducts coins and records vote)
    const { data: voteResult, error: voteError } = await (supabase as any).rpc(
      "cast_swimcrown_vote",
      {
        p_voter_actor_id: actorId,
        p_contestant_id: contestant_id,
        p_competition_id: competition.id,
        p_coins: coins,
      }
    );

    if (voteError) {
      logger.error("SwimCrown vote error", voteError);
      return NextResponse.json(
        { error: "Failed to cast vote" },
        { status: 500 }
      );
    }

    // Check RPC result — it returns {success: false, error: ...} on failure
    if (voteResult && voteResult.success === false) {
      const rpcError = voteResult.error || "Vote failed";
      if (rpcError === "insufficient_coins") {
        return NextResponse.json(
          { error: "Not enough coins", needCoins: true },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: rpcError },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      voteCount: voteResult?.new_vote_count ?? null,
      newBalance: coinBalance - coins,
      coinsSpent: coins,
    });
  } catch (error) {
    logger.error("SwimCrown vote error", error);
    return NextResponse.json(
      { error: "Failed to cast vote" },
      { status: 500 }
    );
  }
}
