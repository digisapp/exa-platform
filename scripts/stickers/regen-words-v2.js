/* v2 typography pass: regenerate the text-dominant stickers on both platforms
   with real display fonts + chrome/extrusion effects, then swap the DB rows'
   URLs to the new files (old storage objects stay — sent messages keep them).

   EXA:   Archivo Black, -8° skew, 80s chrome gradients, deep extrusion, glow.
   Digis: Titan One, puffy extrusion, thick white die-cut, candy gradients. */
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const fs = require("fs");
const path = require("path");

const S = 512;
const OUT = path.join(__dirname, "v2");
fs.mkdirSync(OUT, { recursive: true });

// ═══ EXA chrome style ════════════════════════════════════════════════════
const EXA_DEFS = `
  <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#ffc4e8"/>
    <stop offset="49%" stop-color="#f472b6"/><stop offset="51%" stop-color="#7e22ce"/>
    <stop offset="74%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#67e8f9"/>
  </linearGradient>
  <linearGradient id="chromefire" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fffbeb"/><stop offset="32%" stop-color="#fde047"/>
    <stop offset="49%" stop-color="#f97316"/><stop offset="51%" stop-color="#b91c1c"/>
    <stop offset="76%" stop-color="#ef4444"/><stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
  <linearGradient id="chromelove" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffffff"/><stop offset="34%" stop-color="#fbcfe8"/>
    <stop offset="49%" stop-color="#f472b6"/><stop offset="51%" stop-color="#be185d"/>
    <stop offset="78%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f9a8d4"/>
  </linearGradient>
  <linearGradient id="chromegold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fffbeb"/><stop offset="32%" stop-color="#fde68a"/>
    <stop offset="49%" stop-color="#f59e0b"/><stop offset="51%" stop-color="#92400e"/>
    <stop offset="76%" stop-color="#d97706"/><stop offset="100%" stop-color="#fde68a"/>
  </linearGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="9" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="5" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

const EXTRUDE = { chrome: "#2e1065", chromefire: "#450a0a", chromelove: "#500724", chromegold: "#451a03" };

function exaSvg(inner) {
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg"><defs>${EXA_DEFS}</defs>${inner}</svg>`;
}

function exaWord(lines, { grad = "chrome", size = 150, sub = null } = {}) {
  lines = Array.isArray(lines) ? lines : [lines];
  const maxLen = Math.max(...lines.map((l) => l.length));
  const fitted = Math.min(size, Math.floor((S - 76) / (0.74 * maxLen)));
  const lineH = fitted * 1.0;
  const startY = (S - lineH * lines.length) / 2 + fitted * 0.82 - (sub ? 16 : 0);
  const dark = EXTRUDE[grad];
  const layers = lines.map((w, i) => {
    const y = startY + i * lineH;
    const t = (dy, fill, stroke) => `
      <text x="${S / 2}" y="${y + dy}" text-anchor="middle" font-family="Archivo Black"
        font-size="${fitted}" letter-spacing="1" fill="${fill}"${stroke ? ` stroke="#ffffff" stroke-width="2.5" paint-order="stroke"` : ""}>${w}</text>`;
    return t(12, dark) + t(8, dark) + t(4, dark) + t(0, `url(#${grad})`, true);
  }).join("");
  const subText = sub
    ? `<text x="${S / 2}" y="${startY + (lines.length - 1) * lineH + 62}" text-anchor="middle"
        font-family="Archivo Black" font-size="30" letter-spacing="14" fill="#ffffff"
        fill-opacity="0.92" filter="url(#softglow)">${sub}</text>`
    : "";
  return exaSvg(`
    <g transform="translate(${S / 2} ${S / 2}) skewX(-8) translate(${-S / 2} ${-S / 2})">
      <g filter="url(#glow)">${layers}</g>
    </g>${subText}`);
}

const EXA_V2 = [
  ["OMG!", ["OMG!"], { grad: "chrome", size: 168 }],
  ["Slay", ["SLAY"], { grad: "chrome", size: 168 }],
  ["Yass", ["YASS"], { grad: "chromefire", size: 160 }],
  ["Wow", ["WOW"], { grad: "chrome", size: 170 }],
  ["Let's Go!", ["LET'S", "GO!"], { grad: "chrome", size: 150 }],
  ["On Fire", ["ON", "FIRE"], { grad: "chromefire", size: 155 }],
  ["XOXO", ["XOXO"], { grad: "chromelove", size: 150 }],
  ["Ate", ["ATE"], { grad: "chrome", size: 185 }],
  ["Period.", ["PERIOD."], { grad: "chrome", size: 128 }],
  ["Iconic", ["ICONIC"], { grad: "chromegold", size: 132 }],
  ["Obsessed", ["OBSESSED"], { grad: "chromelove", size: 108 }],
  ["Hot!", ["HOT!"], { grad: "chromefire", size: 178 }],
  ["Serving", ["SERVING"], { grad: "chrome", size: 120 }],
  ["Runway Ready", ["RUNWAY", "READY"], { grad: "chrome", size: 128 }],
  ["Main Character", ["MAIN", "CHARACTER"], { grad: "chrome", size: 118 }],
  ["EXA Models", ["EXA"], { grad: "chrome", size: 195, sub: "MODELS" }],
];

