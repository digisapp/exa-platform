import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenerationStatus, getGenerationResult } from "@/lib/fal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Check generation status (alternative route)
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

    // Check fal.ai for status
    const requestId = generation.replicate_prediction_id; // Field reused for fal.ai request_id
    if (!requestId) {
      return NextResponse.json({ error: "No request ID" }, { status: 500 });
    }

    const statusResult = await getGenerationStatus(requestId);

    if ("error" in statusResult) {
      return NextResponse.json({ error: statusResult.error }, { status: 500 });
    }

    // Update our database based on fal.ai status
    if (statusResult.status === "COMPLETED") {
      const result = await getGenerationResult(requestId);

      if ("error" in result || !result.images) {
        return NextResponse.json({ error: "Failed to get result" }, { status: 500 });
      }

      const outputUrls = result.images.map(img => img.url);

      const { error: updateError } = await supabase
        .from("ai_generations")
        .update({
          status: "completed",
          result_urls: outputUrls,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("[AI Status] Failed to update generation:", updateError);
      }

      return NextResponse.json({
        generation: { ...generation, status: "completed", result_urls: outputUrls },
        status: "completed",
        resultUrls: outputUrls,
      });
    }

    if (statusResult.status === "FAILED") {
      const { error: updateError } = await supabase
        .from("ai_generations")
        .update({
          status: "failed",
          error_message: "Generation failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("[AI Status] Failed to update generation:", updateError);
      }

      return NextResponse.json({
        generation: { ...generation, status: "failed" },
        status: "failed",
        error: "Generation failed",
      });
    }

    // Still processing (IN_QUEUE or IN_PROGRESS)
    return NextResponse.json({
      generation,
      status: statusResult.status === "IN_QUEUE" ? "starting" : "processing",
      resultUrls: null,
    });
  } catch (error) {
    console.error("[AI Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
