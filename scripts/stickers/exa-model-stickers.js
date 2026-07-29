/* Generate per-model EXA stickers for the top faces.
   Mirrors /api/admin/stickers/from-asset: neon/gold frame via sharp,
   storage path models/{modelId}/..., category "models", model_id linkage. */
const fs = require("fs");
const path = require("path");
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const dotenv = fs.readFileSync("/Users/examodels/Desktop/exa-platform/.env.local", "utf8");
const env = Object.fromEntries(
  dotenv.split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const { createClient } = require("/Users/examodels/Desktop/exa-platform/node_modules/@supabase/supabase-js");
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OUT = path.join(__dirname, "model-stickers");
fs.mkdirSync(OUT, { recursive: true });

const TOP_N = 200; // cover every eligible tier-1/2 model
const SIZE = 512;

// ── frame logic ported from src/lib/sticker-frames.ts ──────────────────────
const NEON_FRAME_SVG = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ec4899"/><stop offset="50%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="6" y="6" width="${SIZE - 12}" height="${SIZE - 12}" rx="32" ry="32" fill="none" stroke="url(#neon)" stroke-width="6" filter="url(#glow)"/>
  <text x="${SIZE - 18}" y="${SIZE - 18}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="white" fill-opacity="0.85" letter-spacing="3">EXA</text>
</svg>`;

const GOLD_FRAME_SVG = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#fde68a"/><stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="goldglow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="6" y="6" width="${SIZE - 12}" height="${SIZE - 12}" rx="32" ry="32" fill="none" stroke="url(#gold)" stroke-width="8" filter="url(#goldglow)"/>
  <text x="${SIZE - 18}" y="${SIZE - 18}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="#fde68a" letter-spacing="3">EXA</text>
</svg>`;

async function roundedCorners(img, radius) {
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  return sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function generateSticker(sourceUrl, frame) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const baseSquare = await sharp(input)
    .rotate()
    .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();
  const rounded = await roundedCorners(baseSquare, 32);
  return sharp(rounded)
    .composite([{ input: Buffer.from(frame === "gold" ? GOLD_FRAME_SVG : NEON_FRAME_SVG), blend: "over" }])
    .png()
    .toBuffer();
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sticker";

(async () => {
  // Admin actor for created_by
  const { data: admins } = await db.from("actors").select("id").eq("type", "admin")
    .order("created_at", { ascending: true }).limit(1);
  const createdBy = admins?.[0]?.id || null;

  // Policy: every 4-5 STAR model gets an official sticker. rating_tier is
  // COALESCE(admin_rating, 3) — HIGHER IS BETTER (5 = superstar).
  const { data: models, error: mErr } = await db
    .from("models")
    .select("id, user_id, username, profile_photo_url, rating_tier")
    .not("user_id", "is", null)
    .gte("rating_tier", 4)
    .not("username", "is", null);
  if (mErr) throw mErr;

  // follows.following_id → actor id; map models to their actor ids
  const userIds = models.map((m) => m.user_id);
  const actorsByUser = {};
  for (let i = 0; i < userIds.length; i += 200) {
    const { data: actors, error } = await db.from("actors").select("id, user_id")
      .in("user_id", userIds.slice(i, i + 200));
    if (error) throw error;
    (actors || []).forEach((a) => { actorsByUser[a.user_id] = a.id; });
  }
  const { data: allFollows, error: fErr } = await db.from("follows").select("following_id");
  if (fErr) throw fErr;
  const followCounts = {};
  (allFollows || []).forEach((f) => { followCounts[f.following_id] = (followCounts[f.following_id] || 0) + 1; });

  const ranked = models
    .map((m) => ({ ...m, followers: followCounts[actorsByUser[m.user_id]] || 0 }))
    .sort((a, b) => (b.rating_tier - a.rating_tier) || (b.followers - a.followers));

  // Existing model stickers → skip models that already have one
  const { data: existing } = await db.from("exa_stickers").select("model_id").not("model_id", "is", null);
  const alreadyDone = new Set((existing || []).map((s) => s.model_id));

  let made = 0;
  const results = [];
  for (const m of ranked) {
    if (made >= TOP_N) break;
    if (alreadyDone.has(m.id)) { console.log("skip (has sticker):", m.username); continue; }

    // Primary portfolio image, fallback to profile photo
    const { data: assets } = await db.from("media_assets")
      .select("id, url, photo_url, mime_type, type, is_primary, display_order")
      .eq("model_id", m.id)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(10);
    const img = (assets || []).find((a) => {
      const mime = (a.mime_type || "").toLowerCase();
      return !mime.startsWith("video/") && a.type !== "video" && (a.url || a.photo_url);
    });
    const sourceUrl = img?.url || img?.photo_url || m.profile_photo_url;
    if (!sourceUrl) { console.log("skip (no image):", m.username); continue; }

    const frame = made < 3 ? "gold" : "neon";
    let buf;
    try {
      buf = await generateSticker(sourceUrl, frame);
    } catch (e) {
      console.log("skip (gen failed):", m.username, e.message);
      continue;
    }

    fs.writeFileSync(path.join(OUT, `${slugify(m.username)}.png`), buf);

    const storagePath = `models/${m.id}/${slugify(m.username)}-${frame}-${Date.now()}.png`;
    const { error: upErr } = await db.storage.from("stickers").upload(storagePath, buf, {
      contentType: "image/png", upsert: false, cacheControl: "31536000",
    });
    if (upErr) { console.log("UPLOAD FAIL:", m.username, upErr.message); continue; }
    const { data: { publicUrl } } = db.storage.from("stickers").getPublicUrl(storagePath);

    const { error: insErr } = await db.from("exa_stickers").insert({
      name: m.username,
      storage_path: storagePath,
      url: publicUrl,
      mime_type: "image/png",
      width: SIZE, height: SIZE, size_bytes: buf.length,
      tags: [m.username.toLowerCase().replace(/^@/, ""), frame, "model"],
      category: "models",
      model_id: m.id,
      is_featured: false,
      is_active: true,
      sort_order: 20,
      created_by: createdBy,
    });
    if (insErr) {
      await db.storage.from("stickers").remove([storagePath]);
      console.log("INSERT FAIL:", m.username, insErr.message);
      continue;
    }
    made++;
    results.push({ username: m.username, tier: m.rating_tier, followers: m.followers, frame });
    console.log(`OK ${made}/${TOP_N}:`, m.username, `(tier ${m.rating_tier}, ${m.followers} followers, ${frame})`);
  }

  console.log("\nDone. Created:", JSON.stringify(results, null, 1));
})().catch((e) => { console.error("FATAL:", e.message || e); process.exit(1); });
