// Replicate API integration for AI photo generation

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// InstantID model - identity-preserving image generation
// Generates images that preserve facial identity from the reference photo
const INSTANT_ID_MODEL = "zsxkib/instant-id:bc613ffc51cf9e896c50fb7abeec06e29beae6e40cc1e5d4ff11fd6c0f146c88";

// Scenario presets - IMPORTANT: Prompts must NOT describe the person's appearance
// InstantID takes the face from the input image, so prompts should ONLY describe scene/setting/clothing
export const AI_SCENARIOS = {
  miami_bikini: {
    id: "miami_bikini",
    name: "Miami Bikini",
    description: "Hot Miami Beach swimwear shot",
    prompt: "fashion photo, wearing designer bikini swimsuit, Miami Beach background, ocean waves, palm trees, golden hour lighting, Sports Illustrated swimsuit editorial, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/miami-bikini.jpg",
    category: "swimwear",
  },
  pool_goddess: {
    id: "pool_goddess",
    name: "Pool Goddess",
    description: "Luxury poolside glamour",
    prompt: "fashion photo, wearing sexy bikini, luxury infinity pool, resort setting, bright sunny day, glistening water, Maxim magazine style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/pool-goddess.jpg",
    category: "swimwear",
  },
  beach_sunset: {
    id: "beach_sunset",
    name: "Beach Sunset",
    description: "Golden hour beach goddess",
    prompt: "fashion photo, wearing bikini, tropical beach at golden hour sunset, warm lighting, ocean waves, Victoria's Secret campaign style, professional swimwear photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/beach-sunset.jpg",
    category: "swimwear",
  },
  lingerie_boudoir: {
    id: "lingerie_boudoir",
    name: "Lingerie Boudoir",
    description: "Sexy intimate boudoir shoot",
    prompt: "boudoir photo, wearing designer lingerie, luxury bedroom, silk sheets, soft romantic lighting, Victoria's Secret Angel campaign, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/lingerie-boudoir.jpg",
    category: "intimate",
  },
  studio_glamour: {
    id: "studio_glamour",
    name: "Studio Glamour",
    description: "High fashion studio shoot",
    prompt: "studio portrait, wearing sexy designer outfit, professional studio lighting, dramatic shadows, Vogue magazine cover style, high fashion, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/studio-glamour.jpg",
    category: "fashion",
  },
  red_carpet: {
    id: "red_carpet",
    name: "Red Carpet Glam",
    description: "Celebrity red carpet moment",
    prompt: "red carpet photo, wearing sexy evening gown with high slit, paparazzi lights, glamorous setting, Met Gala fashion, celebrity style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/red-carpet.jpg",
    category: "fashion",
  },
  yacht_life: {
    id: "yacht_life",
    name: "Yacht Life",
    description: "Luxury yacht lifestyle",
    prompt: "lifestyle photo, wearing designer bikini, luxury yacht deck, Mediterranean sea background, sunny day, champagne lifestyle, billionaire aesthetic, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/yacht-life.jpg",
    category: "swimwear",
  },
  fitness_hot: {
    id: "fitness_hot",
    name: "Fitness Model",
    description: "Sexy athletic shoot",
    prompt: "fitness photo, wearing sports bra and shorts, modern gym setting, dramatic lighting, athletic pose, Sports Illustrated fitness style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/fitness-hot.jpg",
    category: "fitness",
  },
  rooftop_night: {
    id: "rooftop_night",
    name: "Rooftop Nights",
    description: "Sexy nightlife vibes",
    prompt: "nightlife photo, wearing sexy cocktail dress, rooftop bar, city skyline at night, cinematic lighting, club style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/rooftop-night.jpg",
    category: "nightlife",
  },
  desert_goddess: {
    id: "desert_goddess",
    name: "Desert Goddess",
    description: "Exotic desert editorial",
    prompt: "editorial photo, wearing flowing sheer dress, desert landscape at golden hour, sand dunes, warm dramatic lighting, fashion magazine style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/desert-goddess.jpg",
    category: "editorial",
  },
  tropical_paradise: {
    id: "tropical_paradise",
    name: "Tropical Paradise",
    description: "Exotic island beauty",
    prompt: "fashion photo, wearing string bikini, tropical island paradise, crystal clear water, palm trees, Sports Illustrated swimsuit style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/tropical-paradise.jpg",
    category: "swimwear",
  },
  penthouse_luxury: {
    id: "penthouse_luxury",
    name: "Penthouse Luxury",
    description: "High-end luxury lifestyle",
    prompt: "lifestyle photo, wearing sexy designer outfit, luxury penthouse, city views through windows, sophisticated setting, high fashion editorial style, professional photography, 8k",
    negative_prompt: "ugly, blurry, low quality, distorted, deformed, disfigured, bad anatomy, extra limbs",
    preview_image: "/ai-scenarios/penthouse-luxury.jpg",
    category: "lifestyle",
  },
} as const;

