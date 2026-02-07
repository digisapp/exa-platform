import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

// GET /api/cron/cleanup-analytics - Clean up old page views
// Runs daily at 3 AM via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete page views older than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const { error, count } = await adminClient
      .from("page_views")
      .delete({ count: "exact" })
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json(
        { error: "Failed to cleanup old page views" },
        { status: 500 }
      );
    }

    console.log(`Cleaned up ${count || 0} old page views`);

    return NextResponse.json({
      success: true,
      deleted: count || 0,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error("Cron cleanup-analytics error:", error);
    return NextResponse.json(
      { error: "Failed to run cleanup" },
      { status: 500 }
    );
  }
}
