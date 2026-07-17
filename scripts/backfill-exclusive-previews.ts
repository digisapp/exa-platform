/**
 * Backfill blurred teaser previews for locked exclusive content_items.
 *
 * Items uploaded before the content-hub preview pipeline (PR #77) have
 * preview_url = media_url, which the fan API refuses to serve as a teaser
 * (falling back to the full media let anyone rip the paid file from the
 * network tab), so every legacy locked card renders a blank placeholder.
 *
 * For each locked item without a distinct preview this script downloads the
 * media from storage, generates the same heavily blurred 512px JPEG the
 * upload pipeline produces (videos: first frame via ffmpeg), uploads it to
 * the public portfolio bucket as "<path>_preview.jpg", and points
 * preview_url at it.
 *
 * Idempotent: only touches rows where preview_url is null or equals
 * media_url; preview uploads are upserts.
 *
 * Run:
 *   npx tsx scripts/backfill-exclusive-previews.ts --dry-run [--limit N] [--out DIR]
 *     (generates previews into DIR for eyeballing; no uploads, no DB writes)
 *   npx tsx scripts/backfill-exclusive-previews.ts [--limit N]
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { processImage } from "../src/lib/image-processing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;
const outArg = process.argv.indexOf("--out");
const OUT_DIR = outArg !== -1 ? process.argv[outArg + 1] : "scripts/exports/preview-dry-run";

// Same parameters as the upload pipeline (src/app/api/content-hub/items/route.ts)
const PREVIEW_OPTS = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 50,
  format: "jpeg",
  blur: 24,
} as const;

// Matches /api/content's extractStoragePath: raw path, or path inside a
// (possibly expired) signed/public Supabase storage URL
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url;
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function extractVideoFrame(videoBuf: Buffer, id: string): Buffer {
  const inPath = join(tmpdir(), `ppv-frame-${id}.bin`);
  const outPath = join(tmpdir(), `ppv-frame-${id}.jpg`);
  writeFileSync(inPath, videoBuf);
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-ss", "0.5", "-i", inPath, "-frames:v", "1", "-q:v", "4", outPath],
      { stdio: "pipe" }
    );
    return require("fs").readFileSync(outPath);
  } finally {
    rmSync(inPath, { force: true });
    rmSync(outPath, { force: true });
  }
}

async function main() {
  const { data: rows, error } = await supabase
    .from("content_items")
    .select("id, model_id, media_type, media_url, preview_url, coin_price")
    .eq("status", "exclusive")
    .gt("coin_price", 0)
    .limit(1000);
  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  const targets = (rows || []).filter(
    (r) => !r.preview_url || r.preview_url === r.media_url
  );
  console.log(
    `${rows?.length ?? 0} locked exclusive items, ${targets.length} need previews` +
      (DRY_RUN ? " (DRY RUN)" : "")
  );
  if (DRY_RUN) mkdirSync(OUT_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const row of targets.slice(0, LIMIT)) {
    try {
      const path = extractStoragePath(row.media_url);
      if (!path) {
        console.warn(`  ✗ ${row.id}: cannot extract storage path from ${row.media_url}`);
        failed++;
        continue;
      }

      // Legacy locked items all live in the public portfolio bucket; anything
      // already migrated to the private bucket keeps its exclusive/ prefix
      const bucket = path.startsWith("exclusive/") ? "content-media" : "portfolio";
      const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path);
      if (dlErr || !blob) {
        console.warn(`  ✗ ${row.id}: download failed (${bucket}/${path}): ${dlErr?.message}`);
        failed++;
        continue;
      }
      let buf = Buffer.from(await blob.arrayBuffer());

      if (row.media_type === "video") {
        buf = extractVideoFrame(buf, row.id);
      }

      const preview = await processImage(buf, PREVIEW_OPTS);

      // Same naming convention as the upload pipeline; preview always lands in
      // the public portfolio bucket — it is the public teaser
      const previewPath = `${path
        .replace(/^exclusive\//, "")
        .replace(/\.[^.]+$/, "")}_preview.jpg`;

      if (DRY_RUN) {
        const localPath = join(OUT_DIR, `${row.id}.jpg`);
        writeFileSync(localPath, preview.buffer);
        console.log(`  ✓ ${row.id} (${row.media_type}): ${localPath}`);
        success++;
        continue;
      }

      const { error: upErr } = await supabase.storage
        .from("portfolio")
        .upload(previewPath, preview.buffer, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      if (upErr) {
        console.warn(`  ✗ ${row.id}: preview upload failed: ${upErr.message}`);
        failed++;
        continue;
      }

      const { error: updErr } = await supabase
        .from("content_items")
        .update({ preview_url: previewPath })
        .eq("id", row.id);
      if (updErr) {
        console.warn(`  ✗ ${row.id}: DB update failed: ${updErr.message}`);
        failed++;
        continue;
      }

      console.log(`  ✓ ${row.id} (${row.media_type}) → ${previewPath}`);
      success++;
    } catch (e) {
      console.warn(`  ✗ ${row.id}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main();
