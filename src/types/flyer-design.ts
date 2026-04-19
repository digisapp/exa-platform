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
  showQrCode: boolean;

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
  showQrCode: true,
  showBorder: true,
  borderColor: "#FF69B4",
  textElements: [],
  overlays: [],
};

/** Quick-add text presets */
export const TEXT_PRESETS: { label: string; element: Omit<FlyerTextElement, "id"> }[] = [
  {
    label: "Logo",
    element: { text: "exa", x: 440, y: 45, fontSize: 50, fontWeight: 900, color: "#FFFFFF", italic: false, uppercase: false },
  },
  {
    label: "Tagline",
    element: { text: "Swim Shows", x: 310, y: 100, fontSize: 72, fontWeight: 900, color: "#FFFFFF", italic: true, uppercase: false },
  },
  {
    label: "Event Title",
    element: { text: "exa Swim Shows", x: 270, y: 950, fontSize: 42, fontWeight: 900, color: "#FFFFFF", italic: true, uppercase: false },
  },
  {
    label: "Venue",
    element: { text: "MIAMI BEACH, FL", x: 310, y: 1010, fontSize: 36, fontWeight: 900, color: "#FFFFFF", italic: false, uppercase: true },
  },
  {
    label: "Date",
    element: { text: "JULY 2026", x: 400, y: 1060, fontSize: 22, fontWeight: 600, color: "#FFFFFF", italic: false, uppercase: true },
  },
  {
    label: "Ticket Line",
    element: { text: "TICKETS + VIP — EXAMODELS.COM", x: 280, y: 1110, fontSize: 16, fontWeight: 600, color: "#FFFFFF", italic: false, uppercase: true },
  },
  {
    label: "Custom Text",
    element: { text: "Your text here", x: 350, y: 600, fontSize: 32, fontWeight: 600, color: "#FFFFFF", italic: false, uppercase: false },
  },
];

export interface FlyerPreset {
  name: string;
  settings: FlyerDesignSettings;
}

export const FLYER_PRESETS: FlyerPreset[] = [
  {
    name: "Synthwave",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#E040FB", "#7C4DFF", "#536DFE", "#00E5FF", "#E040FB"],
      borderColor: "#E040FB",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showHearts: false,
      showPalmTrees: false,
      showBorder: true,
    },
  },
  {
    name: "Miami Night",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#0D0D0D", "#1A0A2E", "#16213E", "#0F3460", "#00BCD4"],
      borderColor: "#00BCD4",
      showGlowEffects: true,
      showTopGradient: false,
      showBottomGradient: true,
      showPalmTrees: true,
      showHearts: false,
      showBorder: true,
    },
  },
  {
    name: "Golden Hour",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#FF6F00", "#FF8F00", "#FFA726", "#FFCC80", "#FFF8E1"],
      borderColor: "#FFB300",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showHearts: false,
      showPalmTrees: false,
      showBorder: false,
    },
  },
  {
    name: "Noir",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#000000", "#1A1A1A", "#2D2D2D", "#3D3D3D", "#4A4A4A"],
      borderColor: "#FFFFFF",
      showGlowEffects: false,
      showTopGradient: false,
      showBottomGradient: true,
      showHearts: false,
      showPalmTrees: false,
      showBorder: true,
    },
  },
  {
    name: "Paradise",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#00C9FF", "#92FE9D", "#00C9FF", "#F0F9FF", "#92FE9D"],
      borderColor: "#00C9FF",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showPalmTrees: true,
      showHearts: false,
      showBorder: false,
    },
  },
  {
    name: "Velvet",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#880E4F", "#AD1457", "#C2185B", "#E91E63", "#F48FB1"],
      borderColor: "#F48FB1",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showHearts: true,
      showPalmTrees: false,
      showBorder: true,
    },
  },
  {
    name: "South Beach",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#00BFA5", "#26C6DA", "#4DD0E1", "#80DEEA", "#E0F7FA"],
      borderColor: "#26C6DA",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showPalmTrees: true,
      showHearts: false,
      showBorder: true,
    },
  },
  {
    name: "Art Deco",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#1A1A2E", "#16213E", "#0F3460", "#D4AF37", "#F1C40F"],
      borderColor: "#D4AF37",
      showGlowEffects: false,
      showTopGradient: false,
      showBottomGradient: true,
      showPalmTrees: false,
      showHearts: false,
      showBorder: true,
    },
  },
  {
    name: "Ocean Drive",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#FF6B6B", "#FF8E71", "#FFB088", "#48C9B0", "#1ABC9C"],
      borderColor: "#FF6B6B",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showPalmTrees: true,
      showHearts: false,
      showBorder: false,
    },
  },
  {
    name: "Coral Reef",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#FF7043", "#FF8A65", "#FFAB91", "#80CBC4", "#4DB6AC"],
      borderColor: "#FF7043",
      showGlowEffects: true,
      showTopGradient: true,
      showBottomGradient: true,
      showHearts: false,
      showPalmTrees: false,
      showBorder: true,
    },
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
    showQr: d.showQrCode ? "1" : "0",
    showBorder: d.showBorder ? "1" : "0",
    borderColor: d.borderColor,
    ...(d.textElements.length > 0 ? { texts: JSON.stringify(d.textElements) } : {}),
    ...(d.overlays.length > 0 ? { overlays: JSON.stringify(d.overlays) } : {}),
  };
}
