/* Bulk-upload the 39 EXA stickers to prod (storage + exa_stickers rows).
   Mirrors /api/admin/stickers POST: library/{slug}-{ts}.{ext}, cacheControl 1y. */
const path = require("path");
const fs = require("fs");
const dotenv = require("fs").readFileSync("/Users/examodels/Desktop/exa-platform/.env.local", "utf8");
const env = Object.fromEntries(
  dotenv.split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const { createClient } = require("/Users/examodels/Desktop/exa-platform/node_modules/@supabase/supabase-js");
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DIRS = {
  1: path.join(__dirname, "stickers"),
  2: path.join(__dirname, "stickers2"),
  3: path.join(__dirname, "stickers3"),
};

// pack, file, name, category, tags, featured, sort
const ITEMS = [
  // ── pack 1
  [1, "omg.png", "OMG!", "reactions", ["omg", "wow", "shock", "hype"], false, 30],
  [1, "slay.png", "Slay", "reactions", ["slay", "hype", "queen"], true, 70],
  [1, "yass.png", "Yass", "reactions", ["yass", "yes", "hype"], false, 30],
  [1, "wow.png", "Wow", "reactions", ["wow", "amazed"], false, 30],
  [1, "lets-go.png", "Let's Go!", "celebrations", ["lets go", "hype", "win"], false, 40],
  [1, "hundred.png", "100", "celebrations", ["100", "hundred", "perfect", "score"], false, 40],
  [1, "hype-bolt.png", "Lightning Bolt", "celebrations", ["bolt", "lightning", "energy", "hype"], false, 30],
  [1, "neon-heart.png", "Neon Heart", "love", ["heart", "love", "pink"], true, 70],
  [1, "xoxo.png", "XOXO", "love", ["xoxo", "kiss", "love", "hugs"], false, 30],
  [1, "neon-flame.png", "Neon Flame", "fire", ["fire", "flame", "hot", "lit"], false, 40],
  [1, "on-fire.png", "On Fire", "fire", ["fire", "hot", "streak", "lit"], false, 30],
  [1, "miami-sun.png", "Miami Sunset", "miami", ["miami", "sunset", "synthwave", "beach"], true, 60],
  // ── pack 2
  [2, "ate.png", "Ate", "reactions", ["ate", "slay", "served"], false, 40],
  [2, "period.png", "Period.", "reactions", ["period", "facts", "done"], false, 30],
  [2, "iconic.png", "Iconic", "reactions", ["iconic", "legend", "gold"], false, 40],
  [2, "obsessed.png", "Obsessed", "love", ["obsessed", "love", "fan"], false, 40],
  [2, "booked.png", "Booked", "celebrations", ["booked", "gig", "job", "win", "stamp"], true, 80],
  [2, "new-drop.png", "New Drop", "effects", ["new", "drop", "content", "post"], false, 50],
  [2, "go-live.png", "Live", "effects", ["live", "stream", "on air"], false, 50],
  [2, "queen.png", "Queen", "celebrations", ["queen", "crown", "royalty", "gold"], true, 70],
  [2, "superstar.png", "Superstar", "celebrations", ["star", "superstar", "shine"], false, 30],
  [2, "mwah.png", "Mwah", "love", ["mwah", "kiss", "lips"], true, 60],
  [2, "hot.png", "Hot!", "fire", ["hot", "fire", "heat"], false, 30],
  [2, "exa-coin.png", "EXA Coin", "effects", ["coin", "exa", "gold", "tip"], true, 60],
  [2, "gem.png", "Gem", "effects", ["gem", "diamond", "ice", "shine"], false, 40],
  [2, "sparkles.png", "Sparkles", "effects", ["sparkle", "shine", "magic"], false, 40],
  [2, "paradise.png", "Paradise Palm", "miami", ["palm", "paradise", "beach", "miami"], false, 40],
  [2, "exa-logo.png", "EXA Models", "effects", ["exa", "logo", "brand"], false, 30],
  // ── pack 3
  [3, "runway-ready.png", "Runway Ready", "models", ["runway", "ready", "model", "catwalk"], false, 50],
  [3, "on-set.png", "On Set", "models", ["on set", "shoot", "clapper", "film"], false, 50],
  [3, "main-character.png", "Main Character", "reactions", ["main character", "star", "energy"], false, 40],
  [3, "serving.png", "Serving", "reactions", ["serving", "looks", "slay"], false, 40],
  [3, "flash.png", "Camera Flash", "effects", ["camera", "flash", "photo", "shoot"], false, 40],
  [3, "cheers.png", "Cheers", "celebrations", ["cheers", "champagne", "toast", "celebrate"], false, 50],
  [3, "heart-pulse.webp", "Beating Heart", "love", ["heart", "love", "pulse", "animated"], true, 90],
  [3, "flame-flicker.webp", "Flickering Flame", "fire", ["fire", "flame", "hot", "animated"], true, 90],
  [3, "sparkles-twinkle.webp", "Twinkling Sparkles", "effects", ["sparkle", "shine", "magic", "animated"], true, 90],
  [3, "hundred-pulse.webp", "100 Pulse", "celebrations", ["100", "hundred", "perfect", "animated"], true, 90],
  [3, "exa-logo-pulse.webp", "EXA Glow", "effects", ["exa", "logo", "brand", "animated"], false, 60],
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sticker";

(async () => {
  // Admin actor for created_by (Nathan)
  const { data: admins, error: adminErr } = await db
    .from("actors")
    .select("id, type, created_at")
    .eq("type", "admin")
    .order("created_at", { ascending: true })
    .limit(1);
  if (adminErr) throw adminErr;
  const createdBy = admins?.[0]?.id || null;
  console.log("created_by:", createdBy || "(no admin actor found — will be null)");

  // Existing stickers (idempotency: skip same name)
  const { data: existing, error: exErr } = await db.from("exa_stickers").select("name");
  if (exErr) throw exErr;
  const existingNames = new Set((existing || []).map((s) => s.name));
  console.log("existing stickers in prod:", existingNames.size);

  let ok = 0, skipped = 0, failed = 0;
  for (const [pack, file, name, category, tags, featured, sort] of ITEMS) {
    if (existingNames.has(name)) {
      console.log("SKIP (exists):", name);
      skipped++;
      continue;
    }
    const full = path.join(DIRS[pack], file);
    const buf = fs.readFileSync(full);
    const ext = file.endsWith(".webp") ? "webp" : "png";
    const contentType = ext === "webp" ? "image/webp" : "image/png";
    const storagePath = `library/${slugify(name)}-${Date.now()}.${ext}`;

    const { error: upErr } = await db.storage.from("stickers").upload(storagePath, buf, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (upErr) {
      console.error("UPLOAD FAIL:", name, upErr.message);
      failed++;
      continue;
    }
    const { data: { publicUrl } } = db.storage.from("stickers").getPublicUrl(storagePath);

    const { error: insErr } = await db.from("exa_stickers").insert({
      name,
      description: null,
      storage_path: storagePath,
      url: publicUrl,
      mime_type: contentType,
      width: 512,
      height: 512,
      size_bytes: buf.length,
      tags,
      category,
      model_id: null,
      is_featured: featured,
      is_active: true,
      sort_order: sort,
      created_by: createdBy,
    });
    if (insErr) {
      await db.storage.from("stickers").remove([storagePath]);
      console.error("INSERT FAIL (rolled back):", name, insErr.message);
      failed++;
      continue;
    }
    console.log("OK:", name, `(${category}${featured ? ", featured" : ""})`);
    ok++;
  }
  console.log(`\nDone: ${ok} uploaded, ${skipped} skipped, ${failed} failed`);

  const { count } = await db.from("exa_stickers").select("*", { count: "exact", head: true }).eq("is_active", true);
  console.log("total active stickers in prod:", count);
})().catch((e) => {
  console.error("FATAL:", e.message || e);
  process.exit(1);
});
