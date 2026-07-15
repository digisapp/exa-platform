/**
 * One-off (2026-07-15) + safe to re-run: delete ID document + selfie images
 * for verifications that already have a decision (approved/rejected). The
 * decision route now purges at decision time; this sweeps everything decided
 * before that shipped. Pending submissions are never touched — admins still
 * need those images to review.
 *
 * Dry-run by default; pass --apply to delete.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log(APPLY ? "APPLY mode\n" : "DRY RUN — pass --apply to delete\n");

  const { data: rows, error } = await supabase
    .from("model_verifications")
    .select("id, status, id_document_path, selfie_path")
    .neq("status", "pending_review");
  if (error) throw error;

  const paths = (rows || [])
    .flatMap((r) => [r.id_document_path, r.selfie_path])
    .filter(Boolean) as string[];

  console.log(`decided verifications: ${rows?.length ?? 0}; stored image paths: ${paths.length}`);

  // Only delete objects that actually exist (already-purged rows keep their
  // path strings — that's fine, the record is the paths' history)
  const existing: string[] = [];
  for (const p of paths) {
    const [dir, ...rest] = [p.slice(0, p.lastIndexOf("/")), p.slice(p.lastIndexOf("/") + 1)];
    const { data: files } = await supabase.storage.from("identity-documents").list(dir);
    if (files?.some((f) => f.name === rest[0])) existing.push(p);
  }
  console.log(`objects still in bucket: ${existing.length}`);
  for (const p of existing) console.log(`  ${p}`);

  if (APPLY && existing.length) {
    const { error: rmErr } = await supabase.storage.from("identity-documents").remove(existing);
    if (rmErr) throw rmErr;
    console.log(`\nDeleted ${existing.length} objects.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
