import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrediction } from "@/lib/replicate";

// GET - Check generation status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const { generationId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get generation record
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("id", generationId)
      .single();

    if (genError || !generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Verify ownership via model
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model || generation.model_id !== model.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If already completed or failed, return cached result
    if (generation.status === "completed" || generation.status === "failed") {
      return NextResponse.json({
        status: generation.status,
        resultUrls: generation.result_urls,
        error: generation.error_message,
      });
    }

    // Check Replicate for current status
    if (!generation.replicate_prediction_id) {
      return NextResponse.json({ error: "No prediction ID" }, { status: 400 });
    }
    const prediction = await getPrediction(generation.replicate_prediction_id);

    if ("error" in prediction) {
      return NextResponse.json({
        status: "processing",
        message: "Checking status...",
      });
    }

    // Update based on Replicate status
    if (prediction.status === "succeeded" && prediction.output) {
      // Update generation with results
      await supabase
        .from("ai_generations")
        .update({
          status: "completed",
          result_urls: prediction.output,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      return NextResponse.json({
        status: "completed",
        resultUrls: prediction.output,
      });
    } else if (prediction.status === "failed") {
      // Update generation as failed
      await supabase
        .from("ai_generations")
        .update({
          status: "failed",
          error_message: prediction.error || "Generation failed",
        })
        .eq("id", generationId);

      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      });
    }

    // Still processing
    return NextResponse.json({
      status: "processing",
      replicateStatus: prediction.status,
    });
  } catch (error) {
    console.error("[AI Generate Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
