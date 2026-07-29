/* EXA sticker pack #3 — model-culture phrases, flash, cheers + animated bestsellers.
   Animated output = animated WebP (upload route accepts image/webp and keeps animation). */
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "stickers3");
fs.mkdirSync(OUT, { recursive: true });

const S = 512;

function defs(glowStd = 10, softStd = 6) {
  return `
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
  <linearGradient id="violet" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#a78bfa"/>
    <stop offset="100%" stop-color="#ec4899"/>
  </linearGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="${glowStd}" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="${softStd}" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;
}

const FONT = `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"`;

function svg(inner, glowStd = 10, softStd = 6) {
  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg"><defs>${defs(glowStd, softStd)}</defs>${inner}</svg>`;
}

function wordSticker(word, { grad = "exa", size = 150 } = {}) {
  const cx = S / 2;
  const lines = Array.isArray(word) ? word : [word];
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

function sparkle(cx, cy, r, fill, opacity = 1) {
  return `<path d="M${cx} ${cy - r} C ${cx + r * 0.12} ${cy - r * 0.3} ${cx + r * 0.3} ${cy - r * 0.12} ${cx + r} ${cy}
    C ${cx + r * 0.3} ${cy + r * 0.12} ${cx + r * 0.12} ${cy + r * 0.3} ${cx} ${cy + r}
    C ${cx - r * 0.12} ${cy + r * 0.3} ${cx - r * 0.3} ${cy + r * 0.12} ${cx - r} ${cy}
    C ${cx - r * 0.3} ${cy - r * 0.12} ${cx - r * 0.12} ${cy - r * 0.3} ${cx} ${cy - r} Z"
    fill="${fill}" opacity="${opacity}" filter="url(#glow)"/>`;
}

// One champagne flute drawn upright around (0,0)=top of bowl center; ~230 tall
function flute(liquid = "url(#gold)") {
  return `
    <path d="M-30 0 C -30 78 -12 104 0 110 C 12 104 30 78 30 0 Z"
      fill="rgba(255,255,255,0.14)" stroke="#e0f2fe" stroke-width="6"/>
    <path d="M-27 26 C -26 76 -11 100 0 106 C 11 100 26 76 27 26 Z" fill="${liquid}" opacity="0.95"/>
    <line x1="0" y1="110" x2="0" y2="196" stroke="#e0f2fe" stroke-width="7" stroke-linecap="round"/>
    <path d="M-34 204 L34 204" stroke="#e0f2fe" stroke-width="9" stroke-linecap="round"/>
  `;
}

const STATIC = [
  { file: "runway-ready", cat: "models", body: wordSticker(["RUNWAY", "READY"], { grad: "exa", size: 118 }) },
  {
    file: "main-character",
    cat: "reactions",
    body: svg(`
      ${wordLines(["MAIN", "CHARACTER"], "violet", 112)}
      ${sparkle(430, 92, 34, "#ffffff", 0.95)}
      ${sparkle(84, 420, 24, "#ffffff", 0.8)}
    `),
  },
  { file: "serving", cat: "reactions", body: wordSticker("SERVING", { grad: "pinkcyan", size: 110 }) },
  {
    file: "on-set",
    cat: "models",
    body: svg(`
      <g transform="rotate(-6 256 276)">
        <!-- clapper top bar, opened -->
        <g transform="rotate(-18 96 178)">
          <rect x="88" y="138" width="340" height="52" rx="10" fill="#0f0f1a" stroke="url(#pinkcyan)" stroke-width="5" filter="url(#softglow)"/>
          <g fill="#ffffff" opacity="0.9">
            <polygon points="108,138 156,138 128,190 80,190" transform="translate(20 0)"/>
            <polygon points="188,138 236,138 208,190 160,190" transform="translate(20 0)"/>
            <polygon points="268,138 316,138 288,190 240,190" transform="translate(20 0)"/>
            <polygon points="348,138 396,138 368,190 320,190" transform="translate(20 0)"/>
          </g>
        </g>
        <!-- board -->
        <rect x="76" y="196" width="360" height="188" rx="14" fill="#0f0f1a" stroke="url(#exa)" stroke-width="7" filter="url(#glow)"/>
        <text x="256" y="308" text-anchor="middle" ${FONT} font-size="74" font-weight="900"
          letter-spacing="4" fill="#ffffff" filter="url(#softglow)">ON SET</text>
        <line x1="96" y1="342" x2="416" y2="342" stroke="#ffffff" stroke-width="3" opacity="0.35"/>
      </g>
    `),
  },
  {
    file: "flash",
    cat: "effects",
    body: svg(`
      <!-- burst rays -->
      <g stroke="url(#gold)" stroke-width="10" stroke-linecap="round" filter="url(#glow)">
        <line x1="256" y1="60" x2="256" y2="118"/>
        <line x1="256" y1="394" x2="256" y2="452"/>
        <line x1="60" y1="256" x2="118" y2="256"/>
        <line x1="394" y1="256" x2="452" y2="256"/>
        <line x1="118" y1="118" x2="158" y2="158"/>
        <line x1="354" y1="354" x2="394" y2="394"/>
        <line x1="118" y1="394" x2="158" y2="354"/>
        <line x1="354" y1="158" x2="394" y2="118"/>
      </g>
      <!-- camera body -->
      <rect x="146" y="186" width="220" height="150" rx="24" fill="#0f0f1a" stroke="url(#pinkcyan)" stroke-width="7" filter="url(#glow)"/>
      <rect x="216" y="160" width="80" height="34" rx="8" fill="#0f0f1a" stroke="url(#pinkcyan)" stroke-width="6"/>
      <circle cx="256" cy="260" r="46" fill="none" stroke="#ffffff" stroke-width="7" filter="url(#softglow)"/>
      <circle cx="256" cy="260" r="22" fill="url(#exa)" filter="url(#softglow)"/>
      <circle cx="330" cy="216" r="9" fill="#fde047" filter="url(#softglow)"/>
    `),
  },
  {
    file: "cheers",
    cat: "celebrations",
    body: svg(`
      <g transform="translate(196 150) rotate(22)">${flute()}</g>
      <g transform="translate(316 150) rotate(-22)">${flute()}</g>
      <!-- clink spark -->
      ${sparkle(256, 120, 34, "#ffffff", 0.95)}
      <!-- bubbles -->
      <g fill="#fde68a" filter="url(#softglow)">
        <circle cx="170" cy="86" r="8"/>
        <circle cx="216" cy="56" r="6"/>
        <circle cx="342" cy="82" r="8"/>
        <circle cx="300" cy="50" r="5"/>
      </g>
      <text x="256" y="472" text-anchor="middle" ${FONT} font-size="76" font-weight="900"
        font-style="italic" letter-spacing="6" fill="url(#gold)" stroke="#ffffff" stroke-width="3"
        paint-order="stroke" filter="url(#glow)">CHEERS</text>
    `),
  },
];

// helper for composed svgs that need word lines inline (no own <svg> wrapper)
function wordLines(lines, grad, size) {
  const cx = S / 2;
  const maxLen = Math.max(...lines.map((l) => l.length));
  const fitted = Math.min(size, Math.floor((S - 56) / (0.68 * maxLen)));
  const lineH = fitted * 0.98;
  const totalH = lineH * lines.length;
  const startY = (S - totalH) / 2 + fitted * 0.82;
  return lines
    .map(
      (w, i) => `
    <text x="${cx}" y="${startY + i * lineH}" text-anchor="middle" ${FONT}
      font-size="${fitted}" font-weight="900" font-style="italic" letter-spacing="2"
      fill="url(#${grad})" stroke="#ffffff" stroke-width="3" paint-order="stroke"
      filter="url(#glow)">${w}</text>`
    )
    .join("");
}

// ── Animated bestsellers ────────────────────────────────────────────────────

const heartPath =
  "M256 448 C 128 352 48 272 48 176 C 48 104 104 56 168 56 C 212 56 244 80 256 108 C 268 80 300 56 344 56 C 408 56 464 104 464 176 C 464 272 384 352 256 448 Z";
const flamePath =
  "M256 32 C 288 128 384 160 384 288 C 384 384 328 464 256 464 C 184 464 128 384 128 288 C 128 232 152 192 176 160 C 176 224 208 248 224 248 C 208 176 224 96 256 32 Z";

function scaled(inner, s, cx = 256, cy = 256) {
  return `<g transform="translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})">${inner}</g>`;
}

const FRAMES = 12;
const DELAY = 80; // ms per frame

const ANIMATED = [
  {
    file: "heart-pulse",
    cat: "love",
    frame: (t) => {
      const s = 1 + 0.055 * Math.sin(2 * Math.PI * t);
      const glow = 8 + 6 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t));
      return svg(
        scaled(
          `<path d="${heartPath}" fill="url(#lovegrad)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>`,
          s
        ),
        glow
      );
    },
  },
  {
    file: "flame-flicker",
    cat: "fire",
    frame: (t) => {
      const sy = 1 + 0.05 * Math.sin(2 * Math.PI * t);
      const sx = 1 - 0.03 * Math.sin(2 * Math.PI * t);
      const rot = 2.2 * Math.sin(2 * Math.PI * (t + 0.25));
      const glow = 9 + 5 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t + 0.5)));
      return svg(
        `<g transform="translate(256 464) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) rotate(${rot.toFixed(2)}) translate(-256 -464)">
          <path d="${flamePath}" fill="url(#fire)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" filter="url(#glow)"/>
        </g>`,
        glow
      );
    },
  },
  {
    file: "sparkles-twinkle",
    cat: "effects",
    frame: (t) => {
      const tw = (ph) => 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t + ph)));
      const sc = (ph) => 0.92 + 0.1 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (t + ph)));
      return svg(`
        ${scaled(sparkle(230, 230, 150, "url(#violet)", tw(0)), sc(0), 230, 230)}
        ${scaled(sparkle(390, 120, 60, "url(#pinkcyan)", tw(0.33)), sc(0.33), 390, 120)}
        ${scaled(sparkle(130, 400, 46, "url(#pinkcyan)", tw(0.61)), sc(0.61), 130, 400)}
        ${scaled(sparkle(400, 390, 30, "#ffffff", tw(0.8)), sc(0.8), 400, 390)}
      `);
    },
  },
  {
    file: "hundred-pulse",
    cat: "celebrations",
    frame: (t) => {
      const glow = 8 + 7 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t));
      const s = 1 + 0.03 * Math.sin(2 * Math.PI * t);
      return svg(
        `
        <circle cx="256" cy="256" r="200" fill="none" stroke="url(#exa)" stroke-width="10" filter="url(#glow)"/>
        ${scaled(
          `<text x="256" y="308" text-anchor="middle" ${FONT} font-size="170" font-weight="900" font-style="italic"
            fill="url(#gold)" stroke="#ffffff" stroke-width="3" paint-order="stroke" filter="url(#glow)">100</text>`,
          s
        )}`,
        glow
      );
    },
  },
  {
    file: "exa-logo-pulse",
    cat: "effects",
    frame: (t) => {
      const glow = 7 + 8 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t));
      return svg(
        `
        <text x="256" y="310" text-anchor="middle" ${FONT} font-size="190" font-weight="900"
          font-style="italic" letter-spacing="10" fill="url(#exa)" stroke="#ffffff" stroke-width="4"
          paint-order="stroke" filter="url(#glow)">EXA</text>
        <text x="256" y="376" text-anchor="middle" ${FONT} font-size="34" font-weight="700"
          letter-spacing="16" fill="#ffffff" fill-opacity="0.9" filter="url(#softglow)">MODELS</text>`,
        glow
      );
    },
  },
];

