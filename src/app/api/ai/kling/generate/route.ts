import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// fal.ai API configuration
const FAL_KEY = process.env.FAL_KEY;
const FAL_BASE_URL = "https://queue.fal.run";

interface GenerateRequest {
  mode: "text-to-video" | "image-to-video";
  prompt: string;
  imageUrl?: string;
  duration?: number; // 5 or 10 seconds
  aspectRatio?: "16:9" | "9:16" | "1:1";
  quality?: "standard" | "pro";
}

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY not configured. Add it to your environment variables." },
        { status: 500 }
      );
    }

    const body: GenerateRequest = await request.json();
    const { mode, prompt, imageUrl, duration = 5, aspectRatio = "16:9", quality = "standard" } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (mode === "image-to-video" && !imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required for image-to-video mode" },
        { status: 400 }
      );
    }

    // Determine fal.ai model endpoint
    // Kling 3.0 models on fal.ai
    const modelVersion = quality === "pro" ? "pro" : "standard";
    let endpoint: string;
    let payload: Record<string, unknown>;

    if (mode === "text-to-video") {
      // Text-to-video endpoint
      endpoint = `${FAL_BASE_URL}/fal-ai/kling-video/v3/${modelVersion}/text-to-video`;
      payload = {
        prompt,
        duration: `${duration}`,
        aspect_ratio: aspectRatio,
      };
    } else {
      // Image-to-video endpoint
      endpoint = `${FAL_BASE_URL}/fal-ai/kling-video/v3/${modelVersion}/image-to-video`;
      payload = {
        prompt,
        image_url: imageUrl,
        duration: `${duration}`,
        aspect_ratio: aspectRatio,
      };
    }

    // Submit to fal.ai queue
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("fal.ai API error:", error);
      return NextResponse.json(
        { error: error.detail || error.message || "Failed to start video generation" },
        { status: response.status }
      );
    }

    const result = await response.json();
    const requestId = result.request_id;

    if (!requestId) {
      return NextResponse.json(
        { error: "No request ID returned from fal.ai" },
        { status: 500 }
      );
    }

    // Store generation request in database
    await (supabase as any).from("ai_video_generations").insert({
      user_id: user.id,
      provider: "fal.ai",
      model: `kling-v3-${modelVersion}`,
      mode,
      prompt,
      input_image_url: imageUrl || null,
      task_id: requestId,
      status: "processing",
      metadata: {
        duration,
        aspect_ratio: aspectRatio,
        quality,
        fal_endpoint: endpoint,
      },
    });

    return NextResponse.json({
      success: true,
      taskId: requestId,
      message: "Video generation started",
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate video" },
      { status: 500 }
    );
  }
}
