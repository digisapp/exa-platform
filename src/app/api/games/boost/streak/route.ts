import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

// POST - Update streak when session completes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user?.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { sessionId, fingerprint } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the caller before touching its streak —
    // update_session_streak is keyed on a raw session id, so without this
    // anyone could bump/reset arbitrary sessions' streaks. Ownership mirrors
    // get_or_create_top_model_session: user_id once claimed (takes
    // precedence), browser fingerprint while anonymous.
    const { data: sessionRow } = await adminClient
      .from("top_model_sessions")
      .select("id, user_id, fingerprint")
      .eq("id", sessionId)
      .maybeSingle();

    if (!sessionRow) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const ownsSession = sessionRow.user_id
      ? user?.id === sessionRow.user_id
      : Boolean(fingerprint && sessionRow.fingerprint === fingerprint);

    if (!ownsSession) {
      return NextResponse.json(
        { error: "This session doesn't belong to you" },
        { status: 403 }
      );
    }

    // Update streak via the service-role client: update_session_streak is
    // REVOKEd from authenticated/anon (20260712100004) and ownership was
    // verified above.
    const { data: rpcData, error } = await adminClient.rpc(
      "update_session_streak",
      { p_session_id: sessionId }
    );
    const data = rpcData as Record<string, any> | null;

    if (error) {
      logger.error("Streak update error", error);
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
    logger.error("Streak error", error);
    return NextResponse.json(
      { error: "Failed to update streak" },
      { status: 500 }
    );
  }
}
