import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { faceSwap } from "@/lib/fal";

// Allow longer timeout for face swap (~20-30 seconds)
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

// GET - Check generation status and do face swap if needed
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

    // Handle face_swap_pending status - do the face swap now
    if (generation.status === "face_swap_pending") {
      // Base image URL is stored in replicate_prediction_id field
      const baseImageUrl = generation.replicate_prediction_id;
      const faceImageUrl = generation.source_image_url;

      if (!baseImageUrl) {
        console.error("[AI Status] No base image URL in generation record");
        await supabase
          .from("ai_generations")
          .update({
            status: "failed",
            error_message: "Missing base image",
          })
          .eq("id", generationId);
        return NextResponse.json({
          status: "failed",
          error: "Missing base image",
        });
      }

      if (!faceImageUrl) {
        console.error("[AI Status] No face image URL in generation record");
        await supabase
          .from("ai_generations")
          .update({
            status: "failed",
            error_message: "Missing source face image",
          })
          .eq("id", generationId);
        return NextResponse.json({
          status: "failed",
          error: "Missing source face image",
        });
      }

      console.log("[AI Status] Starting face swap...");
      console.log("[AI Status] Base image:", baseImageUrl.slice(0, 80));
      console.log("[AI Status] Face image:", faceImageUrl.slice(0, 80));

      // Do the face swap
      const swapResult = await faceSwap(baseImageUrl, faceImageUrl);

      if ("error" in swapResult) {
        console.error("[AI Status] Face swap failed:", swapResult.error);
        await supabase
          .from("ai_generations")
          .update({
            status: "failed",
            error_message: swapResult.error,
          })
          .eq("id", generationId);
        return NextResponse.json({
          status: "failed",
          error: swapResult.error,
        });
      }

      if (!swapResult.images || swapResult.images.length === 0) {
        console.error("[AI Status] No images in face swap result");
        await supabase
          .from("ai_generations")
          .update({
            status: "failed",
            error_message: "Face swap returned no image",
          })
          .eq("id", generationId);
        return NextResponse.json({
          status: "failed",
          error: "Face swap returned no image",
        });
      }

      console.log("[AI Status] Face swap succeeded!");

      // Extract URLs from face swap result
      const outputUrls = swapResult.images.map(img => img.url);

      console.log("[AI Status] Saving", outputUrls.length, "images to storage...");

      // Save images to our storage (external URLs expire!)
      const permanentUrls = await saveImagesToStorage(
        supabase,
        outputUrls,
        generationId,
        generation.model_id
      );

      if (permanentUrls.length === 0) {
        console.error("[AI Status] Failed to save any images to storage");
        await supabase
          .from("ai_generations")
          .update({
            status: "failed",
            error_message: "Failed to save generated images",
          })
          .eq("id", generationId);
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
    }

    // Still processing (unknown status)
    return NextResponse.json({
      status: "processing",
      message: "Generation in progress...",
    });
  } catch (error) {
    console.error("[AI Generate Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
