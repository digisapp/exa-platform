import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Kling API configuration
const KLING_API_KEY = process.env.KLING_API_KEY;
const KLING_BASE_URL = process.env.KLING_BASE_URL || "https://api.klingai.com/v1";

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

    if (!KLING_API_KEY) {
      return NextResponse.json(
        { error: "Kling API key not configured" },
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

    // Build request payload based on mode
    let endpoint: string;
    let payload: Record<string, unknown>;

    if (mode === "text-to-video") {
      endpoint = `${KLING_BASE_URL}/videos/text2video`;
      payload = {
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        model: quality === "pro" ? "kling-v3-pro" : "kling-v3",
      };
    } else {
      endpoint = `${KLING_BASE_URL}/videos/image2video`;
      payload = {
        prompt,
        image_url: imageUrl,
        duration,
        aspect_ratio: aspectRatio,
        model: quality === "pro" ? "kling-v3-pro" : "kling-v3",
      };
    }

    // Make request to Kling API
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KLING_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      console.error("Kling API error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to start video generation" },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Store generation request in database
    await (supabase as any).from("ai_video_generations").insert({
      user_id: user.id,
      provider: "kling",
      model: quality === "pro" ? "kling-v3-pro" : "kling-v3",
      mode,
      prompt,
      input_image_url: imageUrl || null,
      task_id: result.task_id || result.id,
      status: "processing",
      metadata: {
        duration,
        aspect_ratio: aspectRatio,
        quality,
      },
    });

    return NextResponse.json({
      success: true,
      taskId: result.task_id || result.id,
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