(async () => {
  for (const st of STATIC) {
    await sharp(Buffer.from(st.body)).resize(S, S).png().toFile(path.join(OUT, `${st.file}.png`));
    console.log("static  ", st.cat.padEnd(14), st.file);
  }

  for (const an of ANIMATED) {
    const frames = [];
    for (let i = 0; i < FRAMES; i++) {
      const t = i / FRAMES;
      frames.push(await sharp(Buffer.from(an.frame(t))).resize(S, S).png().toBuffer());
    }
    const out = path.join(OUT, `${an.file}.webp`);
    await sharp(frames, { join: { animated: true } })
      .webp({ loop: 0, delay: DELAY, quality: 90, effort: 4 })
      .toFile(out);
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.log("animated", an.cat.padEnd(14), an.file, `${kb}KB`);
  }

  // contact sheet: statics + first frame of each animation
  const cells = [
    ...STATIC.map((s) => path.join(OUT, `${s.file}.png`)),
    ...ANIMATED.map((a) => path.join(OUT, `${a.file}.webp`)),
  ];
  const cols = 4, cell = 260, pad = 10;
  const rows = Math.ceil(cells.length / cols);
  const composites = await Promise.all(
    cells.map(async (f, i) => ({
      input: await sharp(f, { pages: 1 }).resize(cell - pad * 2, cell - pad * 2).png().toBuffer(),
      left: (i % cols) * cell + pad,
      top: Math.floor(i / cols) * cell + pad,
    }))
  );
  await sharp({
    create: { width: cols * cell, height: rows * cell, channels: 4, background: "#0a0a14" },
  })
    .composite(composites)
    .png()
    .toFile(path.join(OUT, "_contact-sheet-3.png"));
  console.log("contact sheet done");
})();
