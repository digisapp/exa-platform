import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrediction } from "@/lib/replicate";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Check generation status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Get generation record
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("id", id)
      .eq("model_id", model.id)
      .single();

    if (genError || !generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // If already completed or failed, return the stored result
    if (generation.status === "completed" || generation.status === "failed") {
      return NextResponse.json({
        generation,
        status: generation.status,
        resultUrls: generation.result_urls,
        error: generation.error_message,
      });
    }

    // Check Replicate for status
    if (!generation.replicate_prediction_id) {
      return NextResponse.json({ error: "No prediction ID" }, { status: 500 });
    }

    const prediction = await getPrediction(generation.replicate_prediction_id);

    if ("error" in prediction) {
      return NextResponse.json({ error: prediction.error }, { status: 500 });
    }

    // Update our database based on Replicate status
    if (prediction.status === "succeeded" && prediction.output) {
      const { error: updateError } = await supabase
        .from("ai_generations")
        .update({
          status: "completed",
          result_urls: prediction.output,
          completed_at: new Date().toISOString(),
          processing_time_ms: prediction.metrics?.predict_time
            ? Math.round(prediction.metrics.predict_time * 1000)
            : null,
        })
        .eq("id", id);

      if (updateError) {
        console.error("[AI Status] Failed to update generation:", updateError);
      }

      return NextResponse.json({
        generation: { ...generation, status: "completed", result_urls: prediction.output },
        status: "completed",
        resultUrls: prediction.output,
      });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const { error: updateError } = await supabase
        .from("ai_generations")
        .update({
          status: "failed",
          error_message: prediction.error || "Generation failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("[AI Status] Failed to update generation:", updateError);
      }

      return NextResponse.json({
        generation: { ...generation, status: "failed" },
        status: "failed",
        error: prediction.error || "Generation failed",
      });
    }

    // Still processing
    return NextResponse.json({
      generation,
      status: prediction.status,
      resultUrls: null,
    });
  } catch (error) {
    console.error("[AI Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
