/* Apply the v2 juice pass:
   1. Swap word-sticker rows to the new chrome/bubble renders (both platforms).
   2. Regenerate every face sticker as a Vision die-cut (EXA models from
      portfolio photos, Digis creators from avatars).
   Old storage objects are kept — already-sent messages reference them. */
const sharp = require("/Users/examodels/Desktop/exa-platform/node_modules/sharp");
const fs = require("fs");
const path = require("path");
const { cutoutFromBuffer, composeDieCut, exaOverlay, digisOverlay } = require("./diecut-lib.js");

const ONLY = process.argv[2] || "all"; // words | faces | all

// ── clients ─────────────────────────────────────────────────────────────
function parseEnv(file) {
  const env = {};
  fs.readFileSync(file, "utf8").split("\n").forEach((l) => {
    const m = l.match(/^([^=#]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
  return env;
}
const exaEnv = parseEnv("/Users/examodels/Desktop/exa-platform/.env.local");
const digisEnv = parseEnv("/Users/examodels/Desktop/digis-app/.env.local");
const { createClient } = require("/Users/examodels/Desktop/exa-platform/node_modules/@supabase/supabase-js");
const exaDb = createClient(exaEnv.NEXT_PUBLIC_SUPABASE_URL, exaEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const digisStorage = createClient(digisEnv.NEXT_PUBLIC_SUPABASE_URL, digisEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }).storage;

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "sticker";

async function digisSql() {
  const postgres = (await import("/Users/examodels/Desktop/digis-app/node_modules/postgres/src/index.js")).default;
  return postgres(digisEnv.DIRECT_DATABASE_URL || digisEnv.DATABASE_URL, { prepare: false });
}

// ── upload + row swap helpers ───────────────────────────────────────────
async function exaSwap(name, buf, storagePrefix) {
  const storagePath = `${storagePrefix}/${slugify(name)}-v2-${Date.now()}.png`;
  const { error: upErr } = await exaDb.storage.from("stickers").upload(storagePath, buf, {
    contentType: "image/png", upsert: false, cacheControl: "31536000",
  });
  if (upErr) return console.log("EXA upload fail:", name, upErr.message);
  const { data: { publicUrl } } = exaDb.storage.from("stickers").getPublicUrl(storagePath);
  const { data, error } = await exaDb.from("exa_stickers")
    .update({ url: publicUrl, storage_path: storagePath, mime_type: "image/png", size_bytes: buf.length, updated_at: new Date().toISOString() })
    .eq("name", name).select("id");
  if (error || !data?.length) console.log("EXA row swap fail:", name, error?.message || "no row");
  else console.log("EXA v2:", name);
}

async function digisSwap(sql, name, buf, storagePrefix) {
  const storagePath = `${storagePrefix}/${slugify(name)}-v2-${Date.now()}.png`;
  const { error: upErr } = await digisStorage.from("stickers").upload(storagePath, buf, {
    contentType: "image/png", upsert: false, cacheControl: "31536000",
  });
  if (upErr) return console.log("DIGIS upload fail:", name, upErr.message);
  const { data: { publicUrl } } = digisStorage.from("stickers").getPublicUrl(storagePath);
  const rows = await sql`UPDATE stickers SET url=${publicUrl}, storage_path=${storagePath}, mime_type='image/png', size_bytes=${buf.length}, updated_at=now() WHERE name=${name} RETURNING id`;
  if (!rows.length) console.log("DIGIS row swap fail (no row):", name);
  else console.log("DIGIS v2:", name);
}

(async () => {
  const sql = await digisSql();
  try {
    // ── 1. word stickers ──────────────────────────────────────────────
    if (ONLY === "all" || ONLY === "words") {
      const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "v2", "manifest.json"), "utf8"));
      for (const m of manifest) {
        const buf = fs.readFileSync(m.file);
        if (m.platform === "exa") await exaSwap(m.name, buf, "library");
        else await digisSwap(sql, m.name, buf, "library");
      }
    }

    // ── 2. EXA model die-cuts ─────────────────────────────────────────
    if (ONLY === "all" || ONLY === "faces") {
      const { data: exaFaces } = await exaDb.from("exa_stickers").select("id, name, model_id").not("model_id", "is", null).eq("is_active", true);
      let done = 0, failed = 0;
      for (const f of exaFaces) {
        try {
          const { data: assets } = await exaDb.from("media_assets")
            .select("url, photo_url, mime_type, type")
            .eq("model_id", f.model_id)
            .order("is_primary", { ascending: false }).order("display_order", { ascending: true }).limit(8);
          const img = (assets || []).find((a) => !(a.mime_type || "").startsWith("video/") && a.type !== "video" && (a.url || a.photo_url));
          let src = img?.url || img?.photo_url;
          if (!src) {
            const { data: mo } = await exaDb.from("models").select("profile_photo_url").eq("id", f.model_id).single();
            src = mo?.profile_photo_url;
          }
          if (!src) { failed++; continue; }
          const res = await fetch(src);
          if (!res.ok) { failed++; continue; }
          const cut = await cutoutFromBuffer(Buffer.from(await res.arrayBuffer()), "exa");
          const sticker = await composeDieCut(cut, {
            glowColor: { r: 236, g: 72, b: 153 }, glowOpacity: 0.5, overlaySvg: exaOverlay(),
          });
          await exaSwap(f.name, sticker, `models/${f.model_id}`);
          done++;
        } catch (e) {
          console.log("EXA face fail (kept old):", f.name, e.message?.slice(0, 60));
          failed++;
        }
      }
      console.log(`EXA faces: ${done} upgraded, ${failed} kept old`);

      // ── 3. Digis creator die-cuts ───────────────────────────────────
      const creators = await sql`
        SELECT s.id, s.name, s.creator_id, u.username, u.avatar_url
        FROM stickers s JOIN users u ON u.id = s.creator_id
        WHERE s.creator_id IS NOT NULL AND s.is_active = true`;
      let ddone = 0, dfailed = 0;
      for (const c of creators) {
        try {
          if (!c.avatar_url) { dfailed++; continue; }
          const res = await fetch(c.avatar_url);
          if (!res.ok) { dfailed++; continue; }
          const cut = await cutoutFromBuffer(Buffer.from(await res.arrayBuffer()), "digis");
          const sticker = await composeDieCut(cut, {
            glowColor: { r: 168, g: 85, b: 247 }, glowOpacity: 0.45,
            bottomMargin: 54, maxH: 400, overlaySvg: digisOverlay(c.username),
          });
          await digisSwap(sql, c.name, sticker, `creators/${c.creator_id}`);
          ddone++;
        } catch (e) {
          console.log("DIGIS face fail (kept old):", c.name, e.message?.slice(0, 60));
          dfailed++;
        }
      }
      console.log(`DIGIS faces: ${ddone} upgraded, ${dfailed} kept old`);
    }
  } finally {
    await sql.end();
  }
})();
