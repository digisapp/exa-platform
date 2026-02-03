// fal.ai API integration for AI photo generation
// Using PuLID for photorealistic face-preserving generation

const FAL_KEY = process.env.FAL_KEY;

// PuLID model - specifically designed for face identity preservation
const PULID_MODEL = "fal-ai/pulid";

// Scenario presets - IMPORTANT: Prompts must NOT describe the person's appearance
// PuLID takes the face from the input image, so prompts should ONLY describe scene/setting/clothing
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

// Start a generation on fal.ai using PuLID model
export async function startGeneration(
  faceImageUrl: string,
  scenarioId: ScenarioId
): Promise<{ requestId: string } | { error: string }> {
  if (!FAL_KEY) {
    return { error: "fal.ai API key not configured" };
  }

  const scenario = AI_SCENARIOS[scenarioId];
  if (!scenario) {
    return { error: "Invalid scenario" };
  }

  try {
    console.log("[fal.ai] Starting generation with face image:", faceImageUrl);
    console.log("[fal.ai] Scenario:", scenarioId, "Prompt:", scenario.prompt.slice(0, 100));
    console.log("[fal.ai] API Key present:", !!FAL_KEY, "Key length:", FAL_KEY?.length);

    // Verify the image URL is accessible
    try {
      const imgCheck = await fetch(faceImageUrl, { method: "HEAD" });
      console.log("[fal.ai] Face image URL check:", imgCheck.status, imgCheck.ok ? "OK" : "FAILED");
      if (!imgCheck.ok) {
        console.error("[fal.ai] Face image URL not accessible!");
      }
    } catch (e) {
      console.error("[fal.ai] Could not verify face image URL:", e);
    }

    // Use fal.ai queue API for async generation
    const apiUrl = `https://queue.fal.run/${PULID_MODEL}`;
    console.log("[fal.ai] API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // PuLID parameters
        reference_images: [{ image_url: faceImageUrl }],
        prompt: `professional photo of a woman, ${scenario.prompt}, highly detailed face, sharp focus, photorealistic skin texture`,
        negative_prompt: `${scenario.negative_prompt}, deformed face, distorted face, bad face, ugly face, asymmetric face, blurry face, mutated face, extra fingers, missing fingers`,
        // Face identity preservation strength (0-5, higher = more faithful to face)
        id_scale: 1.5,
        // Mode: "fidelity" preserves face better, "extreme style" for artistic
        mode: "fidelity",
        // Number of inference steps (max 12 for PuLID) - higher = better quality
        num_inference_steps: 12,
        // CFG scale (1-1.5 for PuLID)
        guidance_scale: 1.4,
        // Output dimensions
        image_size: {
          width: 768,
          height: 1024,
        },
        // Number of images to generate
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[fal.ai] API error:", response.status, response.statusText);
      console.error("[fal.ai] Error body:", errorText);
      return { error: `Failed to start generation: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    console.log("[fal.ai] Generation queued:", result.request_id);
    return { requestId: result.request_id };
  } catch (error) {
    console.error("[fal.ai] Error:", error);
    return { error: "Failed to connect to AI service" };
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
      `https://queue.fal.run/${PULID_MODEL}/requests/${requestId}/status`,
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
      `https://queue.fal.run/${PULID_MODEL}/requests/${requestId}`,
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
      `https://queue.fal.run/${PULID_MODEL}/requests/${requestId}/cancel`,
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
