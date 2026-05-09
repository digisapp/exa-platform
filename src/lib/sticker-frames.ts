import sharp from "sharp";

export type StickerFrameStyle = "neon" | "gold" | "circle" | "plain" | "polaroid";

export const STICKER_FRAME_STYLES: { id: StickerFrameStyle; label: string }[] = [
  { id: "neon", label: "Neon" },
  { id: "gold", label: "Gold" },
  { id: "circle", label: "Circle" },
  { id: "polaroid", label: "Polaroid" },
  { id: "plain", label: "Plain" },
];

const SIZE = 512;

/**
 * Builds an EXA-branded sticker from a source image URL.
 * Returns a PNG buffer (PNG so we can keep transparent backgrounds where applicable).
 */
export async function generateStickerFromUrl(
  sourceUrl: string,
  style: StickerFrameStyle = "neon"
): Promise<{ buffer: Buffer; contentType: "image/png"; width: number; height: number }> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source image: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  return generateStickerFromBuffer(inputBuffer, style);
}

export async function generateStickerFromBuffer(
  inputBuffer: Buffer,
  style: StickerFrameStyle = "neon"
): Promise<{ buffer: Buffer; contentType: "image/png"; width: number; height: number }> {
  // Square-crop and resize the source to SIZE x SIZE
  const baseSquare = await sharp(inputBuffer)
    .rotate() // honor EXIF
    .resize(SIZE, SIZE, { fit: "cover", position: "attention" }) // smart-crop to subject
    .png()
    .toBuffer();

  let composed: Buffer;

  switch (style) {
    case "circle":
      composed = await applyCircleFrame(baseSquare);
      break;
    case "gold":
      composed = await applyBorderFrame(baseSquare, GOLD_FRAME_SVG);
      break;
    case "polaroid":
      composed = await applyPolaroidFrame(baseSquare);
      break;
    case "plain":
      composed = await applyRoundedCorners(baseSquare, 28);
      break;
    case "neon":
    default:
      composed = await applyBorderFrame(baseSquare, NEON_FRAME_SVG);
      break;
  }

  return { buffer: composed, contentType: "image/png", width: SIZE, height: SIZE };
}

/** Applies an SVG frame overlay on top of a square base image. */
async function applyBorderFrame(baseSquare: Buffer, frameSvg: string): Promise<Buffer> {
  const rounded = await applyRoundedCorners(baseSquare, 32);
  return sharp(rounded)
    .composite([{ input: Buffer.from(frameSvg), blend: "over" }])
    .png()
    .toBuffer();
}

/** Rounds the corners of a square image. */
async function applyRoundedCorners(img: Buffer, radius: number): Promise<Buffer> {
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#fff"/>
    </svg>`
  );
  return sharp(img)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Crops to a circle. */
async function applyCircleFrame(baseSquare: Buffer): Promise<Buffer> {
  const r = SIZE / 2;
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>
    </svg>`
  );
  const circular = await sharp(baseSquare)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  return sharp(circular)
    .composite([{ input: Buffer.from(CIRCLE_FRAME_SVG), blend: "over" }])
    .png()
    .toBuffer();
}

/** Polaroid-style: white bottom strip, drop shadow */
async function applyPolaroidFrame(baseSquare: Buffer): Promise<Buffer> {
  const strip = 64; // bottom strip height
  // Keep the photo area square — pad below with white
  const paddedHeight = SIZE + strip;
  const padded = await sharp({
    create: {
      width: SIZE,
      height: paddedHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: baseSquare, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Round the outer corners of the polaroid card
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${paddedHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${SIZE}" height="${paddedHeight}" rx="22" ry="22" fill="#fff"/>
    </svg>`
  );
  const rounded = await sharp(padded)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Add a subtle EXA wordmark in the bottom strip
  const wordmark = Buffer.from(
    `<svg width="${SIZE}" height="${paddedHeight}" xmlns="http://www.w3.org/2000/svg">
      <text x="${SIZE / 2}" y="${SIZE + 42}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700"
            fill="url(#g)" letter-spacing="6">EXA</text>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ec4899"/>
          <stop offset="50%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#06b6d4"/>
        </linearGradient>
      </defs>
    </svg>`
  );

  // Resize back to SIZE x SIZE so all stickers stay uniform
  return sharp(rounded)
    .composite([{ input: wordmark, blend: "over" }])
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// ── Frame SVGs ───────────────────────────────────────────────────────────────

const NEON_FRAME_SVG = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="6" y="6" width="${SIZE - 12}" height="${SIZE - 12}" rx="32" ry="32"
        fill="none" stroke="url(#neon)" stroke-width="6" filter="url(#glow)"/>
  <text x="${SIZE - 18}" y="${SIZE - 18}" text-anchor="end"
        font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700"
        fill="white" fill-opacity="0.85" letter-spacing="3">EXA</text>
</svg>`;

const GOLD_FRAME_SVG = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="goldglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="6" y="6" width="${SIZE - 12}" height="${SIZE - 12}" rx="32" ry="32"
        fill="none" stroke="url(#gold)" stroke-width="8" filter="url(#goldglow)"/>
  <text x="${SIZE - 18}" y="${SIZE - 18}" text-anchor="end"
        font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700"
        fill="#fde68a" letter-spacing="3">EXA</text>
</svg>`;

const CIRCLE_FRAME_SVG = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cn" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="cglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 6}"
          fill="none" stroke="url(#cn)" stroke-width="6" filter="url(#cglow)"/>
</svg>`;
