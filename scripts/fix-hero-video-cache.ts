/**
 * Fix the 5 hardcoded hero videos on public pages by replacing them with
 * cacheControl: 31536000 (1 year). These autoplay/loop on /travel and
 * /swimcrown and are the single biggest egress source.
 *
 * Approach: download → delete → upload fresh. We tried upload(upsert:true)
 * first but the cacheControl metadata didn't update for some files; doing
 * a clean delete+upload guarantees the new headers stick.
 *
 * Bytes are not modified — only the storage object's cacheControl metadata.
 *
 * Run: npx tsx scripts/fix-hero-video-cache.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const TARGETS: Array<{ bucket: string; path: string }> = [
  { bucket: "examodels", path: "travel/exa-aqua-newyork.mp4" },
  { bucket: "examodels", path: "travel/exa-hair-spa.mp4" },
  { bucket: "examodels", path: "travel/exa-hutong-miami.mp4" },
  { bucket: "examodels", path: "travel/exa-pilates.mp4" },
  { bucket: "portfolio", path: "swimcrown/jb-paris-crown.mp4" },
];

const fmtBytes = (n: number) => {
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

async function checkHeader(bucket: string, path: string) {
  const publicUrl = `${url}/storage/v1/object/public/${bucket}/${path}?_=${Date.now()}`;
  const res = await fetch(publicUrl, { method: "HEAD" });
  return {
    cacheControl: res.headers.get("cache-control"),
    cfCache: res.headers.get("cf-cache-status"),
    contentLength: Number(res.headers.get("content-length") || 0),
  };
}

async function fixOne(bucket: string, path: string) {
  console.log(`\n── ${bucket}/${path}`);
  const before = await checkHeader(bucket, path);
  console.log(`  before: cache-control="${before.cacheControl}" (${fmtBytes(before.contentLength)})`);

  // Already fixed? skip.
  if ((before.cacheControl ?? "").includes("31536000")) {
    console.log(`  ✓ already cached for 1 year, skipping`);
    return true;
  }

  console.log(`  downloading current bytes…`);
  const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
  if (dlErr || !blob) {
    console.error(`  ✗ download failed: ${dlErr?.message}`);
    return false;
  }
  const buf = new Uint8Array(await blob.arrayBuffer());
  const contentType = blob.type || "video/mp4";
  console.log(`  downloaded: ${fmtBytes(buf.length)} (type ${contentType})`);

  console.log(`  deleting current object…`);
  const { error: rmErr } = await supabase.storage.from(bucket).remove([path]);
  if (rmErr) {
    console.error(`  ✗ delete failed: ${rmErr.message}`);
    return false;
  }

  console.log(`  uploading fresh with cacheControl: 31536000…`);
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, buf, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upErr) {
    console.error(`  ✗ upload failed: ${upErr.message}`);
    // Try to restore by re-uploading without delete; otherwise file is lost
    console.error(`  ATTEMPTING RECOVERY: re-uploading without cacheControl…`);
    await supabase.storage.from(bucket).upload(path, buf, { contentType, upsert: false });
    return false;
  }

  // Allow Cloudflare a moment to revalidate
  await new Promise((r) => setTimeout(r, 2000));
  const after = await checkHeader(bucket, path);
  console.log(`  after:  cache-control="${after.cacheControl}" (${fmtBytes(after.contentLength)})`);
  const ok = (after.cacheControl ?? "").includes("31536000");
  console.log(`  ${ok ? "✓ header updated" : "⚠ header still not visible — Cloudflare may need a few minutes"}`);
  return true;
}

async function main() {
  console.log(`Fixing ${TARGETS.length} hero videos via delete+upload…\n`);
  let ok = 0;
  for (const t of TARGETS) {
    try {
      const res = await fixOne(t.bucket, t.path);
      if (res) ok++;
    } catch (e: any) {
      console.error(`  unexpected error: ${e.message}`);
    }
  }
  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`  ${ok}/${TARGETS.length} hero videos processed`);
  console.log(`══════════════════════════════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
