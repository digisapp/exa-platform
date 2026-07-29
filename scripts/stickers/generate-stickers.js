/* EXA starter sticker pack — synthwave/neon text + shape stickers.
   Renders SVG -> 512x512 transparent PNG via the project's sharp. */
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "stickers");
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

// Big slanted neon word, optional second line
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

const heartPath =
  "M256 448 C 128 352 48 272 48 176 C 48 104 104 56 168 56 C 212 56 244 80 256 108 C 268 80 300 56 344 56 C 408 56 464 104 464 176 C 464 272 384 352 256 448 Z";

const boltPath = "M296 32 L120 288 L232 288 L184 480 L392 208 L272 208 Z";

const flamePath =
  "M256 32 C 288 128 384 160 384 288 C 384 384 328 464 256 464 C 184 464 128 384 128 288 C 128 232 152 192 176 160 C 176 224 208 248 224 248 C 208 176 224 96 256 32 Z";

const STICKERS = [
  // reactions
  { file: "omg", cat: "reactions", body: wordSticker("OMG!", { grad: "pinkcyan" }) },
  { file: "slay", cat: "reactions", body: wordSticker("SLAY", { grad: "exa" }) },
  { file: "yass", cat: "reactions", body: wordSticker("YASS", { grad: "sunset", size: 140 }) },
  { file: "wow", cat: "reactions", body: wordSticker("WOW", { grad: "pinkcyan", size: 160 }) },
  // hype / celebrations
  { file: "lets-go", cat: "celebrations", body: wordSticker(["LET'S", "GO!"], { grad: "exa", size: 140 }) },
  {
    file: "hundred",
    cat: "celebrations",
    body: svg(`
      <circle cx="256" cy="256" r="200" fill="none" stroke="url(#exa)" stroke-width="10" filter="url(#glow)"/>
      <text x="256" y="308" text-anchor="middle" ${FONT} font-size="170" font-weight="900" font-style="italic"
        fill="url(#gold)" stroke="#ffffff" stroke-width="3" paint-order="stroke" filter="url(#glow)">100</text>
    `),
  },
  {
    file: "hype-bolt",
    cat: "celebrations",
    body: svg(`
      <path d="${boltPath}" fill="url(#sunset)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>
      <text x="256" y="490" text-anchor="middle" ${FONT} font-size="0" fill="none"> </text>
    `),
  },
  // love
  {
    file: "neon-heart",
    cat: "love",
    body: svg(`
      <path d="${heartPath}" fill="url(#lovegrad)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>
    `),
  },
  { file: "xoxo", cat: "love", body: wordSticker("XOXO", { grad: "lovegrad", size: 140 }) },
  // fire
  {
    file: "neon-flame",
    cat: "fire",
    body: svg(`
      <path d="${flamePath}" fill="url(#fire)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>
    `),
  },
  { file: "on-fire", cat: "fire", body: wordSticker(["ON", "FIRE"], { grad: "fire", size: 140 }) },
  // miami — retro synthwave sun over grid
  {
    file: "miami-sun",
    cat: "miami",
    body: svg(`
      <clipPath id="sunclip">
        <path d="M 56 280 L 456 280 L 456 40 L 56 40 Z
                 M 56 296 L 456 296 L 456 306 L 56 306 Z
                 M 56 322 L 456 322 L 456 336 L 56 336 Z
                 M 56 352 L 456 352 L 456 370 L 56 370 Z" clip-rule="evenodd" fill-rule="evenodd"/>
      </clipPath>
      <circle cx="256" cy="230" r="160" fill="url(#sunset)" clip-path="url(#sunclip)" filter="url(#softglow)"/>
      <g stroke="url(#pinkcyan)" stroke-width="3" opacity="0.9" filter="url(#softglow)">
        <line x1="256" y1="392" x2="256" y2="472"/>
        <line x1="256" y1="392" x2="120" y2="472"/>
        <line x1="256" y1="392" x2="392" y2="472"/>
        <line x1="256" y1="392" x2="16" y2="448"/>
        <line x1="256" y1="392" x2="496" y2="448"/>
        <line x1="80" y1="416" x2="432" y2="416"/>
        <line x1="40" y1="444" x2="472" y2="444"/>
      </g>
      <text x="256" y="422" text-anchor="middle" ${FONT} font-size="52" font-weight="900" font-style="italic"
        letter-spacing="14" fill="#ffffff" stroke="#ec4899" stroke-width="1.5" paint-order="stroke"
        filter="url(#softglow)">MIAMI</text>
    `),
  },
];

(async () => {
  for (const st of STICKERS) {
    const out = path.join(OUT, `${st.file}.png`);
    await sharp(Buffer.from(st.body)).resize(S, S).png().toFile(out);
    console.log("wrote", st.cat.padEnd(14), out);
  }

  // contact sheet for review
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
    .toFile(path.join(OUT, "_contact-sheet.png"));
  console.log("contact sheet done");
})();
