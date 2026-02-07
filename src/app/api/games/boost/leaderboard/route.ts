import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Fetch leaderboard
export async function GET(request: NextRequest) {
  try {
    // Rate limit (public endpoint, IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);

    // Determine which column to sort by
    let orderColumn = "today_points";
    if (period === "week") {
      orderColumn = "week_points";
    } else if (period === "all") {
      orderColumn = "total_points";
    }

    // Fetch leaderboard with model info
    const { data: leaderboard, error } = await supabase
      .from("top_model_leaderboard")
      .select(`
        model_id,
        total_points,
        today_points,
        week_points,
        total_likes,
        total_boosts,
        models!inner (
          id,
          first_name,
          username,
          profile_photo_url,
          city,
          state,
          is_verified,
          is_featured
        )
      `)
      .gt(orderColumn, 0)
      .order(orderColumn, { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Leaderboard error:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    // Format response with rank
    const rankedLeaderboard = (leaderboard || []).map((entry: any, index: number) => ({
      rank: index + 1,
      modelId: entry.model_id,
      points: period === "week" ? entry.week_points : period === "all" ? entry.total_points : entry.today_points,
      totalPoints: entry.total_points,
      todayPoints: entry.today_points,
      weekPoints: entry.week_points,
      totalLikes: entry.total_likes,
      totalBoosts: entry.total_boosts,
      model: entry.models ? {
        id: entry.models.id,
        firstName: entry.models.first_name,
        username: entry.models.username,
        profilePhotoUrl: entry.models.profile_photo_url,
        city: entry.models.city,
        state: entry.models.state,
        isVerified: entry.models.is_verified,
        isFeatured: entry.models.is_featured,
      } : null,
    }));

    return NextResponse.json({
      period,
      leaderboard: rankedLeaderboard,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