// ═══ Digis puffy style ═══════════════════════════════════════════════════
const DIGIS_DEFS = `
  <linearGradient id="brand" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FF5BA8"/><stop offset="100%" stop-color="#A855F7"/>
  </linearGradient>
  <linearGradient id="pinkcyan" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FF7BC0"/><stop offset="100%" stop-color="#00D9FF"/>
  </linearGradient>
  <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#A5F3FC"/><stop offset="100%" stop-color="#00D9FF"/>
  </linearGradient>
  <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FDE68A"/><stop offset="100%" stop-color="#F97316"/>
  </linearGradient>
  <linearGradient id="green" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#6EE7B7"/><stop offset="100%" stop-color="#10B981"/>
  </linearGradient>
  <linearGradient id="goldc" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FDE68A"/><stop offset="100%" stop-color="#F59E0B"/>
  </linearGradient>
  <linearGradient id="lovegrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#FF8FC6"/><stop offset="100%" stop-color="#FF2E97"/>
  </linearGradient>
  <filter id="dshadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="9" stdDeviation="11" flood-color="#A855F7" flood-opacity="0.38"/>
  </filter>`;

const DIGIS_EXTRUDE = {
  brand: "#7C1D5B", pinkcyan: "#0E7490", cyan: "#0E7490", sun: "#9A3412",
  green: "#065F46", goldc: "#92400E", lovegrad: "#9D174D",
};

function digisSvg(inner) {
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg"><defs>${DIGIS_DEFS}</defs>${inner}</svg>`;
}

function digisWord(lines, { grad = "brand", size = 150, rot = -5 } = {}) {
  lines = Array.isArray(lines) ? lines : [lines];
  const maxLen = Math.max(...lines.map((l) => l.length));
  const fitted = Math.min(size, Math.floor((S - 96) / (0.70 * maxLen)));
  const lineH = fitted * 1.04;
  const startY = (S - lineH * lines.length) / 2 + fitted * 0.82;
  const dark = DIGIS_EXTRUDE[grad];
  const stroke = Math.max(12, Math.round(fitted * 0.13));
  const text = lines.map((w, i) => {
    const y = startY + i * lineH;
    return `
      <text x="${S / 2}" y="${y + 9}" text-anchor="middle" font-family="Titan One"
        font-size="${fitted}" fill="${dark}" stroke="#ffffff" stroke-width="${stroke}"
        stroke-linejoin="round" paint-order="stroke">${w}</text>
      <text x="${S / 2}" y="${y}" text-anchor="middle" font-family="Titan One"
        font-size="${fitted}" fill="url(#${grad})" stroke="#ffffff" stroke-width="${stroke}"
        stroke-linejoin="round" paint-order="stroke">${w}</text>
      <text x="${S / 2}" y="${y}" text-anchor="middle" font-family="Titan One"
        font-size="${fitted}" fill="url(#${grad})">${w}</text>`;
  }).join("");
  return digisSvg(`<g transform="rotate(${rot} ${S / 2} ${S / 2})" filter="url(#dshadow)">${text}</g>`);
}

const DIGIS_V2 = [
  ["LFG!", ["LFG!"], { grad: "brand", size: 165, rot: -6 }],
  ["W", ["W"], { grad: "pinkcyan", size: 275, rot: 4 }],
  ["Sheesh", ["SHEESH"], { grad: "cyan", size: 118, rot: -4 }],
  ["OMG", ["OMG"], { grad: "brand", size: 158, rot: 5 }],
  ["LOL", ["LOL"], { grad: "sun", size: 175, rot: -7 }],
  ["GG", ["GG"], { grad: "green", size: 215, rot: 3 }],
  ["Legend", ["LEGEND"], { grad: "goldc", size: 118, rot: -4 }],
  ["GOAT", ["GOAT"], { grad: "goldc", size: 148, rot: 4 }],
  ["100", ["100"], { grad: "brand", size: 205, rot: -5 }],
  ["Thank You!", ["THANK", "YOU!"], { grad: "brand", size: 132, rot: -4 }],
  ["XOXO", ["XOXO"], { grad: "lovegrad", size: 138, rot: 4 }],
  ["New Drop", ["NEW", "DROP"], { grad: "pinkcyan", size: 148, rot: 5 }],
  ["Clip It!", ["CLIP", "IT!"], { grad: "cyan", size: 148, rot: -5 }],
  ["Sub'd", ["SUB'D"], { grad: "brand", size: 138, rot: 4 }],
];

// ═══ render + swap ═══════════════════════════════════════════════════════
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sticker";

async function renderAll() {
  const manifest = [];
  for (const [name, lines, opts] of EXA_V2) {
    const f = path.join(OUT, `exa-${slugify(name)}.png`);
    await sharp(Buffer.from(exaWord(lines, opts))).resize(S, S).png().toFile(f);
    manifest.push({ platform: "exa", name, file: f });
  }
  for (const [name, lines, opts] of DIGIS_V2) {
    const f = path.join(OUT, `digis-${slugify(name)}.png`);
    await sharp(Buffer.from(digisWord(lines, opts))).resize(S, S).png().toFile(f);
    manifest.push({ platform: "digis", name, file: f });
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
  // review sheets (exa on dark, digis on light)
  for (const plat of ["exa", "digis"]) {
    const files = manifest.filter((m) => m.platform === plat).map((m) => m.file);
    const cols = 4, cell = 220, pad = 8;
    const comps = await Promise.all(files.map(async (f, i) => ({
      input: await sharp(f).resize(cell - pad * 2, cell - pad * 2).png().toBuffer(),
      left: (i % cols) * cell + pad, top: Math.floor(i / cols) * cell + pad,
    })));
    await sharp({
      create: { width: cols * cell, height: Math.ceil(files.length / cols) * cell, channels: 4, background: plat === "exa" ? "#0a0a14" : "#FFF8FB" },
    }).composite(comps).png().toFile(path.join(OUT, `_sheet-${plat}.png`));
  }
  console.log("rendered", manifest.length, "v2 stickers");
}

renderAll();
