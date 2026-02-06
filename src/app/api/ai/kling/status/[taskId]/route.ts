import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FAL_KEY = process.env.FAL_KEY;

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

    if (!FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY not configured" },
        { status: 500 }
      );
    }

    // Get the generation record to find the endpoint
    const { data: generation } = await (supabase as any)
      .from("ai_video_generations")
      .select("metadata")
      .eq("task_id", taskId)
      .single();

    // Build status URL from the original endpoint
    const endpoint = generation?.metadata?.fal_endpoint;
    if (!endpoint) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Replace queue.fal.run with queue.fal.run/requests/{id}/status
    const statusUrl = `${endpoint}/requests/${taskId}/status`;

    // Check status with fal.ai
    const response = await fetch(statusUrl, {
      headers: {
        "Authorization": `Key ${FAL_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      return NextResponse.json(
        { error: error.detail || "Failed to check status" },
        { status: response.status }
      );
    }

    const result = await response.json();

    // fal.ai status: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
    let status = "processing";
    if (result.status === "COMPLETED") {
      status = "completed";
    } else if (result.status === "FAILED") {
      status = "failed";
    }

    // If completed, fetch the result
    let videoUrl = null;
    let thumbnailUrl = null;

    if (status === "completed") {
      const resultUrl = `${endpoint}/requests/${taskId}`;
      const resultResponse = await fetch(resultUrl, {
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
        },
      });

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        videoUrl = resultData.video?.url || resultData.output?.video?.url || null;
        thumbnailUrl = resultData.video?.thumbnail_url || null;
      }
    }

    // Update database record if status changed
    if (status === "completed" || status === "failed") {
      await (supabase as any)
        .from("ai_video_generations")
        .update({
          status,
          output_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          completed_at: new Date().toISOString(),
          error_message: status === "failed" ? (result.error || "Generation failed") : null,
        })
        .eq("task_id", taskId);
    }

    return NextResponse.json({
      taskId,
      status,
      progress: result.queue_position ? 0 : (status === "completed" ? 100 : 50),
      videoUrl,
      thumbnailUrl,
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
