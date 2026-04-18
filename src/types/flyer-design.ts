/** A draggable overlay image placed on the flyer */
export interface FlyerOverlay {
  id: string;
  url: string;        // public URL to the PNG
  x: number;          // 0–1080 (template coordinates)
  y: number;          // 0–1350
  width: number;      // rendered width in template px
  height: number;     // rendered height in template px
  opacity: number;    // 0–1
}

export interface FlyerDesignSettings {
  // Background gradient (5 stops: 0%, 25%, 50%, 75%, 100%)
  gradientColors: [string, string, string, string, string];

  // Text content
  tagline: string;
  ticketLineText: string;
  // venue + date are derived from event but can be overridden
  venueOverride: string;
  dateOverride: string;

  // Photo border
  photoBorderColor: string;

  // Font sizes (px)
  taglineFontSize: number;
  modelNameFontSize: number;
  venueFontSize: number;
  dateFontSize: number;

  // Decorative toggles
  showPalmTrees: boolean;
  showHearts: boolean;
  showGlowEffects: boolean;

  // Model info toggles
  showInstagram: boolean;

  // Ticket banner gradient
  ticketBannerColor1: string;
  ticketBannerColor2: string;

  // Custom overlay images
  overlays: FlyerOverlay[];
}

export const DEFAULT_DESIGN: FlyerDesignSettings = {
  gradientColors: ["#FF69B4", "#FF8FA0", "#FFB088", "#FFCC80", "#FFB347"],
  tagline: "Swim Shows",
  ticketLineText: "TICKETS + VIP — EXAMODELS.COM @EXA.MODELS",
  venueOverride: "",
  dateOverride: "",
  photoBorderColor: "#FF69B4",
  taglineFontSize: 72,
  modelNameFontSize: 48,
  venueFontSize: 36,
  dateFontSize: 22,
  showPalmTrees: true,
  showHearts: true,
  showGlowEffects: true,
  showInstagram: true,
  ticketBannerColor1: "#FF8C00",
  ticketBannerColor2: "#FF6347",
  overlays: [],
};

export interface FlyerPreset {
  name: string;
  settings: FlyerDesignSettings;
}

export const FLYER_PRESETS: FlyerPreset[] = [
  {
    name: "Pink Sunset",
    settings: { ...DEFAULT_DESIGN },
  },
  {
    name: "Ocean Blue",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE"],
      photoBorderColor: "#0EA5E9",
      ticketBannerColor1: "#0284C7",
      ticketBannerColor2: "#0EA5E9",
    },
  },
  {
    name: "Neon Purple",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#A855F7", "#C084FC", "#D8B4FE", "#E9D5FF", "#F3E8FF"],
      photoBorderColor: "#A855F7",
      ticketBannerColor1: "#9333EA",
      ticketBannerColor2: "#A855F7",
    },
  },
  {
    name: "Midnight Gold",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#1E1B4B", "#312E81", "#4338CA", "#F59E0B", "#FBBF24"],
      photoBorderColor: "#F59E0B",
      ticketBannerColor1: "#D97706",
      ticketBannerColor2: "#F59E0B",
    },
  },
  {
    name: "Tropical Coral",
    settings: {
      ...DEFAULT_DESIGN,
      gradientColors: ["#F43F5E", "#FB7185", "#FCA5A5", "#FED7AA", "#FEF3C7"],
      photoBorderColor: "#F43F5E",
      ticketBannerColor1: "#E11D48",
      ticketBannerColor2: "#F43F5E",
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
    tagline: d.tagline,
    ticketText: d.ticketLineText,
    borderColor: d.photoBorderColor,
    taglineFontSize: String(d.taglineFontSize),
    nameFontSize: String(d.modelNameFontSize),
    venueFontSize: String(d.venueFontSize),
    dateFontSize: String(d.dateFontSize),
    showPalms: d.showPalmTrees ? "1" : "0",
    showHearts: d.showHearts ? "1" : "0",
    showGlows: d.showGlowEffects ? "1" : "0",
    showIg: d.showInstagram ? "1" : "0",
    ticketColor1: d.ticketBannerColor1,
    ticketColor2: d.ticketBannerColor2,
    ...(d.overlays.length > 0
      ? { overlays: JSON.stringify(d.overlays) }
      : {}),
  };
}
