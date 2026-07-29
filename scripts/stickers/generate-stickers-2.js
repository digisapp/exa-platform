/* EXA sticker pack #2 — platform-moment + model-culture stickers. */
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "stickers2");
fs.mkdirSync(OUT, { recursive: true });

const S = 512;

const DEFS = `
  <linearGradient id="exa" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ec4899"/>
    <stop offset="50%" stop-color="#8b5cf6"/>
    <stop offset="100%" stop-color="#06b6d4"/>
  </linearGradient>
  <linearGradient id="pinkcyan" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#ec4899"/>
    <stop offset="100%" stop-color="#06b6d4"/>
  </linearGradient>
  <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fde047"/>
    <stop offset="45%" stop-color="#f97316"/>
    <stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
  <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%" stop-color="#ec4899"/>
    <stop offset="55%" stop-color="#f97316"/>
    <stop offset="100%" stop-color="#fde047"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#fbbf24"/>
    <stop offset="50%" stop-color="#fde68a"/>
    <stop offset="100%" stop-color="#f59e0b"/>
  </linearGradient>
  <linearGradient id="lovegrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f472b6"/>
    <stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
  <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#e0f2fe"/>
    <stop offset="50%" stop-color="#67e8f9"/>
    <stop offset="100%" stop-color="#06b6d4"/>
  </linearGradient>
  <linearGradient id="violet" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#a78bfa"/>
    <stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="10" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
`;

const FONT = `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"`;

function svg(inner) {
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg"><defs>${DEFS}</defs>${inner}</svg>`;
}

function wordSticker(word, { grad = "exa", size = 150 } = {}) {
  const cx = S / 2;
  const lines = Array.isArray(word) ? word : [word];
  // Clamp font size so the widest line fits (Helvetica black italic ≈ 0.68em/char)
  const maxLen = Math.max(...lines.map((l) => l.length));
  const fitted = Math.min(size, Math.floor((S - 56) / (0.68 * maxLen)));
  const lineH = fitted * 0.98;
  const totalH = lineH * lines.length;
  const startY = (S - totalH) / 2 + fitted * 0.82;
  const text = lines
    .map(
      (w, i) => `
    <text x="${cx}" y="${startY + i * lineH}" text-anchor="middle" ${FONT}
      font-size="${fitted}" font-weight="900" font-style="italic" letter-spacing="2"
      fill="url(#${grad})" stroke="#ffffff" stroke-width="3" paint-order="stroke"
      filter="url(#glow)">${w}</text>`
    )
    .join("");
  return svg(text);
}

/* Rubber-stamp style: rotated double border + bold caps */
function stampSticker(word, grad = "exa", rot = -12) {
  return svg(`
    <g transform="rotate(${rot} 256 256)">
      <rect x="56" y="166" width="400" height="180" rx="18" fill="none"
        stroke="url(#${grad})" stroke-width="10" filter="url(#glow)"/>
      <rect x="74" y="184" width="364" height="144" rx="10" fill="none"
        stroke="url(#${grad})" stroke-width="3" opacity="0.7"/>
      <text x="256" y="286" text-anchor="middle" ${FONT} font-size="82" font-weight="900"
        letter-spacing="6" fill="url(#${grad})" stroke="#ffffff" stroke-width="2"
        paint-order="stroke" filter="url(#softglow)">${word}</text>
    </g>
  `);
}

const crownPath =
  "M76 356 L44 156 L156 240 L256 96 L356 240 L468 156 L436 356 Z";

const gemTop = "M136 120 L376 120 L456 220 L256 440 L56 220 Z";
const gemFacets = `
  <path d="M136 120 L196 220 L56 220 Z" fill="#ffffff" opacity="0.25"/>
  <path d="M376 120 L456 220 L316 220 Z" fill="#ffffff" opacity="0.25"/>
  <path d="M196 220 L256 120 L316 220 L256 440 Z" fill="#ffffff" opacity="0.18"/>
`;

const lipsPath =
  "M256 216 C 216 168 152 160 108 196 C 76 222 64 252 68 268 C 120 344 188 372 256 372 C 324 372 392 344 444 268 C 448 252 436 222 404 196 C 360 160 296 168 256 216 Z";
const lipsLine = "M76 262 C 150 250 210 246 256 246 C 302 246 362 250 436 262";

