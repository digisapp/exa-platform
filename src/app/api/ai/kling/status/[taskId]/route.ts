import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_BASE_URL = process.env.KLING_BASE_URL || "https://api.klingai.com/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // Check admin auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!KLING_API_KEY) {
      return NextResponse.json(
        { error: "Kling API key not configured" },
        { status: 500 }
      );
    }

    // Check status with Kling API
    const response = await fetch(`${KLING_BASE_URL}/videos/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${KLING_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json(
        { error: error.message || "Failed to check status" },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Update database record if status changed
    if (result.status === "completed" || result.status === "failed") {
      await (supabase as any)
        .from("ai_video_generations")
        .update({
          status: result.status,
          output_url: result.video_url || result.output?.video_url || null,
          completed_at: new Date().toISOString(),
          error_message: result.status === "failed" ? result.error : null,
        })
        .eq("task_id", taskId);
    }

    return NextResponse.json({
      taskId,
      status: result.status,
      progress: result.progress || 0,
      videoUrl: result.video_url || result.output?.video_url || null,
      thumbnailUrl: result.thumbnail_url || result.output?.thumbnail_url || null,
      error: result.error || null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
