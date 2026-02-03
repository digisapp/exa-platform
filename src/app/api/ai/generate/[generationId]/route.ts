import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrediction } from "@/lib/replicate";

// Allow longer timeout for downloading and saving images
export const maxDuration = 60;

// Download image from URL and return as buffer
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[AI Status] Failed to download image:", error);
    return null;
  }
}

// Save images to Supabase storage and return permanent URLs
async function saveImagesToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  replicateUrls: string[],
  generationId: string,
  modelId: string
): Promise<string[]> {
  const permanentUrls: string[] = [];

  for (let i = 0; i < replicateUrls.length; i++) {
    const url = replicateUrls[i];
    const buffer = await downloadImage(url);

    if (!buffer) {
      console.error(`[AI Status] Failed to download image ${i} from Replicate`);
      continue;
    }

    const filename = `${modelId}/ai-${generationId}-${i}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio")
      .upload(filename, buffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[AI Status] Failed to upload image ${i}:`, uploadError);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("portfolio")
      .getPublicUrl(filename);

    permanentUrls.push(publicUrl);
  }

  return permanentUrls;
}

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

    console.log("[AI Status] Checking prediction:", generation.replicate_prediction_id);
    const prediction = await getPrediction(generation.replicate_prediction_id);
    console.log("[AI Status] Replicate response:", JSON.stringify(prediction).slice(0, 500));

    if ("error" in prediction) {
      console.log("[AI Status] Error from Replicate:", prediction.error);
      return NextResponse.json({
        status: "processing",
        message: "Checking status...",
      });
    }

    console.log("[AI Status] Replicate status:", prediction.status);

    // Update based on Replicate status
    if (prediction.status === "succeeded" && prediction.output) {
      console.log("[AI Status] Generation succeeded, saving images to storage...");

      // Save images to our storage (Replicate deletes them after 1 hour!)
      const permanentUrls = await saveImagesToStorage(
        supabase,
        prediction.output,
        generationId,
        generation.model_id
      );

      if (permanentUrls.length === 0) {
        console.error("[AI Status] Failed to save any images to storage");
        return NextResponse.json({
          status: "failed",
          error: "Failed to save generated images",
        });
      }

      console.log("[AI Status] Saved", permanentUrls.length, "images to storage");

      // Update generation with our permanent URLs
      await supabase
        .from("ai_generations")
        .update({
          status: "completed",
          result_urls: permanentUrls,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);

      return NextResponse.json({
        status: "completed",
        resultUrls: permanentUrls,
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