export type ScenarioId = keyof typeof AI_SCENARIOS;

// Cost in coins per generation (generates 4 images)
export const AI_GENERATION_COST = 5;

export interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string[];
  error?: string;
  metrics?: {
    predict_time?: number;
  };
}

// Start a prediction on Replicate using Face-to-Many model
export async function startGeneration(
  faceImageUrl: string,
  scenarioId: ScenarioId
): Promise<{ predictionId: string } | { error: string }> {
  if (!REPLICATE_API_TOKEN) {
    return { error: "Replicate API token not configured" };
  }

  const scenario = AI_SCENARIOS[scenarioId];
  if (!scenario) {
    return { error: "Invalid scenario" };
  }

  try {
    console.log("[Replicate] Starting generation with face image:", faceImageUrl);
    console.log("[Replicate] Scenario:", scenarioId, "Prompt:", scenario.prompt.slice(0, 100));

    // Verify the image URL is accessible
    try {
      const imgCheck = await fetch(faceImageUrl, { method: "HEAD" });
      console.log("[Replicate] Face image URL check:", imgCheck.status, imgCheck.ok ? "OK" : "FAILED");
      if (!imgCheck.ok) {
        console.error("[Replicate] Face image URL not accessible!");
      }
    } catch (e) {
      console.error("[Replicate] Could not verify face image URL:", e);
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: INSTANT_ID_MODEL.split(":")[1],
        input: {
          // InstantID face reference image
          image: faceImageUrl,
          // Prompt describes the scene and outfit (NOT the person's appearance)
          prompt: `a woman, ${scenario.prompt}`,
          negative_prompt: `${scenario.negative_prompt}, different person, wrong face, distorted face`,
          // Identity preservation strength (0-1, higher = more face fidelity)
          ip_adapter_scale: 0.8,
          // IdentityNet strength (0-1, higher = more identity preservation)
          identitynet_strength_ratio: 0.8,
          // CFG scale - how closely to follow the prompt (lower = more natural)
          guidance_scale: 5,
          // Number of inference steps
          num_inference_steps: 30,
          // Scheduler
          scheduler: "EulerDiscreteScheduler",
          // Seed for reproducibility (random if not set)
          seed: -1,
          // Output dimensions (portrait ratio for fashion)
          width: 640,
          height: 960,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Replicate] API error:", response.status, error);
      console.error("[Replicate] Model version:", INSTANT_ID_MODEL.split(":")[1]);
      return { error: `Failed to start generation: ${response.status}` };
    }

    const prediction = await response.json();
    console.log("[Replicate] Prediction started:", prediction.id);
    return { predictionId: prediction.id };
  } catch (error) {
    console.error("[Replicate] Error:", error);
    return { error: "Failed to connect to AI service" };
  }
}

// Check prediction status
export async function getPrediction(
  predictionId: string
): Promise<ReplicatePrediction | { error: string }> {
  if (!REPLICATE_API_TOKEN) {
    return { error: "Replicate API token not configured" };
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      return { error: "Failed to get prediction status" };
    }

    return await response.json();
  } catch (error) {
    console.error("[Replicate] Error getting prediction:", error);
    return { error: "Failed to check generation status" };
  }
}

// Cancel a prediction
export async function cancelPrediction(predictionId: string): Promise<boolean> {
  if (!REPLICATE_API_TOKEN) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        },
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}
