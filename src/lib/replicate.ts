// Replicate API integration for AI photo generation

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// InstantID model for face-preserving generation
const INSTANT_ID_MODEL = "zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789";

// Scenario presets with optimized prompts
// Note: InstantID preserves the face from the input image, so prompts focus on scene/style
export const AI_SCENARIOS = {
  beach_sunset: {
    id: "beach_sunset",
    name: "Beach Sunset",
    description: "Golden hour on a tropical beach",
    prompt: "portrait photo, same person, beautiful tropical beach at golden hour sunset, warm lighting, ocean waves, palm trees in background, natural pose, professional fashion photography, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/beach-sunset.jpg",
    category: "outdoor",
  },
  nyc_street: {
    id: "nyc_street",
    name: "NYC Street Style",
    description: "Urban vibes in New York City",
    prompt: "portrait photo, same person, street photography in New York City, Times Square lights in background, urban fashion, cinematic lighting, editorial style, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/nyc-street.jpg",
    category: "urban",
  },
  studio_glamour: {
    id: "studio_glamour",
    name: "Studio Glamour",
    description: "Professional studio with dramatic lighting",
    prompt: "studio portrait photo, same person, dramatic lighting, beauty photography, soft shadows, elegant pose, high-end fashion magazine style, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/studio-glamour.jpg",
    category: "studio",
  },
  paris_cafe: {
    id: "paris_cafe",
    name: "Parisian Cafe",
    description: "Chic European cafe setting",
    prompt: "portrait photo, same person, charming Parisian cafe, Eiffel Tower visible in distance, elegant atmosphere, natural daylight, editorial fashion photography, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/paris-cafe.jpg",
    category: "urban",
  },
  fitness_gym: {
    id: "fitness_gym",
    name: "Fitness Studio",
    description: "Athletic and powerful gym shot",
    prompt: "portrait photo, same person, fitness photography in modern gym, athletic wear, dramatic lighting, powerful pose, sports photography style, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/fitness-gym.jpg",
    category: "lifestyle",
  },
  nature_forest: {
    id: "nature_forest",
    name: "Enchanted Forest",
    description: "Magical forest with natural light",
    prompt: "portrait photo, same person, beautiful forest, dappled sunlight through trees, ethereal atmosphere, nature photography, bohemian style, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/nature-forest.jpg",
    category: "outdoor",
  },
  rooftop_night: {
    id: "rooftop_night",
    name: "Rooftop Night",
    description: "City lights at night from a rooftop",
    prompt: "portrait photo, same person, rooftop at night, city skyline with lights in background, urban nightlife, cinematic lighting, editorial fashion, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/rooftop-night.jpg",
    category: "urban",
  },
  desert_golden: {
    id: "desert_golden",
    name: "Desert Golden Hour",
    description: "Stunning desert landscape at sunset",
    prompt: "portrait photo, same person, beautiful desert landscape at golden hour, sand dunes, warm dramatic lighting, fashion photography, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/desert-golden.jpg",
    category: "outdoor",
  },
  luxury_interior: {
    id: "luxury_interior",
    name: "Luxury Interior",
    description: "Elegant high-end interior setting",
    prompt: "portrait photo, same person, luxurious modern interior, elegant furniture, soft natural lighting, high fashion editorial, sophisticated atmosphere, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/luxury-interior.jpg",
    category: "lifestyle",
  },
  pool_summer: {
    id: "pool_summer",
    name: "Pool Summer Vibes",
    description: "Sunny poolside lifestyle shot",
    prompt: "portrait photo, same person, luxury pool, summer vibes, bright sunny day, palm trees, lifestyle photography, vacation aesthetic, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/pool-summer.jpg",
    category: "lifestyle",
  },
  red_carpet: {
    id: "red_carpet",
    name: "Red Carpet Glamour",
    description: "Celebrity-style red carpet moment",
    prompt: "portrait photo, same person, red carpet, paparazzi lights, glamorous pose, celebrity style, evening wear, high fashion photography, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/red-carpet.jpg",
    category: "studio",
  },
  miami_art_deco: {
    id: "miami_art_deco",
    name: "Miami Art Deco",
    description: "Colorful Miami Beach vibes",
    prompt: "portrait photo, same person, Miami Beach, colorful art deco buildings, pastel colors, sunny day, South Beach style, fashion photography, high quality, detailed face",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/miami-art-deco.jpg",
    category: "urban",
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

// Start a prediction on Replicate
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

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: INSTANT_ID_MODEL.split(":")[1],
        input: {
          // InstantID uses 'image' for the face reference
          image: faceImageUrl,
          prompt: scenario.prompt,
          negative_prompt: scenario.negative_prompt,
          num_outputs: 4,
          // Higher guidance makes it follow prompt more (lower = more face preservation)
          guidance_scale: 3.5,
          // IP adapter scale - higher = stronger face preservation (0.0-1.5)
          ip_adapter_scale: 1.2,
          // IdentityNet strength - higher = stronger face identity (0.0-1.5)
          identitynet_strength_ratio: 1.0,
          // Number of inference steps
          num_inference_steps: 30,
          // Scheduler
          scheduler: "EulerDiscreteScheduler",
          enable_safety_checker: true,
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
