import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

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

// GET - Fetch models for the swipe game
export async function GET(request: NextRequest) {
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
        p_user_id: user?.id ?? "",
        p_fingerprint: fingerprint,
      }
    );

    if (sessionError) {
      console.error("Session error:", sessionError);
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
      has_spun_today: boolean;
      total_spin_coins: number;
    }) || {
      session_id: null,
      can_swipe: true,
      models_swiped: 0,
      total_models: 0,
      next_reset_at: null,
      current_streak: 0,
      longest_streak: 0,
      last_play_date: null,
      has_spun_today: false,
      total_spin_coins: 0,
    };

    // If can't swipe, return early with session info
    if (!session.can_swipe) {
      return NextResponse.json({
        models: [],
        session: {
          canSwipe: false,
          modelsSwiped: session.models_swiped,
          totalModels: session.total_models,
          nextResetAt: session.next_reset_at,
          sessionId: session.session_id,
          currentStreak: session.current_streak,
          longestStreak: session.longest_streak,
          lastPlayDate: session.last_play_date,
          hasSpunToday: session.has_spun_today,
          totalSpinCoins: session.total_spin_coins,
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

    // Fetch models with profile pictures, excluding already swiped
    let query = supabase
      .from("models")
      .select(`
        id,
        first_name,
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
      .not("profile_photo_url", "is", null);

    // Exclude already swiped models
    if (swipedIds.length > 0) {
      query = query.not("id", "in", `(${swipedIds.join(",")})`);
    }

    // Fetch all models
    const { data: models, error } = await query
      .order("created_at", { ascending: false });

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
    const modelsWithPoints = (models || []).map((model: any) => ({
      ...model,
      today_points: model.top_model_leaderboard?.today_points || 0,
      total_points: model.top_model_leaderboard?.total_points || 0,
      today_rank: rankMap.get(model.id) || null,
      top_model_leaderboard: undefined, // Remove nested object
    }));

    if (error) {
      console.error("Fetch models error:", error);
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: 500 }
      );
    }

    // Shuffle the models using cryptographically secure randomness
    const shuffledModels = secureShufflePop(modelsWithPoints, modelsWithPoints.length);

    return NextResponse.json({
      models: shuffledModels,
      session: {
        canSwipe: true,
        modelsSwiped: session.models_swiped,
        totalModels: session.total_models,
        modelsRemaining: session.total_models - session.models_swiped,
        nextResetAt: null,
        sessionId: session.session_id,
        currentStreak: session.current_streak,
        longestStreak: session.longest_streak,
        lastPlayDate: session.last_play_date,
        hasSpunToday: session.has_spun_today,
        totalSpinCoins: session.total_spin_coins,
      },
    });
  } catch (error) {
    console.error("Top models error:", error);
    return NextResponse.json(
      { error: "Failed to load game" },
      { status: 500 }
    );
  }
}
