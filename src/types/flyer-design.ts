/** A draggable overlay image placed on the flyer */
export interface FlyerOverlay {
  id: string;
  url: string;
  storagePath?: string; // Supabase Storage path for cleanup
  x: number;          // 0–1080 (template coordinates)
  y: number;          // 0–1350
  width: number;
  height: number;
  opacity: number;    // 0–1
  layer?: "front" | "back"; // "back" renders behind model photo; default "front"
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

/** Built-in pattern overlays as SVG data URIs */
export interface PatternPreset {
  name: string;
  svg: string; // SVG data URI
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PATTERN_PRESETS: PatternPreset[] = [
  {
    name: "Cheetah",
    svg: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="none"/><ellipse cx="18" cy="12" rx="8" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="55" cy="24" rx="6" ry="8" fill="rgba(255,255,255,0.15)"/><ellipse cx="92" cy="8" rx="9" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="130" cy="20" rx="7" ry="9" fill="rgba(255,255,255,0.15)"/><ellipse cx="168" cy="10" rx="8" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="35" cy="50" rx="6" ry="7" fill="rgba(255,255,255,0.15)"/><ellipse cx="75" cy="58" rx="9" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="112" cy="45" rx="5" ry="8" fill="rgba(255,255,255,0.15)"/><ellipse cx="150" cy="55" rx="8" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="188" cy="48" rx="6" ry="7" fill="rgba(255,255,255,0.15)"/><ellipse cx="15" cy="85" rx="7" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="48" cy="90" rx="5" ry="9" fill="rgba(255,255,255,0.15)"/><ellipse cx="88" cy="82" rx="8" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="125" cy="92" rx="6" ry="8" fill="rgba(255,255,255,0.15)"/><ellipse cx="165" cy="80" rx="9" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="30" cy="120" rx="8" ry="7" fill="rgba(255,255,255,0.15)"/><ellipse cx="68" cy="128" rx="5" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="105" cy="118" rx="7" ry="9" fill="rgba(255,255,255,0.15)"/><ellipse cx="142" cy="125" rx="6" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="180" cy="115" rx="8" ry="7" fill="rgba(255,255,255,0.15)"/><ellipse cx="20" cy="155" rx="6" ry="8" fill="rgba(255,255,255,0.15)"/><ellipse cx="58" cy="160" rx="9" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="95" cy="150" rx="5" ry="7" fill="rgba(255,255,255,0.15)"/><ellipse cx="135" cy="162" rx="8" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="172" cy="152" rx="6" ry="9" fill="rgba(255,255,255,0.15)"/><ellipse cx="10" cy="190" rx="7" ry="5" fill="rgba(255,255,255,0.15)"/><ellipse cx="45" cy="185" rx="5" ry="8" fill="rgba(255,255,255,0.15)"/><ellipse cx="82" cy="195" rx="8" ry="6" fill="rgba(255,255,255,0.15)"/><ellipse cx="120" cy="188" rx="6" ry="7" fill="rgba(255,255,255,0.15)"/><ellipse cx="158" cy="192" rx="9" ry="5" fill="rgba(255,255,255,0.15)"/></svg>`),
  },
  {
    name: "Leopard",
    svg: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="none"/><circle cx="30" cy="30" r="10" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="30" cy="30" r="5" fill="rgba(255,255,255,0.06)"/><circle cx="100" cy="20" r="12" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="100" cy="20" r="6" fill="rgba(255,255,255,0.06)"/><circle cx="170" cy="35" r="9" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="170" cy="35" r="4" fill="rgba(255,255,255,0.06)"/><circle cx="60" cy="75" r="11" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="60" cy="75" r="5" fill="rgba(255,255,255,0.06)"/><circle cx="140" cy="80" r="10" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="140" cy="80" r="5" fill="rgba(255,255,255,0.06)"/><circle cx="25" cy="130" r="12" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="25" cy="130" r="6" fill="rgba(255,255,255,0.06)"/><circle cx="100" cy="125" r="9" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="100" cy="125" r="4" fill="rgba(255,255,255,0.06)"/><circle cx="175" cy="120" r="11" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="175" cy="120" r="5" fill="rgba(255,255,255,0.06)"/><circle cx="55" cy="170" r="10" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="55" cy="170" r="5" fill="rgba(255,255,255,0.06)"/><circle cx="135" cy="175" r="12" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.5"/><circle cx="135" cy="175" r="6" fill="rgba(255,255,255,0.06)"/></svg>`),
  },
  {
    name: "Zebra",
    svg: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="none"/><path d="M-10,20 Q30,10 60,25 Q90,40 130,30" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8"/><path d="M-10,50 Q30,40 60,55 Q90,70 130,60" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="7"/><path d="M-10,80 Q30,70 60,85 Q90,100 130,90" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8"/><path d="M-10,110 Q30,100 60,115 Q90,130 130,120" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="6"/></svg>`),
  },
  {
    name: "Snakeskin",
    svg: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="none"/><path d="M10,2 L18,10 L10,18 L2,10 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M30,2 L38,10 L30,18 L22,10 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M50,2 L58,10 L50,18 L42,10 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M70,2 L78,10 L70,18 L62,10 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M90,2 L98,10 L90,18 L82,10 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M20,18 L28,26 L20,34 L12,26 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M40,18 L48,26 L40,34 L32,26 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M60,18 L68,26 L60,34 L52,26 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M80,18 L88,26 L80,34 L72,26 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M10,34 L18,42 L10,50 L2,42 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M30,34 L38,42 L30,50 L22,42 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M50,34 L58,42 L50,50 L42,42 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M70,34 L78,42 L70,50 L62,42 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M90,34 L98,42 L90,50 L82,42 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M20,50 L28,58 L20,66 L12,58 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M40,50 L48,58 L40,66 L32,58 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M60,50 L68,58 L60,66 L52,58 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M80,50 L88,58 L80,66 L72,58 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M10,66 L18,74 L10,82 L2,74 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M30,66 L38,74 L30,82 L22,74 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M50,66 L58,74 L50,82 L42,74 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M70,66 L78,74 L70,82 L62,74 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M90,66 L98,74 L90,82 L82,74 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M20,82 L28,90 L20,98 L12,90 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M40,82 L48,90 L40,98 L32,90 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M60,82 L68,90 L60,98 L52,90 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/><path d="M80,82 L88,90 L80,98 L72,90 Z" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/></svg>`),
  },
  {
    name: "Stars",
    svg: svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="none"/><polygon points="24,10 27,19 36,19 29,25 31,34 24,28 17,34 19,25 12,19 21,19" fill="rgba(255,255,255,0.15)"/><polygon points="80,25 83,34 92,34 85,40 87,49 80,43 73,49 75,40 68,34 77,34" fill="rgba(255,255,255,0.15)"/><polygon points="150,15 153,24 162,24 155,30 157,39 150,33 143,39 145,30 138,24 147,24" fill="rgba(255,255,255,0.15)"/><polygon points="40,70 43,79 52,79 45,85 47,94 40,88 33,94 35,85 28,79 37,79" fill="rgba(255,255,255,0.15)"/><polygon points="120,65 123,74 132,74 125,80 127,89 120,83 113,89 115,80 108,74 117,74" fill="rgba(255,255,255,0.15)"/><polygon points="180,75 183,84 192,84 185,90 187,99 180,93 173,99 175,90 168,84 177,84" fill="rgba(255,255,255,0.15)"/><polygon points="15,120 18,129 27,129 20,135 22,144 15,138 8,144 10,135 3,129 12,129" fill="rgba(255,255,255,0.15)"/><polygon points="95,115 98,124 107,124 100,130 102,139 95,133 88,139 90,130 83,124 92,124" fill="rgba(255,255,255,0.15)"/><polygon points="165,125 168,134 177,134 170,140 172,149 165,143 158,149 160,140 153,134 162,134" fill="rgba(255,255,255,0.15)"/><polygon points="55,165 58,174 67,174 60,180 62,189 55,183 48,189 50,180 43,174 52,174" fill="rgba(255,255,255,0.15)"/><polygon points="135,170 138,179 147,179 140,185 142,194 135,188 128,194 130,185 123,179 132,179" fill="rgba(255,255,255,0.15)"/></svg>`),
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
