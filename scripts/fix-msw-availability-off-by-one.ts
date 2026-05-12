/**
 * Fixes the MSW availability off-by-one bug.
 *
 * From 2026-05-05 → 2026-05-08, the model availability card displayed
 * weekday labels that were off by one (e.g. "Mon" was rendered above date
 * 2026-05-26, which is actually a Tuesday). Models picked by day-of-week,
 * so their stored `available_date` is one day ahead of what they meant.
 *
 * Commit 454ed706 (2026-05-08 ~11:30 CST / 16:30 UTC) fixed the labels.
 *
 * Strategy: for each model who picked under the buggy labels, REBUILD their
 * gig_availability rows. Take each pre-fix date, shift it back one day to
 * recover the day-of-week the model meant, drop anything that lands on a
 * non-show day, dedupe against any post-fix rows the model has added since.
 *
 * Day-of-week shift table (old label → stored → intended new date):
 *   Mon  2026-05-26 → 2026-05-25  (no show — drop)
 *   Tue  2026-05-27 → 2026-05-26  (keep)
 *   Wed  2026-05-28 → 2026-05-27  (keep)
 *   Thu  2026-05-29 → 2026-05-28  (Thursday removed from schedule — drop)
 *   Fri  2026-05-30 → 2026-05-29  (keep)
 *   Sat  2026-05-31 → 2026-05-30  (keep)
 *
 * Usage:
 *   npx tsx scripts/fix-msw-availability-off-by-one.ts            # dry run
 *   npx tsx scripts/fix-msw-availability-off-by-one.ts --apply    # write
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const FIX_SHIPPED_AT = "2026-05-08T16:30:00+00:00";

const VALID_NEW_DATES = new Set([
  "2026-05-26",
  "2026-05-27",
  "2026-05-29",
  "2026-05-30",
  "2026-05-31",
]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function shiftBackOneDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

(async () => {
  const { data: preFixRows, error } = await supabase
    .from("gig_availability")
    .select("id, gig_id, model_id, available_date, created_at")
    .lt("created_at", FIX_SHIPPED_AT);

  if (error) {
    console.error("Failed to read gig_availability:", error);
    process.exit(1);
  }
  if (!preFixRows || preFixRows.length === 0) {
    console.log("No pre-fix rows. Nothing to do.");
    return;
  }

  // Group pre-fix rows by (gig_id, model_id)
  type Key = string;
  const keyOf = (g: string, m: string) => `${g}::${m}`;
  const groups = new Map<Key, typeof preFixRows>();
  for (const r of preFixRows) {
    const k = keyOf(r.gig_id, r.model_id);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  console.log(`Found ${preFixRows.length} pre-fix rows across ${groups.size} (model, gig) pairs.\n`);

  const modelIds = Array.from(new Set(preFixRows.map((r) => r.model_id)));
  const { data: models } = await supabase
    .from("models")
    .select("id, first_name, last_name, username")
    .in("id", modelIds);
  const nameOf = new Map(
    (models ?? []).map((m) => [
      m.id,
      `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.username || m.id,
    ])
  );

  type Plan = {
    gigId: string;
    modelId: string;
    modelName: string;
    deleteIds: string[];
    oldDates: string[];
    insertDates: string[];
    droppedDates: { date: string; reason: string }[];
    postFixDates: string[];
  };

  const plans: Plan[] = [];

  for (const [k, rows] of groups) {
    const [gigId, modelId] = k.split("::");
    const modelName = nameOf.get(modelId) ?? modelId;

    // What does the model already have for this gig that was created POST-fix?
    const { data: postFix } = await supabase
      .from("gig_availability")
      .select("id, available_date, created_at")
      .eq("gig_id", gigId)
      .eq("model_id", modelId)
      .gte("created_at", FIX_SHIPPED_AT);

    const postFixDates = new Set((postFix ?? []).map((r) => r.available_date));

    const oldDates = rows.map((r) => r.available_date).sort();
    const intendedSet = new Set<string>();
    const dropped: { date: string; reason: string }[] = [];

    for (const r of rows) {
      const newDate = shiftBackOneDay(r.available_date);
      if (!VALID_NEW_DATES.has(newDate)) {
        const reason =
          newDate === "2026-05-25"
            ? `was "Mon" — not a show day`
            : newDate === "2026-05-28"
            ? `was "Thu" — Thursday removed from schedule`
            : `${newDate} not a show day`;
        dropped.push({ date: r.available_date, reason });
        continue;
      }
      intendedSet.add(newDate);
    }

    // Final set we want for this model = intended ∪ postFix
    // We'll delete ALL pre-fix rows, then insert intended dates not already in postFix.
    const insertDates = Array.from(intendedSet).filter((d) => !postFixDates.has(d)).sort();

    plans.push({
      gigId,
      modelId,
      modelName,
      deleteIds: rows.map((r) => r.id),
      oldDates,
      insertDates,
      droppedDates: dropped,
      postFixDates: Array.from(postFixDates).sort(),
    });
  }

  console.log("─── PLAN ─────────────────────────────────────────────");
  let totalDeletes = 0;
  let totalInserts = 0;
  for (const p of plans) {
    totalDeletes += p.deleteIds.length;
    totalInserts += p.insertDates.length;
    const wasLabels = p.oldDates.map((d) => `${dayLabel(shiftBackOneDay(d))} (${d})`).join(", ");
    const newLabels = p.insertDates.map((d) => `${dayLabel(d)} ${d}`).join(", ") || "—";
    console.log(`\n  ${p.modelName}`);
    console.log(`    Pre-fix picks (model's intent):  ${wasLabels}`);
    console.log(`    → Final new rows to insert:       ${newLabels}`);
    if (p.postFixDates.length) {
      console.log(`    Post-fix rows (kept as-is):      ${p.postFixDates.join(", ")}`);
    }
    if (p.droppedDates.length) {
      const ds = p.droppedDates.map((d) => `${d.date} (${d.reason})`).join("; ");
      console.log(`    Dropped:                          ${ds}`);
    }
  }

  console.log(`\n─── TOTALS ───────────────────────────────────────────`);
  console.log(`Pre-fix rows to delete:  ${totalDeletes}`);
  console.log(`New rows to insert:      ${totalInserts}`);
  console.log(`Models affected:         ${plans.length}`);

  if (!APPLY) {
    console.log(`\nDry run. Re-run with --apply to write changes.`);
    return;
  }

  console.log(`\nApplying changes…\n`);
  let deleted = 0;
  let inserted = 0;
  let failed = 0;

  for (const p of plans) {
    const { error: delErr } = await supabase
      .from("gig_availability")
      .delete()
      .in("id", p.deleteIds);
    if (delErr) {
      failed++;
      console.error(`  ✗ delete pre-fix rows for ${p.modelName}:`, delErr.message);
      continue;
    }
    deleted += p.deleteIds.length;

    if (p.insertDates.length === 0) {
      console.log(`  ✓ ${p.modelName}: deleted ${p.deleteIds.length}, no inserts`);
      continue;
    }

    const newRows = p.insertDates.map((d) => ({
      gig_id: p.gigId,
      model_id: p.modelId,
      available_date: d,
    }));
    const { error: insErr } = await supabase.from("gig_availability").insert(newRows);
    if (insErr) {
      failed++;
      console.error(`  ✗ insert for ${p.modelName}:`, insErr.message);
      continue;
    }
    inserted += newRows.length;
    console.log(`  ✓ ${p.modelName}: deleted ${p.deleteIds.length}, inserted ${newRows.length}`);
  }

  console.log(`\nDone. Deleted: ${deleted}, Inserted: ${inserted}, Failed ops: ${failed}`);
})();
