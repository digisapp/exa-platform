/** A draggable overlay image placed on the flyer */
export interface FlyerOverlay {
  id: string;
  url: string;
  x: number;          // 0–1080 (template coordinates)
  y: number;          // 0–1350
  width: number;
  height: number;
  opacity: number;    // 0–1
}

/** A draggable text element placed on the flyer */
export interface FlyerTextElement {
  id: string;
  text: string;
  x: number;          // 0–1080
  y: number;          // 0–1350
  fontSize: number;   // px
  fontWeight: 400 | 600 | 900;
  color: string;      // hex
  italic: boolean;
  uppercase: boolean;
  align: "left" | "center" | "right";
}

export interface FlyerDesignSettings {
  // Background gradient (5 stops for top/bottom overlays)
  gradientColors: [string, string, string, string, string];

  // Gradient overlay toggles
  showTopGradient: boolean;
  showBottomGradient: boolean;

  // Decorative toggles
  showPalmTrees: boolean;
  showHearts: boolean;
  showGlowEffects: boolean;

  // Auto model info (changes per model)
  showModelName: boolean;
  modelNameFontSize: number;
  showInstagram: boolean;

  // Border
  showBorder: boolean;
  borderColor: string;

  // Free-form elements
  textElements: FlyerTextElement[];
  overlays: FlyerOverlay[];
}

export const DEFAULT_DESIGN: FlyerDesignSettings = {
  gradientColors: ["#FF69B4", "#FF8FA0", "#FFB088", "#FFCC80", "#FFB347"],
  showTopGradient: true,
  showBottomGradient: true,
  showPalmTrees: false,
  showHearts: false,
  showGlowEffects: true,
  showModelName: true,
  modelNameFontSize: 48,
  showInstagram: true,
  showBorder: true,
  borderColor: "#FF69B4",
  textElements: [],
  overlays: [],
};

/** Quick-add text presets */
export const TEXT_PRESETS: { label: string; element: Omit<FlyerTextElement, "id"> }[] = [
  {
    label: "Logo",
    element: { text: "exa", x: 440, y: 45, fontSize: 50, fontWeight: 900, color: "#FFFFFF", italic: false, uppercase: false, align: "center" },
  },
  {
    label: "Tagline",
    element: { text: "Swim Shows", x: 310, y: 100, fontSize: 72, fontWeight: 900, color: "#FFFFFF", italic: true, uppercase: false, align: "center" },
  },
  {
    label: "Event Title",
    element: { text: "exa Swim Shows", x: 270, y: 950, fontSize: 42, fontWeight: 900, color: "#FFFFFF", italic: true, uppercase: false, align: "center" },
  },
  {
    label: "Venue",
    element: { text: "MIAMI BEACH, FL", x: 310, y: 1010, fontSize: 36, fontWeight: 900, color: "#FFFFFF", italic: false, uppercase: true, align: "center" },
  },
  {
    label: "Date",
    element: { text: "JULY 2026", x: 400, y: 1060, fontSize: 22, fontWeight: 600, color: "#FFFFFF", italic: false, uppercase: true, align: "center" },
  },
  {
    label: "Ticket Line",
    element: { text: "TICKETS + VIP — EXAMODELS.COM", x: 280, y: 1110, fontSize: 16, fontWeight: 600, color: "#FFFFFF", italic: false, uppercase: true, align: "center" },
  },
  {
    label: "Custom Text",
    element: { text: "Your text here", x: 350, y: 600, fontSize: 32, fontWeight: 600, color: "#FFFFFF", italic: false, uppercase: false, align: "center" },
  },
];

export interface FlyerPreset {
  name: string;
  settings: FlyerDesignSettings;
}

export const FLYER_PRESETS: FlyerPreset[] = [
  { name: "Pink Sunset", settings: { ...DEFAULT_DESIGN } },
  {
    name: "Ocean Blue",
    settings: { ...DEFAULT_DESIGN, gradientColors: ["#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE"], borderColor: "#0EA5E9" },
  },
  {
    name: "Neon Purple",
    settings: { ...DEFAULT_DESIGN, gradientColors: ["#A855F7", "#C084FC", "#D8B4FE", "#E9D5FF", "#F3E8FF"], borderColor: "#A855F7" },
  },
  {
    name: "Midnight Gold",
    settings: { ...DEFAULT_DESIGN, gradientColors: ["#1E1B4B", "#312E81", "#4338CA", "#F59E0B", "#FBBF24"], borderColor: "#F59E0B" },
  },
  {
    name: "Tropical Coral",
    settings: { ...DEFAULT_DESIGN, gradientColors: ["#F43F5E", "#FB7185", "#FCA5A5", "#FED7AA", "#FEF3C7"], borderColor: "#F43F5E" },
  },
];

/** Serialize design settings to URL search params */
export function designToParams(d: FlyerDesignSettings): Record<string, string> {
  return {
    gc0: d.gradientColors[0],
    gc1: d.gradientColors[1],
    gc2: d.gradientColors[2],
    gc3: d.gradientColors[3],
    gc4: d.gradientColors[4],
    showTopGrad: d.showTopGradient ? "1" : "0",
    showBotGrad: d.showBottomGradient ? "1" : "0",
    showPalms: d.showPalmTrees ? "1" : "0",
    showHearts: d.showHearts ? "1" : "0",
    showGlows: d.showGlowEffects ? "1" : "0",
    showName: d.showModelName ? "1" : "0",
    nameFontSize: String(d.modelNameFontSize),
    showIg: d.showInstagram ? "1" : "0",
    showBorder: d.showBorder ? "1" : "0",
    borderColor: d.borderColor,
    ...(d.textElements.length > 0 ? { texts: JSON.stringify(d.textElements) } : {}),
    ...(d.overlays.length > 0 ? { overlays: JSON.stringify(d.overlays) } : {}),
  };
}
