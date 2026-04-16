/**
 * Backfill content_items.width and content_items.height for existing portfolio
 * photos. Reads each image from Supabase storage, runs sharp().metadata(), and
 * writes dimensions back to the row.
 *
 * Idempotent: skips rows that already have dimensions set.
 *
 * Run:
 *   npx tsx scripts/backfill-content-item-dimensions.ts          # all models
 *   npx tsx scripts/backfill-content-item-dimensions.ts <model_id>  # one model
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "portfolio";

async function main() {
  const targetModelId = process.argv[2] || null;

  let query = (supabase as any)
    .from("content_items")
    .select("id, media_url, media_type, model_id, width, height")
    .eq("media_type", "image")
    .is("width", null);

  if (targetModelId) {
    query = query.eq("model_id", targetModelId);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  console.log(`Found ${rows?.length || 0} content_items needing dimension backfill`);
  if (!rows || rows.length === 0) return;

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // media_url is a storage path like "model_id/123456.jpg"
      // (or sometimes a full URL — handle both)
      const url = row.media_url.startsWith("http")
        ? row.media_url
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${row.media_url}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  ✗ ${row.id}: fetch ${res.status}`);
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();

      if (!meta.width || !meta.height) {
        console.warn(`  ✗ ${row.id}: no dimensions in metadata`);
        failed++;
        continue;
      }

      const { error: updateErr } = await (supabase as any)
        .from("content_items")
        .update({ width: meta.width, height: meta.height })
        .eq("id", row.id);

      if (updateErr) {
        console.warn(`  ✗ ${row.id}: update error ${updateErr.message}`);
        failed++;
        continue;
      }

      success++;
      console.log(`  ✓ ${row.id}: ${meta.width}x${meta.height}`);
    } catch (e) {
      console.warn(`  ✗ ${row.id}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main();
