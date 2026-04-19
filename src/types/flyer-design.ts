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

/** Built-in pattern overlays as SVG data URIs */
export interface PatternPreset {
  name: string;
  svg: string; // SVG data URI
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Leopard rosettes: organic irregular rings with inner shading
const leopardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="none"/><ellipse cx="45" cy="35" rx="18" ry="14" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="45" cy="35" rx="10" ry="7" fill="rgba(255,255,255,0.08)"/><ellipse cx="130" cy="25" rx="15" ry="19" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="130" cy="25" rx="8" ry="11" fill="rgba(255,255,255,0.07)"/><ellipse cx="220" cy="40" rx="20" ry="15" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="220" cy="40" rx="12" ry="8" fill="rgba(255,255,255,0.08)"/><ellipse cx="85" cy="90" rx="16" ry="20" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="85" cy="90" rx="9" ry="12" fill="rgba(255,255,255,0.07)"/><ellipse cx="180" cy="100" rx="19" ry="16" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="180" cy="100" rx="11" ry="9" fill="rgba(255,255,255,0.08)"/><ellipse cx="270" cy="85" rx="14" ry="18" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="270" cy="85" rx="7" ry="10" fill="rgba(255,255,255,0.07)"/><ellipse cx="30" cy="155" rx="17" ry="14" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="30" cy="155" rx="10" ry="7" fill="rgba(255,255,255,0.08)"/><ellipse cx="140" cy="165" rx="20" ry="17" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="140" cy="165" rx="12" ry="10" fill="rgba(255,255,255,0.07)"/><ellipse cx="240" cy="150" rx="16" ry="20" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="240" cy="150" rx="9" ry="12" fill="rgba(255,255,255,0.08)"/><ellipse cx="60" cy="230" rx="19" ry="15" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="60" cy="230" rx="11" ry="8" fill="rgba(255,255,255,0.07)"/><ellipse cx="170" cy="240" rx="15" ry="19" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="170" cy="240" rx="8" ry="11" fill="rgba(255,255,255,0.08)"/><ellipse cx="280" cy="225" rx="18" ry="14" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="280" cy="225" rx="10" ry="7" fill="rgba(255,255,255,0.07)"/><ellipse cx="100" cy="280" rx="17" ry="16" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/><ellipse cx="100" cy="280" rx="10" ry="9" fill="rgba(255,255,255,0.08)"/><ellipse cx="210" cy="290" rx="14" ry="18" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/><ellipse cx="210" cy="290" rx="7" ry="10" fill="rgba(255,255,255,0.07)"/><circle cx="75" cy="55" r="3" fill="rgba(255,255,255,0.12)"/><circle cx="160" cy="60" r="2.5" fill="rgba(255,255,255,0.1)"/><circle cx="250" cy="65" r="3" fill="rgba(255,255,255,0.12)"/><circle cx="110" cy="130" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="210" cy="135" r="3" fill="rgba(255,255,255,0.12)"/><circle cx="15" cy="200" r="2.5" fill="rgba(255,255,255,0.1)"/><circle cx="200" cy="200" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="290" cy="180" r="3" fill="rgba(255,255,255,0.12)"/><circle cx="35" cy="270" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="145" cy="295" r="2.5" fill="rgba(255,255,255,0.12)"/></svg>`;

// Tropical botanical: lush flowing leaves and fronds
const tropicalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="none"/><path d="M50,300 Q60,240 55,180 Q50,140 70,100 Q80,80 75,50" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/><path d="M55,180 Q30,160 10,130" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M55,180 Q80,165 100,140" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M60,220 Q35,210 15,190" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M60,220 Q85,210 105,195" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M65,140 Q40,125 20,100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/><path d="M65,140 Q90,130 115,110" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/><path d="M70,100 Q50,85 30,60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><path d="M70,100 Q95,90 120,70" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><path d="M200,300 Q195,250 205,190 Q210,150 195,110 Q185,80 200,40" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/><path d="M205,190 Q175,175 155,150" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M205,190 Q230,180 255,160" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M200,240 Q170,230 150,210" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M200,240 Q230,230 255,215" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><path d="M200,140 Q175,125 150,100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/><path d="M200,140 Q225,130 250,110" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.5"/><circle cx="130" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/><circle cx="130" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><circle cx="270" cy="80" r="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/><circle cx="270" cy="80" r="9" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><circle cx="130" cy="260" r="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/><circle cx="130" cy="260" r="10" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/></svg>`;

// Serpent scales: organic overlapping scale pattern
const serpentSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="none"/><path d="M0,30 Q15,15 30,30 Q45,15 60,30 Q75,15 90,30 Q105,15 120,30 Q135,15 150,30 Q165,15 180,30" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M-15,60 Q0,45 15,60 Q30,45 45,60 Q60,45 75,60 Q90,45 105,60 Q120,45 135,60 Q150,45 165,60 Q180,45 195,60" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M0,90 Q15,75 30,90 Q45,75 60,90 Q75,75 90,90 Q105,75 120,90 Q135,75 150,90 Q165,75 180,90" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M-15,120 Q0,105 15,120 Q30,105 45,120 Q60,105 75,120 Q90,105 105,120 Q120,105 135,120 Q150,105 165,120 Q180,105 195,120" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M0,150 Q15,135 30,150 Q45,135 60,150 Q75,135 90,150 Q105,135 120,150 Q135,135 150,150 Q165,135 180,150" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M-15,180 Q0,165 15,180 Q30,165 45,180 Q60,165 75,180 Q90,165 105,180 Q120,165 135,180 Q150,165 165,180 Q180,165 195,180" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/></svg>`;

// Celestial: moons, stars, and cosmic swirls
const celestialSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="none"/><circle cx="80" cy="70" r="25" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><circle cx="72" cy="62" r="25" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="20"/><path d="M150,20 l4,12 l12,0 l-10,7 l4,12 l-10,-7 l-10,7 l4,-12 l-10,-7 l12,0 z" fill="rgba(255,255,255,0.18)"/><path d="M250,100 l3,9 l9,0 l-7,5 l3,9 l-8,-5 l-8,5 l3,-9 l-7,-5 l9,0 z" fill="rgba(255,255,255,0.14)"/><path d="M40,180 l2,7 l7,0 l-6,4 l2,7 l-5,-4 l-5,4 l2,-7 l-6,-4 l7,0 z" fill="rgba(255,255,255,0.14)"/><path d="M200,200 l4,12 l12,0 l-10,7 l4,12 l-10,-7 l-10,7 l4,-12 l-10,-7 l12,0 z" fill="rgba(255,255,255,0.16)"/><circle cx="230" cy="50" r="2" fill="rgba(255,255,255,0.2)"/><circle cx="120" cy="130" r="1.5" fill="rgba(255,255,255,0.15)"/><circle cx="280" cy="160" r="2" fill="rgba(255,255,255,0.18)"/><circle cx="60" cy="250" r="1.5" fill="rgba(255,255,255,0.15)"/><circle cx="170" cy="280" r="2" fill="rgba(255,255,255,0.18)"/><circle cx="290" cy="250" r="1.5" fill="rgba(255,255,255,0.15)"/><circle cx="20" cy="110" r="2" fill="rgba(255,255,255,0.2)"/><circle cx="140" cy="220" r="1.5" fill="rgba(255,255,255,0.15)"/><path d="M100,240 Q120,220 110,200" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><path d="M100,240 Q80,225 85,205" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><circle cx="100" cy="240" r="18" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/><circle cx="94" cy="234" r="18" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="14"/><path d="M260,270 l3,9 l9,0 l-7,5 l3,9 l-8,-5 l-8,5 l3,-9 l-7,-5 l9,0 z" fill="rgba(255,255,255,0.14)"/></svg>`;

// Baroque ornamental: scrollwork and flourishes
const baroqueSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 250 250"><rect width="250" height="250" fill="none"/><path d="M125,20 Q140,40 130,60 Q120,80 140,95 Q160,80 150,60 Q140,40 155,20" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M125,20 Q110,40 120,60 Q130,80 110,95 Q90,80 100,60 Q110,40 95,20" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><circle cx="125" cy="95" r="5" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.2"/><path d="M20,125 Q40,110 60,120 Q80,130 95,110 Q80,90 60,100 Q40,110 20,95" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M20,125 Q40,140 60,130 Q80,120 95,140 Q80,160 60,150 Q40,140 20,155" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><circle cx="95" cy="125" r="5" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.2"/><path d="M230,125 Q210,110 190,120 Q170,130 155,110 Q170,90 190,100 Q210,110 230,95" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M230,125 Q210,140 190,130 Q170,120 155,140 Q170,160 190,150 Q210,140 230,155" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><circle cx="155" cy="125" r="5" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.2"/><path d="M125,230 Q140,210 130,190 Q120,170 140,155 Q160,170 150,190 Q140,210 155,230" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><path d="M125,230 Q110,210 120,190 Q130,170 110,155 Q90,170 100,190 Q110,210 95,230" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/><circle cx="125" cy="155" r="5" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.2"/><circle cx="125" cy="125" r="12" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><circle cx="125" cy="125" r="20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><path d="M55,55 Q70,65 65,80" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><path d="M195,55 Q180,65 185,80" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><path d="M55,195 Q70,185 65,170" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/><path d="M195,195 Q180,185 185,170" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1.2"/></svg>`;

// Tiger stripes: bold organic flowing stripes
const tigerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="none"/><path d="M-10,30 Q30,20 50,40 Q70,60 90,35 Q110,10 130,30" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6" stroke-linecap="round"/><path d="M60,70 Q90,55 110,75 Q130,95 160,70 Q180,50 210,65" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="5" stroke-linecap="round"/><path d="M-10,100 Q20,85 45,105 Q70,125 100,100 Q120,80 140,100" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6" stroke-linecap="round"/><path d="M50,140 Q80,125 105,145 Q130,165 160,140 Q180,120 210,135" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="5" stroke-linecap="round"/><path d="M-10,175 Q25,160 50,180 Q75,200 110,175 Q135,155 160,175" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6" stroke-linecap="round"/></svg>`;

export const PATTERN_PRESETS: PatternPreset[] = [
  { name: "Leopard", svg: svgToDataUri(leopardSvg) },
  { name: "Tiger", svg: svgToDataUri(tigerSvg) },
  { name: "Serpent", svg: svgToDataUri(serpentSvg) },
  { name: "Tropical", svg: svgToDataUri(tropicalSvg) },
  { name: "Celestial", svg: svgToDataUri(celestialSvg) },
  { name: "Baroque", svg: svgToDataUri(baroqueSvg) },
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
