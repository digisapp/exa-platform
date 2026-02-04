import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFluxStatus, startFaceSwap, checkFaceSwapStatus } from "@/lib/fal";

// Each poll is quick
export const maxDuration = 30;

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
  imageUrls: string[],
  generationId: string,
  modelId: string
): Promise<string[]> {
  const permanentUrls: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const buffer = await downloadImage(url);

    if (!buffer) {
      console.error(`[AI Status] Failed to download image ${i}`);
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

// GET - Check generation status and progress through pipeline
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
    if (generation.status === "completed") {
      return NextResponse.json({
        status: "completed",
        resultUrls: generation.result_urls,
      });
    }

    if (generation.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: generation.error_message,
      });
    }

    // STEP 1: flux_pending - Check if Flux is done
    if (generation.status === "flux_pending") {
      const fluxRequestId = generation.replicate_prediction_id;

      if (!fluxRequestId) {
        console.error("[AI Status] No Flux request ID");
        await supabase
          .from("ai_generations")
          .update({ status: "failed", error_message: "Missing request ID" })
          .eq("id", generationId);
        return NextResponse.json({ status: "failed", error: "Missing request ID" });
      }

      console.log("[AI Status] Checking Flux status:", fluxRequestId);
      const fluxStatus = await checkFluxStatus(fluxRequestId);

      if (fluxStatus.status === "completed" && fluxStatus.imageUrl) {
        console.log("[AI Status] Flux complete! Starting face swap...");

        // Start face swap with the base image
        const faceImageUrl = generation.source_image_url;
        const startResult = await startFaceSwap(fluxStatus.imageUrl, faceImageUrl);

        if ("error" in startResult) {
          console.error("[AI Status] Failed to start face swap:", startResult.error);
          await supabase
            .from("ai_generations")
            .update({ status: "failed", error_message: startResult.error })
            .eq("id", generationId);
          return NextResponse.json({ status: "failed", error: startResult.error });
        }

        // Update to face_swap_in_progress with the prediction ID
        await supabase
          .from("ai_generations")
          .update({
            status: "face_swap_in_progress",
            replicate_prediction_id: startResult.predictionId,
          })
          .eq("id", generationId);

        console.log("[AI Status] Face swap started:", startResult.predictionId);

        return NextResponse.json({
          status: "processing",
          message: "Face swap in progress...",
        });
      }

      if (fluxStatus.status === "failed") {
        console.error("[AI Status] Flux failed:", fluxStatus.error);
        await supabase
          .from("ai_generations")
          .update({ status: "failed", error_message: fluxStatus.error })
          .eq("id", generationId);
        return NextResponse.json({ status: "failed", error: fluxStatus.error });
      }

      // Still processing
      return NextResponse.json({
        status: "processing",
        message: "Generating base image...",
      });
    }

    // STEP 2: face_swap_pending - Start face swap (legacy status, handle for existing records)
    if (generation.status === "face_swap_pending") {
      const baseImageUrl = generation.replicate_prediction_id;
      const faceImageUrl = generation.source_image_url;

      if (!baseImageUrl || !faceImageUrl) {
        console.error("[AI Status] Missing URLs for face swap");
        await supabase
          .from("ai_generations")
          .update({ status: "failed", error_message: "Missing image URLs" })
          .eq("id", generationId);
        return NextResponse.json({ status: "failed", error: "Missing image URLs" });
      }

      console.log("[AI Status] Starting face swap...");
      const startResult = await startFaceSwap(baseImageUrl, faceImageUrl);

      if ("error" in startResult) {
        console.error("[AI Status] Failed to start face swap:", startResult.error);
        await supabase
          .from("ai_generations")
          .update({ status: "failed", error_message: startResult.error })
          .eq("id", generationId);
        return NextResponse.json({ status: "failed", error: startResult.error });
      }

      await supabase
        .from("ai_generations")
        .update({
          status: "face_swap_in_progress",
          replicate_prediction_id: startResult.predictionId,
        })
        .eq("id", generationId);

      return NextResponse.json({
        status: "processing",
        message: "Face swap in progress...",
      });
    }

    // STEP 3: face_swap_in_progress - Check face swap status
    if (generation.status === "face_swap_in_progress") {
      const predictionId = generation.replicate_prediction_id;

      if (!predictionId) {
        console.error("[AI Status] No prediction ID for face swap check");
        await supabase
          .from("ai_generations")
          .update({ status: "failed", error_message: "Missing prediction ID" })
          .eq("id", generationId);
        return NextResponse.json({ status: "failed", error: "Missing prediction ID" });
      }

      console.log("[AI Status] Checking face swap status:", predictionId);
      const statusResult = await checkFaceSwapStatus(predictionId);

      if (statusResult.status === "completed" && statusResult.imageUrl) {
        console.log("[AI Status] Face swap completed! Saving to storage...");

        // Save image to our storage
        const permanentUrls = await saveImagesToStorage(
          supabase,
          [statusResult.imageUrl],
          generationId,
          generation.model_id
        );

        if (permanentUrls.length === 0) {
          console.error("[AI Status] Failed to save image to storage");
          await supabase
            .from("ai_generations")
            .update({ status: "failed", error_message: "Failed to save image" })
            .eq("id", generationId);
          return NextResponse.json({ status: "failed", error: "Failed to save image" });
        }

        // Update generation as completed
        await supabase
          .from("ai_generations")
          .update({
            status: "completed",
            result_urls: permanentUrls,
            completed_at: new Date().toISOString(),
          })
          .eq("id", generationId);

        console.log("[AI Status] Generation completed:", permanentUrls[0]);

        return NextResponse.json({
          status: "completed",
          resultUrls: permanentUrls,
        });
      }

      if (statusResult.status === "failed") {
        console.error("[AI Status] Face swap failed:", statusResult.error);
        await supabase
          .from("ai_generations")
          .update({ status: "failed", error_message: statusResult.error })
          .eq("id", generationId);
        return NextResponse.json({ status: "failed", error: statusResult.error });
      }

      // Still processing
      return NextResponse.json({
        status: "processing",
        message: "Face swap in progress...",
      });
    }

    // Unknown status
    return NextResponse.json({
      status: "processing",
      message: "Generation in progress...",
    });
  } catch (error) {
    console.error("[AI Generate Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
