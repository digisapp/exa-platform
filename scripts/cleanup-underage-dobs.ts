/**
 * One-off (2026-07-15): clean under-18 / garbage DOBs that a 2025-11 import
 * batch landed in models.dob, ahead of migration
 * 20260715000003_age_18_plus_enforcement.sql (whose CHECK constraints would
 * otherwise fail to apply).
 *
 * - Plausible teenage DOB (14–17 yrs): HIDE the profile (is_approved=false)
 *   and null the DOB. These may be real minors scraped into the import.
 * - Implausible DOB (<14 yrs incl. future dates): clearly a bad column
 *   mapping, not a real birthdate — null the DOB, leave visibility alone.
 *
 * Prints a full backup of every row it touches before changing anything.
 * Dry-run by default; pass --apply to execute.
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

const DOB_COLS = ["dob", "date_of_birth", "verified_dob"] as const;

function age(dobString: string): number {
  const d = new Date(dobString);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

async function fetchAllModels() {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("models")
      .select("id, username, is_approved, claimed_at, dob, date_of_birth, verified_dob")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...data!);
    if (data!.length < 1000) break;
  }
  return out;
}

async function main() {
  console.log(APPLY ? "APPLY mode — writing changes\n" : "DRY RUN — pass --apply to execute\n");

  const models = await fetchAllModels();
  console.log(`models scanned: ${models.length}`);

  const offenders = models
    .map((m) => {
      const bad = DOB_COLS.filter((c) => m[c] && age(m[c]) < 18);
      if (!bad.length) return null;
      const minAge = Math.min(...bad.map((c) => age(m[c])));
      return { row: m, badCols: bad, minAge, plausibleTeen: minAge >= 14 };
    })
    .filter(Boolean) as Array<{ row: any; badCols: string[]; minAge: number; plausibleTeen: boolean }>;

  console.log(`rows with an under-18 DOB: ${offenders.length}\n`);
  console.log("=== BACKUP (full pre-change state) ===");
  for (const o of offenders) {
    console.log(JSON.stringify(o.row));
  }
  console.log("=== END BACKUP ===\n");

  let hidden = 0;
  let nulled = 0;

  for (const o of offenders) {
    const update: Record<string, unknown> = {};
    for (const c of o.badCols) update[c] = null;
    if (o.plausibleTeen) update.is_approved = false;

    const label = o.plausibleTeen
      ? `TEEN (age ${o.minAge}) — hide profile + null DOB`
      : `garbage DOB (age ${o.minAge}) — null DOB only`;
    console.log(`@${o.row.username}: ${label}`);

    if (APPLY) {
      const { error } = await supabase.from("models").update(update).eq("id", o.row.id);
      if (error) {
        console.error(`  FAILED for @${o.row.username}:`, error.message);
        continue;
      }
    }
    if (o.plausibleTeen) hidden++;
    nulled += o.badCols.length;
  }

  console.log(
    `\n${APPLY ? "Done" : "Would do"}: ${hidden} profiles hidden, ${nulled} DOB values nulled across ${offenders.length} rows.`
  );

  if (APPLY) {
    // Verify nothing under 18 remains before the CHECK-constraint migration runs
    const remaining = (await fetchAllModels()).filter((m) =>
      DOB_COLS.some((c) => m[c] && age(m[c]) < 18)
    );
    console.log(`verification: ${remaining.length} under-18 DOB rows remain (must be 0).`);
    if (remaining.length) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
