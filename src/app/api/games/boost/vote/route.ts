import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

const BOOST_COST = 5;
const REVEAL_COST = 10;
const SUPER_COST = 20;
const BOOST_MULTIPLIER = 5;
const SUPER_MULTIPLIER = 10;
// Safety ceiling for a single play cycle; matches SESSION_DECK_CAP in the deck
// route. A cycle normally completes when the full eligible roster is swiped
// (min() below resolves to the roster size), not when this ceiling is hit.
const SESSION_DECK_CAP = 1000;

// Total swipeable models, cached in-module so we don't run a COUNT(*) on
// every swipe. Only used for session-completion tracking, so slight staleness
// is fine.
let totalModelsCache: { value: number; expiresAt: number } | null = null;

async function getTotalSwipeableModels(): Promise<number> {
  if (totalModelsCache && totalModelsCache.expiresAt > Date.now()) {
    return totalModelsCache.value;
  }
  const { count } = await adminClient
    .from("models")
    .select("id", { count: "exact", head: true })
    .eq("is_approved", true)
    .is("deleted_at", null)
    .not("profile_photo_url", "is", null);
  totalModelsCache = { value: count || 0, expiresAt: Date.now() + 5 * 60 * 1000 };
  return totalModelsCache.value;
}

// POST - Record a vote
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rateLimitResponse = await checkEndpointRateLimit(request, "game", user?.id);
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

    // Every vote must ride on a session — it's the unit of dedupe and the
    // cooldown/cycle tracker. Session-less scripted voting used to bypass
    // both entirely.
    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Load the session and verify it belongs to the caller. Sessions are
    // keyed the same way get_or_create_top_model_session keys them: by
    // auth user id once claimed, by browser fingerprint while anonymous
    // (anonymous play stays fully supported — no auth required).
    const { data: sessionRow } = await adminClient
      .from("top_model_sessions")
      .select("id, user_id, fingerprint, models_swiped, completed_at")
      .eq("id", session_id)
      .maybeSingle();

    if (!sessionRow) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // user_id takes precedence (a claimed session never falls back to
    // fingerprint — same device, different account must not match); anon
    // sessions match on fingerprint only.
    const ownsSession = sessionRow.user_id
      ? user?.id === sessionRow.user_id
      : Boolean(fingerprint && sessionRow.fingerprint === fingerprint);

    if (!ownsSession) {
      return NextResponse.json(
        { error: "This session doesn't belong to you" },
        { status: 403 }
      );
    }

    // Completed sessions are in (or past) their 24h cooldown. Past-cooldown
    // sessions get reset by get_or_create_top_model_session on the next deck
    // fetch, so votes only ever land on an open cycle.
    if (sessionRow.completed_at) {
      return NextResponse.json(
        { error: "This play cycle is complete. Come back after the reset!" },
        { status: 409 }
      );
    }

    // Duplicate guard (advisory fast-path; mark_model_swiped enforces this
    // atomically below): a session can only swipe each model once per cycle
    if (sessionRow.models_swiped?.includes(model_id)) {
      return NextResponse.json(
        { error: "You've already swiped on this model" },
        { status: 409 }
      );
    }

    // Validate the target model exists and is visible before anything is charged
    const { data: targetModel } = await adminClient
      .from("models")
      .select("id, user_id, is_approved, deleted_at, profile_photo_url")
      .eq("id", model_id)
      .maybeSingle();

    if (
      !targetModel ||
      !targetModel.is_approved ||
      targetModel.deleted_at ||
      !targetModel.profile_photo_url
    ) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      );
    }

    // Get actor_id if logged in
    let actorId = null;
    let actorType: string | null = null;
    let coinBalance = 0;

    if (user) {
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single();

      actorId = actor?.id;
      actorType = actor?.type ?? null;

      if (actorId) {
        const suspended = await assertNotSuspended(actorId);
        if (suspended) return suspended;
      }

      // Get coin balance based on actor type
      if (actor?.type === "model") {
        // Service client: coin_balance not column-granted to client roles (Phase B2 lockdown)
        const { data: model } = await adminClient
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

    // No self-boosting: models can't award points to themselves
    if (user && targetModel.user_id === user.id && vote_type === "like") {
      return NextResponse.json(
        { error: "You can't boost yourself" },
        { status: 403 }
      );
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

    // Refund helper for failure paths after the deduct has happened.
    // Returns false only when the refund itself failed (already logged).
    const refundCoins = async (reason: string): Promise<boolean> => {
      if (coinsToSpend <= 0 || !actorId) return true;
      const { data: refundResult, error: refundError } = await (adminClient as any).rpc(
        "add_coins",
        {
          p_actor_id: actorId,
          p_amount: coinsToSpend,
          p_action: "exa_boost_refund",
          p_metadata: {
            model_id,
            game: "exa_boost",
            reason,
            is_super: isSuperBoosted,
          },
        }
      );
      if (refundError || !refundResult) {
        logger.error(
          "CRITICAL: exa_boost refund failed — coins deducted with no vote recorded",
          { actorId, model_id, coinsToSpend, reason, refundError }
        );
        return false;
      }
      return true;
    };

    // Duplicate guard: one paid boost per model per actor per day
    if (coinsToSpend > 0 && actorId) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: existingBoost } = await adminClient
        .from("top_model_votes")
        .select("id")
        .eq("voter_id", actorId)
        .eq("model_id", model_id)
        .eq("is_boosted", true)
        .gte("created_at", todayStart.toISOString())
        .limit(1);

      if (existingBoost && existingBoost.length > 0) {
        return NextResponse.json(
          { error: "You've already boosted this model today. Come back tomorrow!" },
          { status: 409 }
        );
      }
    }

    // Deduct coins if needed.
    // Uses the service-role client: the route has already authenticated the user
    // and derived actorId server-side, and EXECUTE on deduct_coins is revoked
    // from authenticated/anon.
    if (coinsToSpend > 0 && actorId) {
      const { data: deductResult, error: deductError } = await adminClient.rpc(
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

    // Mark the model as swiped BEFORE recording the vote: mark_model_swiped
    // (20260712100004) atomically refuses duplicate appends and any append
    // to a completed session, so it is the per-(session, model) dedupe gate —
    // leaderboard points are only recorded when this call actually recorded
    // a new swipe. Completion basis is the full eligible roster (min()
    // resolves to the roster size unless it somehow exceeds the safety
    // ceiling) — server-derived so a client can't shrink it into an instant
    // completion. Only after every eligible model is swiped does the 24h
    // cooldown begin. Service-role client: the RPC is REVOKEd from
    // authenticated/anon (ownership was verified above).
    const totalModels = await getTotalSwipeableModels();
    const { data: swipeRpcData, error: swipeError } = await adminClient.rpc(
      "mark_model_swiped",
      {
        p_session_id: session_id,
        p_model_id: model_id,
        p_total_models: Math.min(SESSION_DECK_CAP, totalModels),
      }
    );
    const swipeResult = swipeRpcData as Record<string, any> | null;

    if (swipeError) {
      logger.error("Swipe record error", swipeError);
      const refunded = await refundCoins("swipe_record_failed");
      return NextResponse.json(
        {
          error: refunded && coinsToSpend > 0
            ? "Failed to record vote. Your coins have been refunded."
            : refunded
              ? "Failed to record vote"
              : "Failed to record vote and the automatic refund failed. Please contact support.",
        },
        { status: 500 }
      );
    }

    if (!swipeResult?.newly_swiped) {
      // Lost a race with a concurrent duplicate (or the session just
      // completed): nothing was recorded, so no points are awarded.
      await refundCoins("duplicate_swipe");
      return NextResponse.json(
        { error: "You've already swiped on this model" },
        { status: 409 }
      );
    }

    // Record the vote via service-role client: record_top_model_vote is REVOKEd
    // from authenticated/anon so the leaderboard points/coins_spent can't be
    // forged by calling the RPC directly. Points are computed server-side above.
    const { data: voteRpcData, error: voteError } = await (adminClient as any).rpc(
      "record_top_model_vote",
      {
        p_voter_id: actorId ?? null,
        p_voter_fingerprint: fingerprint ?? null,
        p_model_id: model_id,
        p_vote_type: vote_type,
        p_points: points,
        p_is_boosted: isBoosted,
        p_is_revealed: isRevealed,
        p_coins_spent: coinsToSpend,
      }
    );
    const voteResult = voteRpcData as Record<string, any> | null;

    if (voteError) {
      logger.error("Vote error", voteError);

      // Best-effort: un-mark the swipe so a retry isn't blocked by the
      // dedupe gate for a vote that never earned points. If this failed
      // swipe was the one that completed the cycle, reopen it too.
      try {
        const { data: staleSession } = await adminClient
          .from("top_model_sessions")
          .select("models_swiped, completed_at")
          .eq("id", session_id)
          .single();
        if (staleSession?.models_swiped?.includes(model_id)) {
          await (adminClient.from("top_model_sessions") as any)
            .update({
              models_swiped: staleSession.models_swiped.filter(
                (id: string) => id !== model_id
              ),
              ...(swipeResult?.completed && staleSession.completed_at
                ? { completed_at: null }
                : {}),
            })
            .eq("id", session_id);
        }
      } catch (unmarkError) {
        logger.error("Failed to un-mark swipe after vote record failure", unmarkError);
      }

      // The user already paid — refund before surfacing the failure
      if (coinsToSpend > 0 && actorId) {
        const refunded = await refundCoins("vote_record_failed");

        if (!refunded) {
          return NextResponse.json(
            { error: "Failed to record vote and the automatic refund failed. Please contact support." },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { error: "Failed to record vote. Your coins have been refunded." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }

    // Right-swipes from fans also follow the model — feed-building is the
    // point of the game. Idempotent, and a failure never fails the vote.
    let followed = false;
    if (actorId && actorType === "fan" && vote_type === "like" && targetModel.user_id && targetModel.user_id !== user?.id) {
      try {
        const { data: modelActor } = await adminClient
          .from("actors")
          .select("id")
          .eq("user_id", targetModel.user_id)
          .single();

        if (modelActor && modelActor.id !== actorId) {
          const { error: followError } = await (adminClient.from("follows") as any).upsert(
            { follower_id: actorId, following_id: modelActor.id },
            { onConflict: "follower_id,following_id", ignoreDuplicates: true }
          );
          if (followError) {
            logger.error("Boost follow error", followError);
          } else {
            followed = true;
          }
        }
      } catch (followError) {
        logger.error("Boost follow error", followError);
      }
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
          .select("display_name, username")
          .eq("user_id", user.id)
          .single();
        voterName = fan?.display_name || fan?.username || "A fan";
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
            ? `${voterName} gave you a SUPER BOOST in EXA Spotlight! You gained ${points} points!`
            : `${voterName} boosted you in EXA Spotlight! You gained ${points} points.`;

          // as any needed: notification uses actor_id/body/data fields and exa_boost type not in typed schema
          await (supabase.from("notifications") as any).insert({
            actor_id: modelActor.id,
            type: isSuperBoosted ? "exa_boost_super" : "exa_boost",
            title: notificationTitle,
            body: notificationBody,
            data: { game: "exa_boost", points, voter_revealed: true, is_super: isSuperBoosted },
          });
        }
      }
    }

    // Re-read the balance after the deduct so the client gets the real value
    let newBalance = coinBalance;
    if (coinsToSpend > 0 && actorId) {
      const balanceTable = actorType === "fan" ? "fans" : actorType === "brand" ? "brands" : "models";
      const { data: balanceRow } = await (adminClient.from(balanceTable) as any)
        .select("coin_balance")
        .eq("id", actorId)
        .single();
      newBalance = balanceRow?.coin_balance ?? coinBalance - coinsToSpend;
    }

    return NextResponse.json({
      success: true,
      vote_id: voteResult?.vote_id,
      points_awarded: vote_type === "like" ? points : 0,
      coins_spent: coinsToSpend,
      new_balance: newBalance,
      followed,
    });
  } catch (error) {
    logger.error("Vote error", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}
