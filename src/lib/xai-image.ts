import { logger } from "@/lib/logger";
import type { AspectRatio, Resolution, VideoAspectRatio, VideoResolution, XAIImageModel } from "@/types/ai-studio";

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
 * Download a temporary xAI URL and return it as a buffer.
 */
export async function downloadImage(url: string): Promise<{ buffer: Uint8Array; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);

  const contentType = res.headers.get("content-type") || "image/png";
  const buffer = new Uint8Array(await res.arrayBuffer());
  return { buffer, contentType };
}

// ─── Video Generation (async: submit → poll) ───

interface VideoGenerateParams {
  prompt: string;
  duration?: number;
  aspect_ratio?: VideoAspectRatio;
  resolution?: VideoResolution;
  image_url?: string;
}

interface VideoSubmitResponse {
  request_id: string;
}

interface VideoStatusResponse {
  status: "pending" | "done" | "expired" | "failed";
  video?: {
    url: string;
    duration: number;
    respect_moderation: boolean;
  };
  model?: string;
}

/**
 * Submit a video generation request. Returns a request_id for polling.
 */
export async function submitVideoGeneration(params: VideoGenerateParams): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const body: Record<string, unknown> = {
    model: "grok-imagine-video",
    prompt: params.prompt,
  };

  if (params.duration) body.duration = Math.min(15, Math.max(1, params.duration));
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.resolution) body.resolution = params.resolution;
  if (params.image_url) body.image = params.image_url;

  const res = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    logger.error("xAI video submission failed", { status: res.status, error: errorText });
    throw new Error(`xAI API error (${res.status}): ${errorText}`);
  }

  const data: VideoSubmitResponse = await res.json();
  return data.request_id;
}

/**
 * Poll for video generation status.
 */
export async function getVideoStatus(requestId: string): Promise<VideoStatusResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const res = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`xAI video status error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Submit video generation and poll until complete.
 * Polls every 5 seconds, times out after 10 minutes.
 */
export async function generateVideo(params: VideoGenerateParams): Promise<VideoStatusResponse> {
  const requestId = await submitVideoGeneration(params);

  const maxWait = 10 * 60 * 1000; // 10 minutes
  const pollInterval = 5000; // 5 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const status = await getVideoStatus(requestId);

    if (status.status === "done") return status;
    if (status.status === "failed") throw new Error("Video generation failed");
    if (status.status === "expired") throw new Error("Video generation request expired");
    // "pending" → keep polling
  }

  throw new Error("Video generation timed out (10 minutes)");
}
