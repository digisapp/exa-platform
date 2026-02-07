import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const BOOST_COST = 5;
const REVEAL_COST = 10;
const SUPER_COST = 20;
const BOOST_MULTIPLIER = 5;
const SUPER_MULTIPLIER = 10;

// POST - Record a vote
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user?.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    const {
      model_id,
      vote_type,
      boost = false,
      reveal = false,
      super_boost = false,
      fingerprint,
      session_id,
    } = body;

    // Validate required fields
    if (!model_id || !vote_type) {
      return NextResponse.json(
        { error: "model_id and vote_type are required" },
        { status: 400 }
      );
    }

    if (!["like", "pass"].includes(vote_type)) {
      return NextResponse.json(
        { error: "vote_type must be 'like' or 'pass'" },
        { status: 400 }
      );
    }

    // Get actor_id if logged in
    let actorId = null;
    let coinBalance = 0;

    if (user) {
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single();

      actorId = actor?.id;

      // Get coin balance based on actor type
      if (actor?.type === "model") {
        const { data: model } = await supabase
          .from("models")
          .select("coin_balance")
          .eq("user_id", user.id)
          .single();
        coinBalance = model?.coin_balance || 0;
      } else if (actor?.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("user_id", user.id)
          .single();
        coinBalance = fan?.coin_balance || 0;
      } else if (actor?.type === "brand") {
        const { data: brand } = await supabase
          .from("brands")
          .select("coin_balance")
          .eq("user_id", user.id)
          .single();
        coinBalance = brand?.coin_balance || 0;
      }
    }

    // Calculate points and cost
    let points = 1;
    let coinsToSpend = 0;
    let isBoosted = false;
    let isRevealed = false;
    let isSuperBoosted = false;

    if (vote_type === "like") {
      if (super_boost) {
        // Super boost - 10x points, reveal, priority
        if (!user) {
          return NextResponse.json(
            { error: "Sign in to super boost this model" },
            { status: 401 }
          );
        }
        if (coinBalance < SUPER_COST) {
          return NextResponse.json(
            { error: `Not enough coins. Need ${SUPER_COST} coins.`, needCoins: true },
            { status: 402 }
          );
        }
        coinsToSpend = SUPER_COST;
        points = SUPER_MULTIPLIER;
        isBoosted = true;
        isRevealed = true;
        isSuperBoosted = true;
      } else if (reveal) {
        // Reveal includes boost
        if (!user) {
          return NextResponse.json(
            { error: "Sign in to reveal yourself to this model" },
            { status: 401 }
          );
        }
        if (coinBalance < REVEAL_COST) {
          return NextResponse.json(
            { error: `Not enough coins. Need ${REVEAL_COST} coins.`, needCoins: true },
            { status: 402 }
          );
        }
        coinsToSpend = REVEAL_COST;
        points = BOOST_MULTIPLIER;
        isBoosted = true;
        isRevealed = true;
      } else if (boost) {
        if (!user) {
          return NextResponse.json(
            { error: "Sign in to boost this model" },
            { status: 401 }
          );
        }
        if (coinBalance < BOOST_COST) {
          return NextResponse.json(
            { error: `Not enough coins. Need ${BOOST_COST} coins.`, needCoins: true },
            { status: 402 }
          );
        }
        coinsToSpend = BOOST_COST;
        points = BOOST_MULTIPLIER;
        isBoosted = true;
      }
    }

    // Deduct coins if needed
    if (coinsToSpend > 0 && actorId) {
      const { data: deductResult, error: deductError } = await supabase.rpc(
        "deduct_coins",
        {
          p_actor_id: actorId,
          p_amount: coinsToSpend,
          p_action: isSuperBoosted ? "exa_boost_super" : isRevealed ? "exa_boost_reveal" : "exa_boost",
          p_metadata: { model_id, game: "exa_boost", is_super: isSuperBoosted },
        }
      );

      if (deductError || !deductResult) {
        return NextResponse.json(
          { error: "Failed to deduct coins" },
          { status: 500 }
        );
      }
    }

    // Record the vote
    const { data: voteResult, error: voteError } = await supabase.rpc(
      "record_top_model_vote",
      {
        p_voter_id: actorId,
        p_voter_fingerprint: fingerprint,
        p_model_id: model_id,
        p_vote_type: vote_type,
        p_points: points,
        p_is_boosted: isBoosted,
        p_is_revealed: isRevealed,
        p_coins_spent: coinsToSpend,
      }
    );

    if (voteError) {
      console.error("Vote error:", voteError);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }

    // Mark model as swiped in session
    if (session_id) {
      // Get total models count
      const { count } = await supabase
        .from("models")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", true)
        .not("profile_photo_url", "is", null);

      await supabase.rpc("mark_model_swiped", {
        p_session_id: session_id,
        p_model_id: model_id,
        p_total_models: count || 0,
      });
    }

    // Send notification to model if revealed
    if (isRevealed && user) {
      // Get voter's name
      let voterName = "Someone";
      const { data: actor } = await supabase
        .from("actors")
        .select("type")
        .eq("user_id", user.id)
        .single();

      if (actor?.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("name, username")
          .eq("user_id", user.id)
          .single();
        voterName = fan?.name || fan?.username || "A fan";
      } else if (actor?.type === "brand") {
        const { data: brand } = await supabase
          .from("brands")
          .select("company_name")
          .eq("user_id", user.id)
          .single();
        voterName = brand?.company_name || "A brand";
      }

      // Get model's actor_id for notification
      const { data: model } = await supabase
        .from("models")
        .select("user_id")
        .eq("id", model_id)
        .single();

      if (model?.user_id) {
        const { data: modelActor } = await supabase
          .from("actors")
          .select("id")
          .eq("user_id", model.user_id)
          .single();

        if (modelActor) {
          const notificationTitle = isSuperBoosted ? "SUPER BOOST!" : "You got boosted!";
          const notificationBody = isSuperBoosted
            ? `${voterName} gave you a SUPER BOOST in EXA Boost! You gained ${points} points!`
            : `${voterName} boosted you in EXA Boost! You gained ${points} points.`;

          await supabase.from("notifications").insert({
            actor_id: modelActor.id,
            type: isSuperBoosted ? "exa_boost_super" : "exa_boost",
            title: notificationTitle,
            body: notificationBody,
            data: { game: "exa_boost", points, voter_revealed: true, is_super: isSuperBoosted },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      vote_id: voteResult?.vote_id,
      points_awarded: vote_type === "like" ? points : 0,
      coins_spent: coinsToSpend,
      new_balance: coinBalance - coinsToSpend,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}
