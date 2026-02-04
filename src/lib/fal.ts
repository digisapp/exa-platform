// fal.ai API integration for AI photo generation
// Two-step approach: Generate base image with Flux, then face-swap

const FAL_KEY = process.env.FAL_KEY;

// Flux Pro for high-quality base image generation
// Use the same model ID for all queue operations (submit, status, result)
const FLUX_MODEL = "fal-ai/flux-pro/v1.1";
// Replicate API for deepfake-quality face swap (Easel AI)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
// easel/advanced-face-swap - commercial deepfake quality, replaces full body
const REPLICATE_FACE_SWAP_MODEL = "easel/advanced-face-swap";

// Scenario presets for base image generation
// Face will be swapped in the second step, so prompts describe the full scene with a model
export const AI_SCENARIOS = {
  miami_bikini: {
    id: "miami_bikini",
    name: "Miami Bikini",
    description: "Hot Miami Beach swimwear shot",
    prompt: "fashion photo, wearing designer bikini swimsuit, Miami Beach background, ocean waves, palm trees, golden hour lighting, Sports Illustrated swimsuit editorial, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/miami-bikini.jpg",
    category: "swimwear",
  },
  pool_goddess: {
    id: "pool_goddess",
    name: "Pool Goddess",
    description: "Luxury poolside glamour",
    prompt: "fashion photo, wearing sexy bikini, luxury infinity pool, resort setting, bright sunny day, glistening water, Maxim magazine style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/pool-goddess.jpg",
    category: "swimwear",
  },
  beach_sunset: {
    id: "beach_sunset",
    name: "Beach Sunset",
    description: "Golden hour beach goddess",
    prompt: "fashion photo, wearing bikini, tropical beach at golden hour sunset, warm lighting, ocean waves, Victoria's Secret campaign style, professional swimwear photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/beach-sunset.jpg",
    category: "swimwear",
  },
  lingerie_boudoir: {
    id: "lingerie_boudoir",
    name: "Lingerie Boudoir",
    description: "Sexy intimate boudoir shoot",
    prompt: "boudoir photo, wearing designer lingerie, luxury bedroom, silk sheets, soft romantic lighting, Victoria's Secret Angel campaign, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/lingerie-boudoir.jpg",
    category: "intimate",
  },
  studio_glamour: {
    id: "studio_glamour",
    name: "Studio Glamour",
    description: "High fashion studio shoot",
    prompt: "studio portrait, wearing sexy designer outfit, professional studio lighting, dramatic shadows, Vogue magazine cover style, high fashion, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/studio-glamour.jpg",
    category: "fashion",
  },
  red_carpet: {
    id: "red_carpet",
    name: "Red Carpet Glam",
    description: "Celebrity red carpet moment",
    prompt: "red carpet photo, wearing sexy evening gown with high slit, paparazzi lights, glamorous setting, Met Gala fashion, celebrity style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/red-carpet.jpg",
    category: "fashion",
  },
  yacht_life: {
    id: "yacht_life",
    name: "Yacht Life",
    description: "Luxury yacht lifestyle",
    prompt: "lifestyle photo, wearing designer bikini, luxury yacht deck, Mediterranean sea background, sunny day, champagne lifestyle, billionaire aesthetic, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/yacht-life.jpg",
    category: "swimwear",
  },
  fitness_hot: {
    id: "fitness_hot",
    name: "Fitness Model",
    description: "Sexy athletic shoot",
    prompt: "fitness photo, wearing sports bra and shorts, modern gym setting, dramatic lighting, athletic pose, Sports Illustrated fitness style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/fitness-hot.jpg",
    category: "fitness",
  },
  rooftop_night: {
    id: "rooftop_night",
    name: "Rooftop Nights",
    description: "Sexy nightlife vibes",
    prompt: "nightlife photo, wearing sexy cocktail dress, rooftop bar, city skyline at night, cinematic lighting, club style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/rooftop-night.jpg",
    category: "nightlife",
  },
  desert_goddess: {
    id: "desert_goddess",
    name: "Desert Goddess",
    description: "Exotic desert editorial",
    prompt: "editorial photo, wearing flowing sheer dress, desert landscape at golden hour, sand dunes, warm dramatic lighting, fashion magazine style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/desert-goddess.jpg",
    category: "editorial",
  },
  tropical_paradise: {
    id: "tropical_paradise",
    name: "Tropical Paradise",
    description: "Exotic island beauty",
    prompt: "fashion photo, wearing string bikini, tropical island paradise, crystal clear water, palm trees, Sports Illustrated swimsuit style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/tropical-paradise.jpg",
    category: "swimwear",
  },
  penthouse_luxury: {
    id: "penthouse_luxury",
    name: "Penthouse Luxury",
    description: "High-end luxury lifestyle",
    prompt: "lifestyle photo, wearing sexy designer outfit, luxury penthouse, city views through windows, sophisticated setting, high fashion editorial style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs, cartoon, anime, illustration, painting, drawing",
    preview_image: "/ai-scenarios/penthouse-luxury.jpg",
    category: "lifestyle",
  },
} as const;

