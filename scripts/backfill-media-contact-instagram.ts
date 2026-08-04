/**
 * Normalize media_contacts.instagram_handle.
 *
 * Contacts self-submit through /media-submit and /tour/apply, so the column
 * accumulated full profile URLs with igsh/utm tracking params ("https://www.
 * instagram.com/name?igsh=...&utm_source=qr"). Those blow out the Instagram
 * column on /admin/community and produced dead links. This rewrites each row to
 * the canonical bare handle via the same helper the write paths now use.
 *
 * Conservative by design: rows holding another platform's URL, or two handles in
 * one field, are left untouched and reported for manual review.
 *
 * Idempotent: rows already canonical are skipped.
 *
 * Run:
 *   npx tsx scripts/backfill-media-contact-instagram.ts          # dry run
 *   npx tsx scripts/backfill-media-contact-instagram.ts --apply  # write
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { normalizeInstagramHandle } from "../src/lib/instagram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const apply = process.argv.includes("--apply");

  const { data: rows, error } = await supabase
    .from("media_contacts")
    .select("id, name, instagram_handle")
    .not("instagram_handle", "is", null)
    .order("created_at");

  if (error) throw error;

  const changes: { id: string; name: string; from: string; to: string }[] = [];
  const skipped: { name: string; value: string }[] = [];

  for (const row of rows || []) {
    const raw = row.instagram_handle as string;
    const next = normalizeInstagramHandle(raw);
    if (!next || next === raw) continue;
    // The helper hands back unreducible values verbatim; those never reach here.
    if (/[\s,|]/.test(next) || /^https?:\/\//i.test(next)) {
      skipped.push({ name: row.name as string, value: raw });
      continue;
    }
    changes.push({ id: row.id as string, name: row.name as string, from: raw, to: next });
  }

  console.log(`${rows?.length ?? 0} rows with a handle, ${changes.length} need rewriting\n`);
  for (const c of changes) console.log(`  ${c.name}\n    ${c.from}\n    -> ${c.to}`);

  const untouched = (rows || []).filter((r) => {
    const raw = r.instagram_handle as string;
    const next = normalizeInstagramHandle(raw);
    return next === raw && (/[\s,|]/.test(raw) || /^https?:\/\//i.test(raw));
  });
  if (untouched.length) {
    console.log(`\n${untouched.length} left as-is (foreign URL or multiple handles):`);
    for (const r of untouched) console.log(`  ${r.name}: ${r.instagram_handle}`);
  }
  if (skipped.length) {
    console.log(`\n${skipped.length} skipped defensively:`);
    for (const s of skipped) console.log(`  ${s.name}: ${s.value}`);
  }

  if (!apply) {
    console.log("\nDry run — pass --apply to write.");
    return;
  }

  let written = 0;
  for (const c of changes) {
    const { error: updateError } = await supabase
      .from("media_contacts")
      .update({ instagram_handle: c.to })
      .eq("id", c.id);
    if (updateError) {
      console.error(`  FAILED ${c.name}: ${updateError.message}`);
      continue;
    }
    written++;
  }
  console.log(`\nUpdated ${written}/${changes.length} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
