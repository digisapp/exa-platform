import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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

// Daily deck: each session cycle serves up to 25 models — a mix of the
// least-exposed eligible models and a random fill — instead of the full roster.
const DAILY_DECK_SIZE = 25;
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

    // How many models are left in today's deck for this cycle
    const deckTarget = Math.max(0, DAILY_DECK_SIZE - swipedIds.length);

    // Fetch eligible models, excluding already swiped
    let query = supabase
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

    // Exclude already swiped models
    if (swipedIds.length > 0) {
      query = query.not("id", "in", `(${swipedIds.join(",")})`);
    }

    const { data: models, error } = deckTarget > 0
      ? await query.limit(1000)
      : { data: [], error: null };

    if (error) {
      logger.error("Fetch models error", error);
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: 500 }
      );
    }

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

    // Today's deck basis: what this cycle actually serves (25 or fewer)
    const deckTotal = swipedIds.length + shuffledModels.length;

    return NextResponse.json({
      models: shuffledModels,
      hasMore: false,
      session: {
        canSwipe: true,
        modelsSwiped: session.models_swiped,
        totalModels: deckTotal,
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
