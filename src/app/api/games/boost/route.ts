import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import crypto from "crypto";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

/**
 * Fisher-Yates shuffle using crypto.randomInt for unbiased randomness.
 * Returns the first `count` elements from a securely shuffled copy of the array.
 */
function secureShufflePop<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// A play cycle lets the user swipe through the ENTIRE eligible roster (every
// approved, non-deleted model with a profile photo) before the 24h cooldown
// resets the deck — so every model with a picture is guaranteed exposure each
// cycle, not just a capped subset. SESSION_DECK_CAP is a safety ceiling that
// matches the eligible-fetch limit below; completion normally happens when the
// roster is exhausted, not when the cap is hit. Models are served PAGE_SIZE at
// a time and the client pages through via hasMore, so we never ship the whole
// roster in one response. Within each page we front-load the least-exposed
// eligible models and fill the rest at random.
const SESSION_DECK_CAP = 1000;
const PAGE_SIZE = 30;
const LOW_EXPOSURE_COUNT = 13;

// GET - Fetch models for the swipe game
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "game");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // as any needed: nullable field mismatches with RPC parameters and Json results
    const supabase: any = await createClient();
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get("fingerprint");

    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Get or create session
    const { data: sessionData, error: sessionError } = await supabase.rpc(
      "get_or_create_top_model_session",
      {
        p_user_id: user?.id ?? null,
        p_fingerprint: fingerprint,
      }
    );

    if (sessionError) {
      logger.error("Session error", sessionError);
    }

    const session = (sessionData as {
      session_id: string | null;
      can_swipe: boolean;
      models_swiped: number;
      total_models: number;
      next_reset_at: string | null;
      current_streak: number;
      longest_streak: number;
      last_play_date: string | null;
    }) || {
      session_id: null,
      can_swipe: true,
      models_swiped: 0,
      total_models: 0,
      next_reset_at: null,
      current_streak: 0,
      longest_streak: 0,
      last_play_date: null,
    };

    // If can't swipe, return early with session info
    if (!session.can_swipe) {
      return NextResponse.json({
        models: [],
        hasMore: false,
        session: {
          canSwipe: false,
          modelsSwiped: session.models_swiped,
          totalModels: session.total_models,
          nextResetAt: session.next_reset_at,
          sessionId: session.session_id,
          currentStreak: session.current_streak,
          longestStreak: session.longest_streak,
          lastPlayDate: session.last_play_date,
        },
      });
    }

    // Get swiped model IDs from session
    let swipedIds: string[] = [];
    if (session.session_id) {
      const { data: sessionRow } = await supabase
        .from("top_model_sessions")
        .select("models_swiped")
        .eq("id", session.session_id)
        .single();
      swipedIds = sessionRow?.models_swiped || [];
    }

    // Serve one page at a time, bounded by how many models are left in this
    // cycle before the session cap. Normally the cap isn't the limiter — the
    // eligible roster running out is (handled by the empty-deck branch below).
    const remainingInSession = Math.max(0, SESSION_DECK_CAP - swipedIds.length);
    const deckTarget = Math.min(PAGE_SIZE, remainingInSession);

    // Fetch eligible models. Already-swiped exclusion happens in JS below —
    // putting the swiped IDs in the query itself (`.not("id", "in", ...)`)
    // ships the whole list in the GET query string, which grows with every
    // swipe toward the full roster and blows request-line limits around ~200
    // swiped models, 500ing the fetch and bricking the session mid-cycle.
    const query = supabase
      .from("models")
      .select(`
        id,
        username,
        profile_photo_url,
        city,
        state,
        focus_tags,
        is_verified,
        is_featured,
        top_model_leaderboard (
          today_points,
          total_points
        )
      `)
      .eq("is_approved", true)
      .is("deleted_at", null)
      .not("profile_photo_url", "is", null);

    const { data: fetchedModels, error } = deckTarget > 0
      ? await query.limit(1000)
      : { data: [], error: null };

    if (error) {
      logger.error("Fetch models error", error);
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: 500 }
      );
    }

    // Exclude already swiped models server-side; downstream counts (hasMore,
    // sessionTotal) stay based on unswiped models only, exactly as before.
    const swipedSet = new Set(swipedIds);
    const models = (fetchedModels || []).filter((m: any) => !swipedSet.has(m.id));

    // Exposure-weighted daily deck: shuffle first so ties break randomly, then
    // take the least-exposed models (lowest leaderboard points, missing row = 0)
    // and fill the rest of the deck at random
    const eligible = secureShufflePop(models || [], (models || []).length);
    const byExposure = [...eligible].sort(
      (a: any, b: any) =>
        (a.top_model_leaderboard?.total_points || 0) -
        (b.top_model_leaderboard?.total_points || 0)
    );
    const lowExposure = byExposure.slice(0, Math.min(LOW_EXPOSURE_COUNT, deckTarget));
    const lowExposureIds = new Set(lowExposure.map((m: any) => m.id));
    const randomFill = eligible
      .filter((m: any) => !lowExposureIds.has(m.id))
      .slice(0, deckTarget - lowExposure.length);
    const deck = [...lowExposure, ...randomFill];

    // Cycle exhausted: the player has swiped everything we can serve them this
    // cycle, but the fixed 25-model completion threshold was never reached
    // (fewer than 25 models are actually servable — RLS-visible pool smaller
    // than the admin count, or votes dropped to rate-limits). Without this the
    // session's completed_at never gets set: canSwipe stays true, GET keeps
    // returning an empty deck with no reset time, and the client shows a
    // phantom "Ready to Play Again!" that reloads the same empty deck forever
    // (and models_swiped never clears, so it never self-heals). Mark it
    // complete so the 24h cooldown + reset kicks in like a normal finish.
    if (deck.length === 0 && swipedIds.length > 0 && session.session_id) {
      const { data: completedRow } = await adminClient
        .from("top_model_sessions")
        .select("completed_at")
        .eq("id", session.session_id)
        .single();

      let completedAt = completedRow?.completed_at as string | null;
      if (!completedAt) {
        const { data: updated } = await adminClient
          .from("top_model_sessions")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", session.session_id)
          .select("completed_at")
          .single();
        completedAt = (updated?.completed_at as string | null) ?? new Date().toISOString();
      }

      const nextResetAt = new Date(
        new Date(completedAt).getTime() + 24 * 60 * 60 * 1000
      ).toISOString();

      return NextResponse.json({
        models: [],
        hasMore: false,
        session: {
          canSwipe: false,
          modelsSwiped: session.models_swiped,
          totalModels: session.total_models,
          nextResetAt,
          sessionId: session.session_id,
          currentStreak: session.current_streak,
          longestStreak: session.longest_streak,
          lastPlayDate: session.last_play_date,
        },
      });
    }

    // Get today's leaderboard rankings
    const { data: leaderboardData } = await supabase
      .from("top_model_leaderboard")
      .select("model_id, today_points")
      .gt("today_points", 0)
      .order("today_points", { ascending: false })
      .limit(100);

    // Create a map of model_id to rank
    const rankMap = new Map<string, number>();
    (leaderboardData || []).forEach((entry: any, index: number) => {
      rankMap.set(entry.model_id, index + 1);
    });

    // Transform models to include points and rank at top level
    const modelsWithPoints = deck.map((model: any) => ({
      ...model,
      today_points: model.top_model_leaderboard?.today_points || 0,
      total_points: model.top_model_leaderboard?.total_points || 0,
      today_rank: rankMap.get(model.id) || null,
      top_model_leaderboard: undefined, // Remove nested object
    }));

    // Shuffle the models using cryptographically secure randomness
    const shuffledModels = secureShufflePop(modelsWithPoints, modelsWithPoints.length);

    // More to serve if the eligible pool (after excluding this page) still has
    // unswiped models and we haven't hit the session cap. When true, the client
    // pages the rest of the roster in via hasMore.
    const eligibleThisFetch = (models || []).length;
    const servedTotal = swipedIds.length + shuffledModels.length;
    const hasMore =
      shuffledModels.length > 0 &&
      eligibleThisFetch > shuffledModels.length &&
      servedTotal < SESSION_DECK_CAP;

    // Progress basis: everything the player will see this cycle = already
    // swiped + all still-eligible models (capped at the session ceiling).
    const sessionTotal = Math.min(
      SESSION_DECK_CAP,
      swipedIds.length + eligibleThisFetch
    );

    return NextResponse.json({
      models: shuffledModels,
      hasMore,
      session: {
        canSwipe: true,
        modelsSwiped: session.models_swiped,
        totalModels: sessionTotal,
        modelsRemaining: shuffledModels.length,
        nextResetAt: null,
        sessionId: session.session_id,
        currentStreak: session.current_streak,
        longestStreak: session.longest_streak,
        lastPlayDate: session.last_play_date,
      },
    });
  } catch (error) {
    logger.error("Top models error", error);
    return NextResponse.json(
      { error: "Failed to load game" },
      { status: 500 }
    );
  }
}