export type ScenarioId = keyof typeof AI_SCENARIOS;

// Cost in coins per generation
export const AI_GENERATION_COST = 5;

export interface FalPrediction {
  request_id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  response_url?: string;
  // When completed, the result is here
  images?: Array<{
    url: string;
    width: number;
    height: number;
    content_type: string;
  }>;
  error?: string;
}

// Step 1: Generate base image with Flux Pro (synchronous - waits for result)
export async function startGeneration(
  faceImageUrl: string,
  scenarioId: ScenarioId
): Promise<{ requestId: string; baseImageUrl: string; faceImageUrl: string } | { error: string }> {
  if (!FAL_KEY) {
    return { error: "fal.ai API key not configured" };
  }

  const scenario = AI_SCENARIOS[scenarioId];
  if (!scenario) {
    return { error: "Invalid scenario" };
  }

  try {
    console.log("[fal.ai] Starting Flux base image generation (sync mode)");
    console.log("[fal.ai] Scenario:", scenarioId);
    console.log("[fal.ai] Face image (for later swap):", faceImageUrl);

    // Use fal.ai synchronous API (fal.run instead of queue.fal.run)
    const apiUrl = `https://fal.run/${FLUX_MODEL}`;
    console.log("[fal.ai] API URL:", apiUrl);

    // Flux Pro prompt - describe a model in the scene (face will be swapped later)
    const fullPrompt = `professional fashion photography of a beautiful young woman, ${scenario.prompt}, clear face visible, front-facing, looking at camera, photorealistic, high quality`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: {
          width: 768,
          height: 1024,
        },
        num_images: 1,
        safety_tolerance: "5", // Less strict for fashion/swimwear
        output_format: "jpeg",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[fal.ai] Flux API error:", response.status, response.statusText);
      console.error("[fal.ai] Error body:", errorText);
      return { error: `Failed to generate image: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log("[fal.ai] Flux generation complete!");
    console.log("[fal.ai] Result:", JSON.stringify(result).slice(0, 500));

    // Synchronous API returns the images directly
    if (!result.images || result.images.length === 0) {
      return { error: "No image generated" };
    }

    const baseImageUrl = result.images[0].url;
    console.log("[fal.ai] Base image URL:", baseImageUrl);

    // Return the base image URL directly (no need for status polling)
    return {
      requestId: `sync-${Date.now()}`, // Generate a fake ID for tracking
      baseImageUrl,
      faceImageUrl
    };
  } catch (error) {
    console.error("[fal.ai] Error:", error);
    return { error: "Failed to connect to AI service" };
  }
}

// Step 2: Deepfake-quality face swap using Easel AI on Replicate
export async function faceSwap(
  baseImageUrl: string,
  faceImageUrl: string
): Promise<{ images: Array<{ url: string }> } | { error: string }> {
  if (!REPLICATE_API_TOKEN) {
    return { error: "Replicate API token not configured" };
  }

  try {
    console.log("[Replicate/Easel] Starting deepfake face swap");
    console.log("[Replicate/Easel] Target image (Flux):", baseImageUrl);
    console.log("[Replicate/Easel] Source face (user):", faceImageUrl);

    // Start prediction on Replicate using Easel's advanced face swap
    // This model replaces full body while preserving user's likeness
    const response = await fetch("https://api.replicate.com/v1/models/" + REPLICATE_FACE_SWAP_MODEL + "/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          swap_image: faceImageUrl,    // User's face to transfer
          target_image: baseImageUrl,  // Flux generated image
          hair_source: "target",       // Keep target's hair style
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Replicate/Easel] Face swap start error:", response.status, errorText);
      return { error: `Face swap failed to start: ${response.status}` };
    }

    const prediction = await response.json();
    console.log("[Replicate/Easel] Prediction started:", prediction.id);

    // Poll for completion (Easel takes ~15-30 seconds)
    let result = prediction;
    const maxWait = 55000; // 55 seconds max (Vercel has 60s timeout)
    const startTime = Date.now();

    while (result.status !== "succeeded" && result.status !== "failed" && result.status !== "canceled") {
      if (Date.now() - startTime > maxWait) {
        console.error("[Replicate/Easel] Face swap timeout");
        return { error: "Face swap timed out" };
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error("[Replicate/Easel] Status check failed:", statusResponse.status);
        continue;
      }

      result = await statusResponse.json();
      console.log("[Replicate/Easel] Status:", result.status);
    }

    if (result.status === "failed") {
      console.error("[Replicate/Easel] Face swap failed:", result.error);
      return { error: `Face swap failed: ${result.error}` };
    }

    if (result.status === "canceled") {
      return { error: "Face swap was canceled" };
    }

    console.log("[Replicate/Easel] Face swap completed:", result.output);

    // Easel returns the output URL directly
    if (result.output) {
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      return { images: [{ url: outputUrl }] };
    }

    return { error: "No image in face swap result" };
  } catch (error) {
    console.error("[Replicate/Easel] Face swap error:", error);
    return { error: "Face swap failed" };
  }
}

// Check generation status
export async function getGenerationStatus(
  requestId: string
): Promise<FalPrediction | { error: string }> {
  if (!FAL_KEY) {
    return { error: "fal.ai API key not configured" };
  }

  try {
    const response = await fetch(
      `https://queue.fal.run/${FLUX_MODEL}/requests/${requestId}/status`,
      {
        headers: {
          Authorization: `Key ${FAL_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[fal.ai] Status check error:", response.status, error);
      return { error: "Failed to get generation status" };
    }

    const status = await response.json();
    console.log("[fal.ai] Status response:", JSON.stringify(status).slice(0, 300));

    return {
      request_id: requestId,
      status: status.status,
      response_url: status.response_url,
    };
  } catch (error) {
    console.error("[fal.ai] Error getting status:", error);
    return { error: "Failed to check generation status" };
  }
}

// Get generation result (after status is COMPLETED)
export async function getGenerationResult(
  requestId: string
): Promise<FalPrediction | { error: string }> {
  if (!FAL_KEY) {
    return { error: "fal.ai API key not configured" };
  }

  try {
    const response = await fetch(
      `https://queue.fal.run/${FLUX_MODEL}/requests/${requestId}`,
      {
        headers: {
          Authorization: `Key ${FAL_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[fal.ai] Result fetch error:", response.status, error);
      return { error: "Failed to get generation result" };
    }

    const result = await response.json();
    console.log("[fal.ai] Result response:", JSON.stringify(result).slice(0, 500));

    return {
      request_id: requestId,
      status: "COMPLETED",
      images: result.images,
    };
  } catch (error) {
    console.error("[fal.ai] Error getting result:", error);
    return { error: "Failed to get generation result" };
  }
}

// Cancel a generation
export async function cancelGeneration(requestId: string): Promise<boolean> {
  if (!FAL_KEY) {
    return false;
  }

  try {
    const response = await fetch(
      `https://queue.fal.run/${FLUX_MODEL}/requests/${requestId}/cancel`,
      {
        method: "PUT",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
        },
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}