function sparkle(cx, cy, r, fill, opacity = 1) {
  return `<path d="M${cx} ${cy - r} C ${cx + r * 0.12} ${cy - r * 0.3} ${cx + r * 0.3} ${cy - r * 0.12} ${cx + r} ${cy}
    C ${cx + r * 0.3} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.3} ${cx} ${cy + r}
    C ${cx - r * 0.12} ${cy + r * 0.3} ${cx - r * 0.3} ${cy + r * 0.12} ${cx - r} ${cy}
    C ${cx - r * 0.3} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.3} ${cx} ${cy - r} Z"
    fill="${fill}" opacity="${opacity}" filter="url(#glow)"/>`;
}

const STICKERS = [
  // ── reactions: fan hype vocabulary
  { file: "ate", cat: "reactions", body: wordSticker("ATE", { grad: "pinkcyan", size: 180 }) },
  { file: "period", cat: "reactions", body: wordSticker("PERIOD.", { grad: "exa", size: 120 }) },
  { file: "iconic", cat: "reactions", body: wordSticker("ICONIC", { grad: "gold", size: 124 }) },
  { file: "obsessed", cat: "love", body: wordSticker("OBSESSED", { grad: "lovegrad", size: 98 }) },

  // ── platform moments
  { file: "booked", cat: "celebrations", body: stampSticker("BOOKED", "exa") },
  { file: "new-drop", cat: "effects", body: stampSticker("NEW DROP", "sunset", 10) },
  {
    file: "go-live",
    cat: "effects",
    body: svg(`
      <rect x="76" y="186" width="360" height="140" rx="70" fill="none"
        stroke="url(#pinkcyan)" stroke-width="8" filter="url(#glow)"/>
      <circle cx="156" cy="256" r="26" fill="#ef4444" filter="url(#glow)"/>
      <circle cx="156" cy="256" r="44" fill="none" stroke="#ef4444" stroke-width="4" opacity="0.5"/>
      <text x="290" y="284" text-anchor="middle" ${FONT} font-size="72" font-weight="900"
        letter-spacing="4" fill="#ffffff" filter="url(#softglow)">LIVE</text>
    `),
  },

  // ── royalty / hype
  {
    file: "queen",
    cat: "celebrations",
    body: svg(`
      <g transform="translate(96 40) scale(0.625)">
        <path d="${crownPath}" fill="url(#gold)" stroke="#ffffff" stroke-width="10"
          stroke-linejoin="round" filter="url(#glow)"/>
        <circle cx="44" cy="150" r="22" fill="#fde68a" filter="url(#softglow)"/>
        <circle cx="256" cy="88" r="24" fill="#fde68a" filter="url(#softglow)"/>
        <circle cx="468" cy="150" r="22" fill="#fde68a" filter="url(#softglow)"/>
      </g>
      <text x="256" y="420" text-anchor="middle" ${FONT} font-size="110" font-weight="900"
        font-style="italic" fill="url(#gold)" stroke="#ffffff" stroke-width="3"
        paint-order="stroke" filter="url(#glow)">QUEEN</text>
    `),
  },
  {
    file: "superstar",
    cat: "celebrations",
    body: svg(`
      <path d="M256 40 L308 180 L456 184 L338 272 L382 416 L256 330 L130 416 L174 272 L56 184 L204 180 Z"
        fill="url(#sunset)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>
      ${sparkle(420, 96, 34, "#ffffff", 0.95)}
      ${sparkle(92, 120, 24, "#ffffff", 0.8)}
    `),
  },

  // ── love
  {
    file: "mwah",
    cat: "love",
    body: svg(`
      <path d="${lipsPath}" fill="url(#lovegrad)" stroke="#ffffff" stroke-width="8"
        stroke-linejoin="round" filter="url(#glow)"/>
      <path d="${lipsLine}" fill="none" stroke="#831843" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
      <text x="256" y="470" text-anchor="middle" ${FONT} font-size="64" font-weight="900"
        font-style="italic" letter-spacing="6" fill="#ffffff" filter="url(#softglow)">MWAH</text>
    `),
  },

  // ── fire
  { file: "hot", cat: "fire", body: wordSticker("HOT!", { grad: "fire", size: 180 }) },

  // ── brand objects
  {
    file: "exa-coin",
    cat: "effects",
    body: svg(`
      <circle cx="256" cy="256" r="196" fill="url(#gold)" stroke="#ffffff" stroke-width="8" filter="url(#glow)"/>
      <circle cx="256" cy="256" r="152" fill="none" stroke="#92400e" stroke-width="6" opacity="0.55"/>
      <text x="256" y="296" text-anchor="middle" ${FONT} font-size="110" font-weight="900"
        letter-spacing="8" fill="#78350f" opacity="0.9">EXA</text>
      ${sparkle(140, 130, 28, "#ffffff", 0.9)}
      ${sparkle(392, 350, 22, "#ffffff", 0.75)}
    `),
  },
  {
    file: "gem",
    cat: "effects",
    body: svg(`
      <g filter="url(#glow)">
        <path d="${gemTop}" fill="url(#ice)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"/>
        ${gemFacets}
      </g>
      ${sparkle(400, 120, 30, "#ffffff", 0.95)}
    `),
  },
  {
    file: "sparkles",
    cat: "effects",
    body: svg(`
      ${sparkle(230, 230, 150, "url(#violet)")}
      ${sparkle(390, 120, 60, "url(#pinkcyan)", 0.95)}
      ${sparkle(130, 400, 46, "url(#pinkcyan)", 0.9)}
      ${sparkle(400, 390, 30, "#ffffff", 0.85)}
    `),
  },

  // ── miami
  {
    file: "paradise",
    cat: "miami",
    body: svg(`
      <circle cx="360" cy="160" r="96" fill="url(#sunset)" opacity="0.95" filter="url(#softglow)"/>
      <g stroke="url(#exa)" stroke-width="18" stroke-linecap="round" fill="none" filter="url(#softglow)">
        <path d="M180 430 C 168 340 172 260 196 196"/>
      </g>
      <g fill="none" stroke="#22d3ee" stroke-width="13" stroke-linecap="round" filter="url(#softglow)">
        <path d="M196 196 C 136 160 84 164 46 198"/>
        <path d="M196 196 C 150 130 100 114 48 122"/>
        <path d="M196 196 C 186 116 154 72 110 50"/>
        <path d="M196 196 C 222 116 262 78 316 64"/>
        <path d="M196 196 C 252 148 306 148 348 178"/>
        <path d="M196 196 C 250 190 296 210 324 246"/>
      </g>
      <text x="256" y="480" text-anchor="middle" ${FONT} font-size="58" font-weight="900"
        font-style="italic" letter-spacing="10" fill="url(#pinkcyan)" stroke="#ffffff"
        stroke-width="2" paint-order="stroke" filter="url(#softglow)">PARADISE</text>
    `),
  },

  // ── brand
  {
    file: "exa-logo",
    cat: "effects",
    body: svg(`
      <text x="256" y="310" text-anchor="middle" ${FONT} font-size="190" font-weight="900"
        font-style="italic" letter-spacing="10" fill="url(#exa)" stroke="#ffffff" stroke-width="4"
        paint-order="stroke" filter="url(#glow)">EXA</text>
      <text x="256" y="376" text-anchor="middle" ${FONT} font-size="34" font-weight="700"
        letter-spacing="16" fill="#ffffff" fill-opacity="0.9" filter="url(#softglow)">MODELS</text>
    `),
  },
];

(async () => {
  for (const st of STICKERS) {
    const out = path.join(OUT, `${st.file}.png`);
    await sharp(Buffer.from(st.body)).resize(S, S).png().toFile(out);
    console.log("wrote", st.cat.padEnd(14), st.file);
  }
  const files = STICKERS.map((s) => path.join(OUT, `${s.file}.png`));
  const cols = 4, cell = 260, pad = 10;
  const rows = Math.ceil(files.length / cols);
  const composites = await Promise.all(
    files.map(async (f, i) => ({
      input: await sharp(f).resize(cell - pad * 2, cell - pad * 2).png().toBuffer(),
      left: (i % cols) * cell + pad,
      top: Math.floor(i / cols) * cell + pad,
    }))
  );
  await sharp({
    create: { width: cols * cell, height: rows * cell, channels: 4, background: "#0a0a14" },
  })
    .composite(composites)
    .png()
    .toFile(path.join(OUT, "_contact-sheet-2.png"));
  console.log("contact sheet done");
})();
