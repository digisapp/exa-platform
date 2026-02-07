import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// POST - Update streak when session completes
export async function POST(request: NextRequest) {
  try {
    // Rate limit (no auth, use IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Update streak using database function
    const { data, error } = await supabase.rpc(
      "update_session_streak",
      { p_session_id: sessionId }
    );

    if (error) {
      console.error("Streak update error:", error);
      return NextResponse.json(
        { error: "Failed to update streak" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      currentStreak: data?.current_streak || 1,
      longestStreak: data?.longest_streak || 1,
    });
  } catch (error) {
    console.error("Streak error:", error);
    return NextResponse.json(
      { error: "Failed to update streak" },
      { status: 500 }
    );
  }
}
