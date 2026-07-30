/* Die-cut face-sticker compositor: Vision cutout -> trimmed subject ->
   white die-cut outline + tinted glow on a 512 transparent canvas. */
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const S = 512;
const BGREMOVE = path.join(__dirname, "bgremove");

async function cutoutFromBuffer(buf, tmpTag) {
  const inP = path.join(__dirname, `tmp-in-${tmpTag}.png`);
  const outP = path.join(__dirname, `tmp-out-${tmpTag}.png`);
  // normalize input (EXIF, downscale for Vision speed) — Vision is happier with sane sizes
  await sharp(buf).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).png().toFile(inP);
  execFileSync(BGREMOVE, [inP, outP], { stdio: ["ignore", "ignore", "pipe"] });
  const cut = fs.readFileSync(outP);
  fs.unlinkSync(inP); fs.unlinkSync(outP);
  return cut;
}

/**
 * Compose a die-cut sticker from a cutout.
 * opts: { glowColor: {r,g,b}, glowOpacity, bottomMargin, maxW, maxH, overlaySvg }
 */
async function composeDieCut(cutoutBuf, opts = {}) {
  const {
    glowColor = { r: 168, g: 85, b: 247 },
    glowOpacity = 0.55,
    bottomMargin = 26,
    maxW = 416,
    maxH = 424,
    overlaySvg = null,
  } = opts;

  // Trim transparent padding around the subject
  const trimmed = await sharp(cutoutBuf)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 12 })
    .png().toBuffer();

  const meta = await sharp(trimmed).metadata();
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));
  const person = await sharp(trimmed).resize(w, h).png().toBuffer();

  const left = Math.round((S - w) / 2);
  const top = S - bottomMargin - h;

  const personLayer = await sharp({
    create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: person, left, top }]).png().toBuffer();

  // Alpha -> dilated hard mask (the die-cut white border), then a soft glow
  const alpha = await sharp(personLayer).extractChannel(3).png().toBuffer();
  // Two-pass dilation: a clearly visible ~10px white rim (classic die-cut)
  const d1 = await sharp(alpha).blur(4).threshold(10).png().toBuffer();
  const dilated = await sharp(d1).blur(6).threshold(6).png().toBuffer();
  const whiteLayer = await sharp({
    create: { width: S, height: S, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).joinChannel(dilated).png().toBuffer();

  const glowAlphaRaw = await sharp(dilated).blur(14).linear(glowOpacity, 0).png().toBuffer();
  const glowLayer = await sharp({
    create: { width: S, height: S, channels: 3, background: glowColor },
  }).joinChannel(glowAlphaRaw).png().toBuffer();

  const layers = [
    { input: glowLayer },
    { input: whiteLayer },
    { input: personLayer },
  ];
  if (overlaySvg) layers.push({ input: Buffer.from(overlaySvg) });

  return sharp({
    create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(layers).png().toBuffer();
}

// EXA: small neon wordmark bottom-right
function exaOverlay() {
  return `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
      <filter id="gl" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <text x="${S - 16}" y="${S - 14}" text-anchor="end" font-family="Archivo Black"
      font-size="26" fill="url(#g)" stroke="#ffffff" stroke-width="1.5" paint-order="stroke"
      filter="url(#gl)">EXA</text>
  </svg>`;
}

// Digis: @username bubble pill, bottom-center, slightly tilted
function digisOverlay(username) {
  const label = `@${username}`.slice(0, 18);
  const fontSize = Math.min(40, Math.floor(360 / (0.62 * label.length)));
  const padX = 24;
  const wPill = Math.round(label.length * fontSize * 0.62 + padX * 2);
  const x = Math.round((S - wPill) / 2);
  return `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FF2E97"/><stop offset="100%" stop-color="#A855F7"/>
      </linearGradient>
    </defs>
    <g transform="rotate(-3 ${S / 2} 470)">
      <rect x="${x}" y="${S - 72}" width="${wPill}" height="56" rx="28"
        fill="url(#brand)" stroke="#ffffff" stroke-width="8"/>
      <text x="${S / 2}" y="${S - 72 + 39}" text-anchor="middle" font-family="Titan One"
        font-size="${fontSize}" fill="#ffffff">${label}</text>
    </g>
  </svg>`;
}

module.exports = { cutoutFromBuffer, composeDieCut, exaOverlay, digisOverlay, S };
