import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const supabase = createServiceRoleClient();

// GET /api/cron/offline-models
// Runs every minute — marks models as offline if no activity for 2 minutes.
// The UPDATE triggers a Supabase Realtime broadcast (video_is_online: true → false)
// so fans stop seeing them as available.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago

    const { data, error } = await (supabase.from("models") as any)
      .update({ video_is_online: false })
      .eq("video_is_online", true)
      .lt("last_active_at", cutoff)
      .select("id");

    if (error) {
      logger.error("Failed to mark models offline", error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      marked_offline: data?.length ?? 0,
    });
  } catch (error) {
    logger.error("offline-models cron error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
