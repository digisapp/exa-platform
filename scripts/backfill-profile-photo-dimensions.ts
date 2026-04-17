/**
 * Backfill models.profile_photo_width and profile_photo_height for existing
 * profile photos. Fetches each image, reads metadata via Sharp, and writes
 * dimensions back to the row.
 *
 * Idempotent: skips rows that already have dimensions set.
 *
 * Run:
 *   npx tsx scripts/backfill-profile-photo-dimensions.ts          # all models
 *   npx tsx scripts/backfill-profile-photo-dimensions.ts <model_id>  # one model
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

async function main() {
  const targetModelId = process.argv[2] || null;

  // Paginate — Supabase JS caps at 1000 rows
  const PAGE_SIZE = 1000;
  const rows: any[] = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from("models")
      .select("id, profile_photo_url")
      .not("profile_photo_url", "is", null)
      .is("profile_photo_width", null)
      .range(from, from + PAGE_SIZE - 1);

    if (targetModelId) q = q.eq("id", targetModelId);

    const { data, error } = await q;
    if (error) {
      console.error("Query error:", error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(
    `Found ${rows.length} models with profile photos needing dimension backfill`
  );
  if (rows.length === 0) return;

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const url = row.profile_photo_url;
      if (!url) {
        failed++;
        continue;
      }

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

      const { error: updateErr } = await supabase
        .from("models")
        .update({
          profile_photo_width: meta.width,
          profile_photo_height: meta.height,
        })
        .eq("id", row.id);

      if (updateErr) {
        console.warn(`  ✗ ${row.id}: update error ${updateErr.message}`);
        failed++;
        continue;
      }

      success++;
      if (success % 50 === 0) {
        console.log(`  ... ${success} done`);
      }
    } catch (e) {
      console.warn(`  ✗ ${row.id}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main();
