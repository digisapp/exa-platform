// Exa Dolls - AI-generated doll-style digital twin images
// Pipeline: Generate stylized doll base with Flux Pro → Face swap with model's real photo

const FAL_KEY = process.env.FAL_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const FLUX_MODEL = "fal-ai/flux-pro/v1.1";
const REPLICATE_FACE_SWAP_MODEL = "codeplugtech/face-swap";

// Country code to nationality mapping
const NATIONALITY_MAP: Record<string, string> = {
  US: "American",
  BR: "Brazilian",
  JP: "Japanese",
  NG: "Nigerian",
  RU: "Russian",
  FR: "French",
  IN: "Indian",
  GB: "British",
  DE: "German",
  IT: "Italian",
  ES: "Spanish",
  MX: "Mexican",
  CO: "Colombian",
  AR: "Argentinian",
  CL: "Chilean",
  PE: "Peruvian",
  VE: "Venezuelan",
  PR: "Puerto Rican",
  DO: "Dominican",
  CU: "Cuban",
  KR: "Korean",
  CN: "Chinese",
  TH: "Thai",
  PH: "Filipino",
  VN: "Vietnamese",
  ID: "Indonesian",
  MY: "Malaysian",
  AU: "Australian",
  NZ: "New Zealander",
  CA: "Canadian",
  SE: "Swedish",
  NO: "Norwegian",
  DK: "Danish",
  FI: "Finnish",
  NL: "Dutch",
  BE: "Belgian",
  PL: "Polish",
  CZ: "Czech",
  AT: "Austrian",
  CH: "Swiss",
  PT: "Portuguese",
  GR: "Greek",
  TR: "Turkish",
  IL: "Israeli",
  EG: "Egyptian",
  MA: "Moroccan",
  ZA: "South African",
  KE: "Kenyan",
  GH: "Ghanaian",
  ET: "Ethiopian",
  JM: "Jamaican",
  TT: "Trinidadian",
  UA: "Ukrainian",
  RO: "Romanian",
  HU: "Hungarian",
  HR: "Croatian",
  RS: "Serbian",
  LB: "Lebanese",
  IR: "Iranian",
  PK: "Pakistani",
  BD: "Bangladeshi",
  LK: "Sri Lankan",
  MM: "Burmese",
  TW: "Taiwanese",
  HK: "Hong Konger",
  SG: "Singaporean",
};

// Skin tone descriptions for prompt engineering
const SKIN_TONE_DESCRIPTIONS: Record<string, string> = {
  fair: "fair porcelain skin with subtle glow",
  light: "light creamy skin with soft undertones",
  medium: "medium warm skin with golden undertones",
  olive: "olive-toned skin with warm undertones",
  tan: "sun-kissed tan skin with warm golden glow",
  brown: "warm brown skin with rich undertones",
  "deep brown": "deep rich brown skin with radiant undertone",
  dark: "dark skin with beautiful deep undertones",
  ebony: "rich deep ebony skin with radiant glow",
};

// Hair style variations for variety
const HAIR_STYLES = [
  "long voluminous waves",
  "sleek straight with middle part",
  "glamorous curls",
  "long flowing layers",
  "elegant half-up half-down style",
  "bold voluminous blowout",
  "chic side-swept waves",
  "long with face-framing layers",
];

// Fashion outfit variations
const OUTFIT_STYLES = [
  "trendy designer crop top and mini skirt with statement accessories",
  "glamorous bodycon dress with bold jewelry",
  "chic high-fashion streetwear with designer handbag",
  "stunning cocktail dress with sparkling accessories",
  "bold contemporary designer outfit with chunky jewelry",
  "sleek fashion-forward two-piece set with gold accessories",
  "gorgeous off-shoulder top with designer jeans and heels",
  "luxe athleisure with oversized sunglasses and gold chains",
];

export interface ExaDollModelInput {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  country_code: string | null;
  hair_color: string | null;
  eye_color: string | null;
  skin_tone: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  profile_photo_url: string | null;
  focus_tags: string[] | null;
}

/**
 * Generate a deterministic Exa Doll prompt from model data.
 * Uses model ID hash to pick consistent style variations.
 */
export function generateExaDollPrompt(model: ExaDollModelInput): string {
  // Use model ID to pick deterministic style variations
  const hash = simpleHash(model.id);
  const hairStyle = HAIR_STYLES[hash % HAIR_STYLES.length];
  const outfitStyle = OUTFIT_STYLES[(hash + 3) % OUTFIT_STYLES.length];

  const nationality = model.country_code
    ? NATIONALITY_MAP[model.country_code] || "international"
    : "international";

  const hairColor = model.hair_color || "dark";
  const eyeColor = model.eye_color || "brown";

  const skinDesc = model.skin_tone
    ? SKIN_TONE_DESCRIPTIONS[model.skin_tone.toLowerCase()] || `${model.skin_tone} skin`
    : "flawless beautiful skin";

  // Core Exa Doll prompt - highly structured for consistency
  const prompt = [
    "Exa Doll stylized fashion doll portrait",
    "highly stylized glossy doll aesthetic",
    "exaggerated fashion doll proportions with oversized head",
    `enormous sparkling ${eyeColor} eyes with dramatic long lashes`,
    "full plump glossy lips with perfect lipstick",
    `${hairColor} hair styled in ${hairStyle}`,
    `${nationality} beauty inspired`,
    `${skinDesc}`,
    "sharp defined cheekbones",
    "small cute nose",
    "glamorous confident expression with slight smirk",
    "heavy dramatic makeup with bold eyeshadow and contour",
    "slim stylized fashion doll body",
    `wearing ${outfitStyle}`,
    "glossy plastic doll texture with slight shine on skin",
    "vibrant saturated colors",
    "clean smooth rendering",
    "soft studio lighting with rim light",
    "solid pastel gradient background",
    "Y2K fashion doll aesthetic",
    "highly detailed",
    "8k quality",
  ].join(", ");

  return prompt;
}

