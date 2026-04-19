export type XAIImageModel = "grok-imagine-image" | "grok-imagine-image-pro";
export type XAIVideoModel = "grok-imagine-video";

export type OutputType = "image" | "video";

export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3"
  | "2:1"
  | "1:2"
  | "auto";

export type VideoAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";

export type Resolution = "1k" | "2k";
export type VideoResolution = "480p" | "720p";

export type GenerationMode = "generate" | "edit" | "style-transfer";

export interface GeneratedImage {
  id: string;
  url: string;
  saved_url?: string;
  prompt: string;
  model: XAIImageModel | XAIVideoModel;
  aspect_ratio: AspectRatio;
  resolution: Resolution | VideoResolution;
  mode: GenerationMode;
  output_type: OutputType;
  created_at: string;
  parent_id?: string;
  duration?: number;
}

export interface StudioSession {
  images: GeneratedImage[];
}

export interface EXAPreset {
  id: string;
  name: string;
  prompt_prefix: string;
  description: string;
}

export const EXA_PRESETS: EXAPreset[] = [
  {
    id: "synthwave",
    name: "Synthwave Neon",
    prompt_prefix:
      "Synthwave neon aesthetic with vibrant pink, purple, and cyan glow effects, retro-futuristic grid lines, and dark background.",
    description: "Retro-futuristic neon glow",
  },
  {
    id: "miami",
    name: "Miami Vice",
    prompt_prefix:
      "Miami Vice aesthetic with pastel pink and turquoise tones, palm trees silhouettes, sunset gradients, ocean vibes, and luxury lifestyle feel.",
    description: "Pastel sunset & palm trees",
  },
  {
    id: "fashion",
    name: "High Fashion",
    prompt_prefix:
      "High fashion editorial photography style, dramatic studio lighting, sleek minimalist aesthetic, luxury brand feel, bold composition.",
    description: "Editorial studio lighting",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    prompt_prefix:
      "Cyberpunk dystopian cityscape, neon signs, rain-soaked streets, holographic displays, dark moody atmosphere with electric blue and magenta accents.",
    description: "Neon-lit dystopian future",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    prompt_prefix:
      "Vaporwave aesthetic with pastel gradients, marble statues, retro computer graphics, Japanese text, glitch effects, and dreamy atmosphere.",
    description: "Dreamy retro digital art",
  },
  {
    id: "tropical",
    name: "Tropical Luxe",
    prompt_prefix:
      "Tropical luxury resort aesthetic, lush greenery, golden hour light, exotic flowers, crystal clear water, premium travel vibes.",
    description: "Paradise resort vibes",
  },
  {
    id: "artdeco",
    name: "Art Deco Glam",
    prompt_prefix:
      "Art Deco glamour with geometric gold patterns, black marble, champagne tones, Great Gatsby elegance, 1920s luxury aesthetic.",
    description: "Gold geometric elegance",
  },
  {
    id: "noir",
    name: "Neon Noir",
    prompt_prefix:
      "Film noir aesthetic with neon accents, dramatic shadows, rain-soaked city, moody atmosphere, high contrast black and white with selective color.",
    description: "Dark moody with neon pops",
  },
];

export const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "1:1", label: "Square", icon: "◻" },
  { value: "9:16", label: "Story", icon: "▯" },
  { value: "16:9", label: "Wide", icon: "▬" },
  { value: "4:3", label: "Standard", icon: "▭" },
  { value: "3:4", label: "Portrait", icon: "▯" },
  { value: "3:2", label: "Photo", icon: "▭" },
  { value: "2:1", label: "Banner", icon: "▬" },
  { value: "auto", label: "Auto", icon: "✦" },
];

export const VIDEO_ASPECT_RATIOS: { value: VideoAspectRatio; label: string; icon: string }[] = [
  { value: "1:1", label: "Square", icon: "◻" },
  { value: "9:16", label: "Story", icon: "▯" },
  { value: "16:9", label: "Wide", icon: "▬" },
  { value: "4:3", label: "Standard", icon: "▭" },
  { value: "3:4", label: "Portrait", icon: "▯" },
  { value: "3:2", label: "Photo", icon: "▭" },
  { value: "2:3", label: "Tall", icon: "▯" },
];

export const STYLE_TRANSFER_STYLES = [
  { id: "oil-painting", name: "Oil Painting", prompt: "Render this image as an oil painting in the style of impressionism with rich brushstrokes" },
  { id: "pencil-sketch", name: "Pencil Sketch", prompt: "Render this image as a detailed pencil sketch with precise shading and cross-hatching" },
  { id: "pop-art", name: "Pop Art", prompt: "Render this image as pop art with bold colors, halftone dots, and Andy Warhol inspiration" },
  { id: "anime", name: "Anime", prompt: "Render this image in anime/manga art style with vibrant colors and expressive details" },
  { id: "watercolor", name: "Watercolor", prompt: "Render this image as a watercolor painting with soft edges, bleeding colors, and paper texture" },
  { id: "3d-render", name: "3D Render", prompt: "Render this image as a photorealistic 3D render with dramatic lighting and cinematic quality" },
  { id: "pixel-art", name: "Pixel Art", prompt: "Render this image as detailed pixel art with a retro video game aesthetic" },
  { id: "neon-glow", name: "Neon Glow", prompt: "Render this image with vibrant neon glow effects, dark background, and synthwave color palette" },
];
