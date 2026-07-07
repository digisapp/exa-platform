import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const supabase = createServiceRoleClient();

// GET /api/cron/reset-boost-leaderboards?period=daily|weekly
// Resets the EXA Boost leaderboard periods so the Explore "Trending this week"
// row and the in-game Today/Week tabs reflect the current period.
// daily → runs at 00:05 UTC every day, weekly → 00:10 UTC on Mondays.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const period = request.nextUrl.searchParams.get("period");
    if (period !== "daily" && period !== "weekly") {
      return NextResponse.json(
        { error: "period must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    const fn =
      period === "daily"
        ? "reset_daily_top_model_leaderboard"
        : "reset_weekly_top_model_leaderboard";

    const { error } = await (supabase as any).rpc(fn);

    if (error) {
      logger.error(`Failed to run ${fn}`, error);
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, period });
  } catch (error) {
    logger.error("reset-boost-leaderboards cron error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
