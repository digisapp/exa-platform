import { logger } from "@/lib/logger";
import type { GPTImageQuality, GPTImageSize } from "@/types/ai-studio";

interface GPTImageEditParams {
  prompt: string;
  image_urls: string[];
  image_size?: GPTImageSize;
  quality?: GPTImageQuality;
  num_images?: number;
  output_format?: "png" | "jpeg" | "webp";
  mask_image_url?: string;
}

interface GPTImageGenerateParams {
  prompt: string;
  image_size?: GPTImageSize;
  quality?: GPTImageQuality;
  num_images?: number;
  output_format?: "png" | "jpeg" | "webp";
}

interface FalImage {
  url: string;
  content_type: string;
  file_name: string;
  width: number;
  height: number;
}

interface FalImageResponse {
  images: FalImage[];
}

const FAL_KEY = process.env.FAL_KEY;

/**
 * Edit images using GPT Image 2 via fal.ai
 * Endpoint: openai/gpt-image-2/edit
 */
export async function gptImageEdit(params: GPTImageEditParams): Promise<FalImageResponse> {
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    image_urls: params.image_urls,
    quality: params.quality || "high",
    output_format: params.output_format || "png",
  };

  if (params.image_size && params.image_size !== "auto") {
    input.image_size = params.image_size;
  }
  if (params.num_images && params.num_images > 1) {
    input.num_images = params.num_images;
  }
  if (params.mask_image_url) {
    input.mask_image_url = params.mask_image_url;
  }

  return falSubscribe("openai/gpt-image-2/edit", input);
}

/**
 * Generate images from scratch using GPT Image 2 via fal.ai
 * Endpoint: fal-ai/gpt-image-2
 */
export async function gptImageGenerate(params: GPTImageGenerateParams): Promise<FalImageResponse> {
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    quality: params.quality || "high",
    output_format: params.output_format || "png",
  };

  if (params.image_size && params.image_size !== "auto") {
    input.image_size = params.image_size;
  }
  if (params.num_images && params.num_images > 1) {
    input.num_images = params.num_images;
  }

  return falSubscribe("fal-ai/gpt-image-2", input);
}

/**
 * Submit a request to fal queue and poll until complete.
 * Follows the same pattern as the existing upscale route.
 */
async function falSubscribe(
  endpoint: string,
  input: Record<string, unknown>
): Promise<FalImageResponse> {
  if (!FAL_KEY) throw new Error("FAL_KEY is not configured");

  const headers = {
    Authorization: `Key ${FAL_KEY}`,
    "Content-Type": "application/json",
  };

  // Submit to queue
  const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text().catch(() => "Unknown error");
    logger.error("fal GPT Image 2 submit failed", { status: submitRes.status, error: errorText });
    throw new Error(`fal API error (${submitRes.status}): ${errorText}`);
  }

  const { request_id } = await submitRes.json();
  if (!request_id) throw new Error("No request_id from fal");

  // Poll for completion (up to 5 minutes)
  const maxWait = 300_000;
  const pollInterval = 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusRes = await fetch(
      `https://queue.fal.run/${endpoint}/requests/${request_id}/status`,
      { headers: { Authorization: `Key ${FAL_KEY}` } }
    );

    if (!statusRes.ok) continue;
    const status = await statusRes.json();

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(
        `https://queue.fal.run/${endpoint}/requests/${request_id}`,
        { headers: { Authorization: `Key ${FAL_KEY}` } }
      );

      if (!resultRes.ok) throw new Error("Failed to fetch GPT Image 2 result");
      const result = await resultRes.json();

      if (result.detail) {
        logger.error("fal GPT Image 2 result error", { detail: result.detail });
        throw new Error("GPT Image 2 processing error");
      }

      if (!result.images || result.images.length === 0) {
        throw new Error("No images in GPT Image 2 result");
      }

      return result as FalImageResponse;
    }

    if (status.status === "FAILED") {
      logger.error("fal GPT Image 2 job failed", { status });
      throw new Error("GPT Image 2 generation failed");
    }
  }

  throw new Error("GPT Image 2 generation timed out (5 min)");
}
