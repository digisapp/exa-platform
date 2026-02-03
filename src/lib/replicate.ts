// Replicate API integration for AI photo generation

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// InstantID model for face-preserving generation
const INSTANT_ID_MODEL = "zsxkib/instant-id:2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789";

// Scenario presets with optimized prompts for sexy fashion/model photography
// Note: InstantID preserves the face from the input image, so prompts focus on scene/style
export const AI_SCENARIOS = {
  miami_bikini: {
    id: "miami_bikini",
    name: "Miami Bikini",
    description: "Hot Miami Beach swimwear shot",
    prompt: "portrait photo, same person, gorgeous supermodel in designer bikini on Miami Beach, golden tan skin, sexy confident pose, ocean waves, palm trees, Sports Illustrated swimsuit style, hot summer vibes, professional fashion photography, high quality, detailed face, stunning beauty",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face, clothed, modest",
    preview_image: "/ai-scenarios/miami-bikini.jpg",
    category: "swimwear",
  },
  pool_goddess: {
    id: "pool_goddess",
    name: "Pool Goddess",
    description: "Luxury poolside glamour",
    prompt: "portrait photo, same person, stunning supermodel in sexy bikini by infinity pool, luxury resort, glistening skin, seductive pose, bright sunny day, Maxim magazine style, hot and glamorous, professional fashion photography, high quality, detailed face, gorgeous",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/pool-goddess.jpg",
    category: "swimwear",
  },
  beach_sunset: {
    id: "beach_sunset",
    name: "Beach Sunset",
    description: "Golden hour beach goddess",
    prompt: "portrait photo, same person, sexy supermodel in revealing bikini on tropical beach at golden hour sunset, warm glowing skin, sultry pose, ocean waves, Victoria's Secret style, hot and alluring, professional swimwear photography, high quality, detailed face, stunning",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/beach-sunset.jpg",
    category: "swimwear",
  },
  lingerie_boudoir: {
    id: "lingerie_boudoir",
    name: "Lingerie Boudoir",
    description: "Sexy intimate boudoir shoot",
    prompt: "portrait photo, same person, gorgeous supermodel in designer lingerie, luxury bedroom setting, soft romantic lighting, seductive confident pose, silk sheets, high-end boudoir photography, sexy and elegant, Victoria's Secret Angel style, high quality, detailed face, stunning beauty",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/lingerie-boudoir.jpg",
    category: "intimate",
  },
  studio_glamour: {
    id: "studio_glamour",
    name: "Studio Glamour",
    description: "High fashion studio shoot",
    prompt: "portrait photo, same person, stunning supermodel in sexy designer outfit, professional studio, dramatic lighting, fierce confident pose, Vogue magazine cover style, high fashion glamour, flawless skin, high quality, detailed face, gorgeous",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/studio-glamour.jpg",
    category: "fashion",
  },
  red_carpet: {
    id: "red_carpet",
    name: "Red Carpet Glam",
    description: "Celebrity red carpet moment",
    prompt: "portrait photo, same person, stunning supermodel in sexy revealing evening gown on red carpet, paparazzi lights, glamorous confident pose, celebrity style, designer dress with high slit, Met Gala fashion, high quality, detailed face, gorgeous",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/red-carpet.jpg",
    category: "fashion",
  },
  yacht_life: {
    id: "yacht_life",
    name: "Yacht Life",
    description: "Luxury yacht lifestyle",
    prompt: "portrait photo, same person, sexy supermodel in designer bikini on luxury yacht, Mediterranean sea, golden tan, glamorous lifestyle, champagne vibes, hot summer day, billionaire lifestyle photography, high quality, detailed face, stunning beauty",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/yacht-life.jpg",
    category: "swimwear",
  },
  fitness_hot: {
    id: "fitness_hot",
    name: "Fitness Model",
    description: "Sexy athletic shoot",
    prompt: "portrait photo, same person, hot fitness model in revealing sports bra and shorts, toned athletic body, modern gym, dramatic lighting, sexy powerful pose, Sports Illustrated fitness style, sweaty glow, high quality, detailed face, stunning",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/fitness-hot.jpg",
    category: "fitness",
  },
  rooftop_night: {
    id: "rooftop_night",
    name: "Rooftop Nights",
    description: "Sexy nightlife vibes",
    prompt: "portrait photo, same person, stunning supermodel in sexy revealing dress on rooftop bar, city skyline at night, sultry confident pose, nightlife glamour, club style, hot and alluring, cinematic lighting, high quality, detailed face, gorgeous",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/rooftop-night.jpg",
    category: "nightlife",
  },
  desert_goddess: {
    id: "desert_goddess",
    name: "Desert Goddess",
    description: "Exotic desert editorial",
    prompt: "portrait photo, same person, stunning supermodel in sexy flowing sheer dress, beautiful desert at golden hour, sand dunes, exotic goddess vibes, sensual pose, warm dramatic lighting, fashion editorial, high quality, detailed face, gorgeous",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/desert-goddess.jpg",
    category: "editorial",
  },
  tropical_paradise: {
    id: "tropical_paradise",
    name: "Tropical Paradise",
    description: "Exotic island beauty",
    prompt: "portrait photo, same person, gorgeous supermodel in tiny string bikini, tropical island paradise, crystal clear water, palm trees, exotic beauty, sexy confident pose, Sports Illustrated swimsuit style, hot summer vibes, high quality, detailed face, stunning",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
    preview_image: "/ai-scenarios/tropical-paradise.jpg",
    category: "swimwear",
  },
  penthouse_luxury: {
    id: "penthouse_luxury",
    name: "Penthouse Luxury",
    description: "High-end luxury lifestyle",
    prompt: "portrait photo, same person, stunning supermodel in sexy designer outfit, luxury penthouse with city views, sophisticated glamour, seductive confident pose, billionaire lifestyle, high fashion editorial, high quality, detailed face, gorgeous",
    negative_prompt: "ugly, blurry, low quality, distorted face, extra limbs, bad anatomy, different person, wrong face",
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
