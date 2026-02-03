import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGenerationStatus, getGenerationResult } from "@/lib/fal";

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
      // Fetch the actual result
      const result = await getGenerationResult(requestId);

      if ("error" in result) {
        console.error("[AI Status] Failed to get fal.ai result:", result.error);
        return NextResponse.json({
          status: "failed",
          error: "Failed to retrieve generated images",
        });
      }

      if (!result.images || result.images.length === 0) {
        console.error("[AI Status] No images in fal.ai result");
        return NextResponse.json({
          status: "failed",
          error: "No images generated",
        });
      }

      console.log("[AI Status] Generation succeeded, images:", result.images.length);

      // Extract URLs from fal.ai image objects
      const outputUrls = result.images.map(img => img.url);

      console.log("[AI Status] Saving", outputUrls.length, "images to storage...");

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
