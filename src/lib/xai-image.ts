import { logger } from "@/lib/logger";
import type { AspectRatio, Resolution, XAIImageModel } from "@/types/ai-studio";

interface XAIImageResponse {
  data: Array<{
    url: string;
    b64_json?: string;
    model: string;
    respect_moderation: boolean;
  }>;
}

interface GenerateParams {
  prompt: string;
  model: XAIImageModel;
  n?: number;
  aspect_ratio?: AspectRatio;
  resolution?: Resolution;
  response_format?: "url" | "b64_json";
}

interface EditParams extends GenerateParams {
  image_url: string;
}

interface MultiEditParams extends GenerateParams {
  image_urls: string[];
}

/**
 * Generate images via xAI Grok image generation API.
 * Uses raw fetch since the OpenAI SDK doesn't support xAI-specific fields
 * (aspect_ratio, image, image_urls).
 */
export async function generateImages(params: GenerateParams): Promise<XAIImageResponse> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
    n: params.n || 1,
    response_format: params.response_format || "url",
  };

  if (params.aspect_ratio && params.aspect_ratio !== "auto") {
    body.aspect_ratio = params.aspect_ratio;
  }
  if (params.resolution) {
    body.resolution = params.resolution;
  }

  return xaiFetch(body);
}

/**
 * Edit an existing image with a text prompt.
 */
export async function editImage(params: EditParams): Promise<XAIImageResponse> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
    n: params.n || 1,
    response_format: params.response_format || "url",
    image: { url: params.image_url, type: "image_url" },
  };

  if (params.aspect_ratio && params.aspect_ratio !== "auto") {
    body.aspect_ratio = params.aspect_ratio;
  }
  if (params.resolution) {
    body.resolution = params.resolution;
  }

  return xaiFetch(body);
}

/**
 * Edit with multiple source images (up to 5).
 */
export async function editMultipleImages(params: MultiEditParams): Promise<XAIImageResponse> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt,
    n: params.n || 1,
    response_format: params.response_format || "url",
    image: params.image_urls.map((url) => ({ url, type: "image_url" })),
  };

  if (params.aspect_ratio && params.aspect_ratio !== "auto") {
    body.aspect_ratio = params.aspect_ratio;
  }
  if (params.resolution) {
    body.resolution = params.resolution;
  }

  return xaiFetch(body);
}

async function xaiFetch(body: Record<string, unknown>): Promise<XAIImageResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    logger.error("xAI image generation failed", { status: res.status, error: errorText });
    throw new Error(`xAI API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Download a temporary xAI image URL and return it as a buffer.
 */
export async function downloadImage(url: string): Promise<{ buffer: Uint8Array; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);

  const contentType = res.headers.get("content-type") || "image/png";
  const buffer = new Uint8Array(await res.arrayBuffer());
  return { buffer, contentType };
}