/**
 * Step 1: Generate base Exa Doll image with Flux Pro via fal.ai
 */
export async function generateExaDollBase(
  prompt: string
): Promise<{ baseImageUrl: string } | { error: string }> {
  if (!FAL_KEY) {
    return { error: "FAL_KEY not configured" };
  }

  try {
    console.log("[ExaDolls] Starting Flux generation");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const response = await fetch(`https://fal.run/${FLUX_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: 768, height: 1024 },
        num_images: 1,
        safety_tolerance: "5",
        output_format: "jpeg",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ExaDolls] Flux error:", response.status, errorText);
      return { error: `Flux generation failed: ${response.status}` };
    }

    const result = await response.json();

    if (!result.images || result.images.length === 0) {
      return { error: "No image generated" };
    }

    console.log("[ExaDolls] Base image generated successfully");
    return { baseImageUrl: result.images[0].url };
  } catch (error) {
    console.error("[ExaDolls] Generation error:", error);
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "Generation timed out (55s). Try again." };
    }
    return { error: "Failed to connect to AI service" };
  }
}

/**
 * Step 2a: Start face swap on Replicate (returns prediction ID)
 */
export async function startFaceSwap(
  baseImageUrl: string,
  faceImageUrl: string
): Promise<{ predictionId: string } | { error: string }> {
  if (!REPLICATE_API_TOKEN) {
    return { error: "REPLICATE_API_TOKEN not configured" };
  }

  try {
    console.log("[ExaDolls] Starting face swap");

    const response = await fetch(
      `https://api.replicate.com/v1/models/${REPLICATE_FACE_SWAP_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            input_image: baseImageUrl,
            swap_image: faceImageUrl,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ExaDolls] Face swap start error:", response.status, errorText);
      return { error: `Face swap failed to start: ${response.status}` };
    }

    const prediction = await response.json();
    console.log("[ExaDolls] Face swap started:", prediction.id);
    return { predictionId: prediction.id };
  } catch (error) {
    console.error("[ExaDolls] Face swap error:", error);
    return { error: "Face swap failed to start" };
  }
}

/**
 * Step 2b: Poll face swap status
 */
export async function checkFaceSwapStatus(
  predictionId: string
): Promise<{ status: "processing" | "completed" | "failed"; imageUrl?: string; error?: string }> {
  if (!REPLICATE_API_TOKEN) {
    return { status: "failed", error: "REPLICATE_API_TOKEN not configured" };
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
      return { status: "processing" };
    }

    const result = await response.json();

    if (result.status === "succeeded") {
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      console.log("[ExaDolls] Face swap completed");
      return { status: "completed", imageUrl: outputUrl };
    }

    if (result.status === "failed" || result.status === "canceled") {
      return { status: "failed", error: result.error || "Face swap failed" };
    }

    return { status: "processing" };
  } catch (error) {
    console.error("[ExaDolls] Face swap status error:", error);
    return { status: "processing" };
  }
}

/**
 * Auto-detect skin tone from a profile photo using Replicate vision model
 */
export async function detectSkinTone(
  photoUrl: string
): Promise<string | null> {
  if (!REPLICATE_API_TOKEN) {
    console.error("[ExaDolls] REPLICATE_API_TOKEN not configured");
    return null;
  }

  const validTones = Object.keys(SKIN_TONE_DESCRIPTIONS);

  try {
    console.log("[ExaDolls] Auto-detecting skin tone");

    // Start prediction
    const response = await fetch(
      "https://api.replicate.com/v1/models/meta/llama-4-scout-17b-16e-instruct/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt: `Look at this person's photo. Classify their skin tone as exactly one of these options: ${validTones.join(", ")}. Reply with ONLY the skin tone label, nothing else.`,
            image: photoUrl,
            max_tokens: 10,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("[ExaDolls] Skin tone detection start error:", response.status);
      return null;
    }

    const prediction = await response.json();

    // Poll for result
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
        }
      );

      if (!pollRes.ok) continue;

      const result = await pollRes.json();

      if (result.status === "succeeded") {
        const output = Array.isArray(result.output)
          ? result.output.join("").trim().toLowerCase()
          : String(result.output || "").trim().toLowerCase();

        // Match to valid skin tone
        const matched = validTones.find((tone) => output.includes(tone));
        if (matched) {
          console.log("[ExaDolls] Detected skin tone:", matched);
          return matched;
        }
        console.warn("[ExaDolls] Could not match skin tone from output:", output);
        return null;
      }

      if (result.status === "failed" || result.status === "canceled") {
        console.error("[ExaDolls] Skin tone detection failed:", result.error);
        return null;
      }
    }

    console.warn("[ExaDolls] Skin tone detection timed out");
    return null;
  } catch (error) {
    console.error("[ExaDolls] Skin tone detection error:", error);
    return null;
  }
}

/**
 * Simple hash function for deterministic style selection
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
