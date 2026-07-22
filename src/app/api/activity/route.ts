import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { notifyCallKnockersModelOnline } from "@/lib/calls/knock-online-notify";
import { logger } from "@/lib/logger";

// POST - Update user's last active timestamp
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get actor type to only update the relevant table
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Only update the relevant table based on actor type
    if (actor.type === "model") {
      // Read prior reachability BEFORE the heartbeat write: the
      // unreachable → reachable transition is what serves pending call
      // knocks. available_for_calls is newer than the generated DB types.
      const { data: prior } = await (supabase.from("models") as any)
        .select("id, video_is_online, available_for_calls")
        .eq("user_id", user.id)
        .single() as {
          data: { id: string; video_is_online: boolean | null; available_for_calls: boolean | null } | null;
        };

      await supabase.from("models")
        .update({ last_active_at: now, video_is_online: true })
        .eq("user_id", user.id);

      if (prior && !prior.video_is_online && !prior.available_for_calls) {
        // Model just came online after being unreachable — ping fans who
        // knocked. Awaited (not fire-and-forget) so serverless can't kill
        // the send mid-flight; the transition is rare, heartbeats aren't.
        try {
          await notifyCallKnockersModelOnline(createServiceRoleClient(), prior.id);
        } catch (err) {
          logger.error("knock online-notify on heartbeat failed", err);
        }
      }
    } else if (actor.type === "fan") {
      const fansTable = supabase.from("fans") as any;
      await fansTable
        .update({ last_active_at: now })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Activity tracking error", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
