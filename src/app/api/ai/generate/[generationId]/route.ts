import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenerationStatus, getGenerationResult, faceSwap } from "@/lib/fal";

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
  imageUrls: string[],
  generationId: string,
  modelId: string
): Promise<string[]> {
  const permanentUrls: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const buffer = await downloadImage(url);

    if (!buffer) {
      console.error(`[AI Status] Failed to download image ${i} from fal.ai`);
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

    // Check fal.ai for current status
    const requestId = generation.replicate_prediction_id; // Field reused for fal.ai request_id
    if (!requestId) {
      return NextResponse.json({ error: "No request ID" }, { status: 400 });
    }

    console.log("[AI Status] Checking fal.ai request:", requestId);
    const statusResult = await getGenerationStatus(requestId);
    console.log("[AI Status] fal.ai status response:", JSON.stringify(statusResult).slice(0, 500));

    if ("error" in statusResult) {
      console.log("[AI Status] Error from fal.ai:", statusResult.error);
      return NextResponse.json({
        status: "processing",
        message: "Checking status...",
      });
    }

    console.log("[AI Status] fal.ai status:", statusResult.status);

    // Handle fal.ai status: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED
    if (statusResult.status === "COMPLETED") {
      // Step 1: Get the Flux base image result
      const baseResult = await getGenerationResult(requestId);

      if ("error" in baseResult) {
        console.error("[AI Status] Failed to get Flux result:", baseResult.error);
        return NextResponse.json({
          status: "failed",
          error: "Failed to retrieve base image",
        });
      }

      if (!baseResult.images || baseResult.images.length === 0) {
        console.error("[AI Status] No images in Flux result");
        return NextResponse.json({
          status: "failed",
          error: "No base image generated",
        });
      }

      console.log("[AI Status] Flux base image ready, starting face swap...");
      const baseImageUrl = baseResult.images[0].url;

      // Step 2: Face swap - put user's face on the base image
      const faceImageUrl = generation.source_image_url;
      console.log("[AI Status] Face swap: base =", baseImageUrl.slice(0, 50), "face =", faceImageUrl?.slice(0, 50));

      if (!faceImageUrl) {
        console.error("[AI Status] No face image URL in generation record");
        return NextResponse.json({
          status: "failed",
          error: "Missing source face image",
        });
      }

      const swapResult = await faceSwap(baseImageUrl, faceImageUrl);

      if ("error" in swapResult) {
        console.error("[AI Status] Face swap failed:", swapResult.error);
        return NextResponse.json({
          status: "failed",
          error: "Face swap failed",
        });
      }

      if (!swapResult.images || swapResult.images.length === 0) {
        console.error("[AI Status] No images in face swap result");
        return NextResponse.json({
          status: "failed",
          error: "Face swap returned no image",
        });
      }

      console.log("[AI Status] Face swap succeeded!");

      // Extract URLs from face swap result
      const outputUrls = swapResult.images.map(img => img.url);

      console.log("[AI Status] Saving", outputUrls.length, "face-swapped images to storage...");

      // Save images to our storage (fal.ai URLs expire!)
      const permanentUrls = await saveImagesToStorage(
        supabase,
        outputUrls,
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
    } else if (statusResult.status === "FAILED") {
      // Update generation as failed
      await supabase
        .from("ai_generations")
        .update({
          status: "failed",
          error_message: "Generation failed",
        })
        .eq("id", generationId);

      return NextResponse.json({
        status: "failed",
        error: "Generation failed",
      });
    }

    // Still processing (IN_QUEUE or IN_PROGRESS)
    return NextResponse.json({
      status: "processing",
      falStatus: statusResult.status,
    });
  } catch (error) {
    console.error("[AI Generate Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
