/**
 * Reconcile the "Full List Final - Models" CSV against the DB:
 *   1. Update each model's instagram_followers from the CSV.
 *   2. Ensure each model has a pending or accepted application on the
 *      Miami Swim Week gig; if neither, insert a pending application.
 *
 * Matching strategy per CSV row (first hit wins):
 *   a. instagram_url ilike %<handle>% (and username = handle as a fallback)
 *   b. email (case-insensitive)
 *   c. first_name + last_name ilike (split on first space)
 *
 * Per project memory: do NOT bump gigs.spots_filled for pending applications.
 *
 * Usage:
 *   npx tsx scripts/reconcile-msw-final-list.ts            # dry run
 *   npx tsx scripts/reconcile-msw-final-list.ts --apply    # write changes
 */
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const CSV_PATH = "/Users/examodels/Desktop/Full List Final - Models.csv";
const MSW_GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type CsvRow = {
  name: string;
  igUrl: string;
  igHandle: string;
  igFollowers: number | null;
  email: string;
  rowNum: number;
};

function parseCsv(text: string): CsvRow[] {
  // Simple CSV parser that handles quoted fields with commas.
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }

  const out: CsvRow[] = [];
  // rows[0] is header
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.every(c => !c?.trim())) continue;
    const name = (cols[0] ?? "").trim();
    const igUrl = (cols[1] ?? "").trim();
    const followersRaw = (cols[2] ?? "").trim().replace(/[^0-9]/g, "");
    const igFollowers = followersRaw ? parseInt(followersRaw, 10) : null;
    const email = (cols[6] ?? "").trim().toLowerCase();
    const igHandle = extractHandle(igUrl);
    out.push({ name, igUrl, igHandle, igFollowers, email, rowNum: r + 1 });
  }
  return out;
}

function extractHandle(url: string): string {
  if (!url) return "";
  // Strip protocol, www., domain, trailing slash, and querystring.
  let h = url.trim();
  h = h.replace(/^https?:\/\//i, "");
  h = h.replace(/^www\./i, "");
  h = h.replace(/^instagram\.com\//i, "");
  h = h.replace(/[\/?#].*$/, "");
  return h.toLowerCase();
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

type ModelHit = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  instagram_url: string | null;
  instagram_followers: number | null;
  is_approved: boolean | null;
};

const SELECT_COLS = "id, username, first_name, last_name, email, instagram_url, instagram_followers, is_approved";

async function findModel(row: CsvRow): Promise<{ model: ModelHit | null; how: string }> {
  // 1. By IG handle in instagram_url
  if (row.igHandle) {
    const { data } = await supabase
      .from("models")
      .select(SELECT_COLS)
      .ilike("instagram_url", `%/${row.igHandle}%`)
      .limit(2);
    if (data && data.length === 1) return { model: data[0] as ModelHit, how: "instagram_url" };
    if (data && data.length > 1) {
      // Disambiguate: prefer exact suffix match
      const exact = data.find(m =>
        (m.instagram_url ?? "").toLowerCase().replace(/\/+$/, "").endsWith(`/${row.igHandle}`)
      );
      if (exact) return { model: exact as ModelHit, how: "instagram_url(exact)" };
      return { model: data[0] as ModelHit, how: "instagram_url(ambig)" };
    }

    // 1b. By username = handle
    const { data: byUser } = await supabase
      .from("models")
      .select(SELECT_COLS)
      .eq("username", row.igHandle)
      .maybeSingle();
    if (byUser) return { model: byUser as ModelHit, how: "username" };
  }

  // 2. By email
  if (row.email) {
    const { data: byEmail } = await supabase
      .from("models")
      .select(SELECT_COLS)
      .ilike("email", row.email)
      .limit(2);
    if (byEmail && byEmail.length >= 1) return { model: byEmail[0] as ModelHit, how: byEmail.length > 1 ? "email(ambig)" : "email" };
  }

  // 3. By name
  const { first, last } = splitName(row.name);
  if (first && last) {
    const { data: byName } = await supabase
      .from("models")
      .select(SELECT_COLS)
      .ilike("first_name", first)
      .ilike("last_name", last)
      .limit(3);
    if (byName && byName.length === 1) return { model: byName[0] as ModelHit, how: "name" };
    if (byName && byName.length > 1) return { model: byName[0] as ModelHit, how: "name(ambig)" };
  }

  return { model: null, how: "no-match" };
}

async function main() {
  console.log(APPLY ? "*** APPLY MODE — writing changes ***" : "DRY RUN (use --apply to write)");
  console.log("");

  const csvText = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCsv(csvText);
  console.log(`Parsed ${rows.length} CSV rows`);

  // Fetch existing MSW applications once
  const { data: existingApps, error: appsErr } = await supabase
    .from("gig_applications")
    .select("model_id, status")
    .eq("gig_id", MSW_GIG_ID);
  if (appsErr) { console.error("apps fetch error:", appsErr); process.exit(1); }
  const appByModel = new Map<string, string>();
  for (const a of existingApps ?? []) appByModel.set(a.model_id, a.status);
  console.log(`Existing MSW applications: ${appByModel.size}`);
  console.log("");

  const unmatched: CsvRow[] = [];
  const ambigMatches: { row: CsvRow; model: ModelHit; how: string }[] = [];
  const followerUpdates: { row: CsvRow; model: ModelHit; from: number | null; to: number }[] = [];
  const followerNoChange: { row: CsvRow; model: ModelHit }[] = [];
  const appsToInsert: { row: CsvRow; model: ModelHit }[] = [];
  const appsAlreadyAccepted: { row: CsvRow; model: ModelHit }[] = [];
  const appsAlreadyPending: { row: CsvRow; model: ModelHit }[] = [];
  const appsOtherStatus: { row: CsvRow; model: ModelHit; status: string }[] = [];

  for (const row of rows) {
    const { model, how } = await findModel(row);
    if (!model) { unmatched.push(row); continue; }
    if (how.includes("ambig")) ambigMatches.push({ row, model, how });

    // Compare follower count
    if (row.igFollowers != null) {
      if (model.instagram_followers !== row.igFollowers) {
        followerUpdates.push({ row, model, from: model.instagram_followers ?? null, to: row.igFollowers });
      } else {
        followerNoChange.push({ row, model });
      }
    }

    // Check MSW application
    const status = appByModel.get(model.id);
    if (!status) appsToInsert.push({ row, model });
    else if (status === "accepted") appsAlreadyAccepted.push({ row, model });
    else if (status === "pending") appsAlreadyPending.push({ row, model });
    else appsOtherStatus.push({ row, model, status });
  }

  // ============ Reports ============
  console.log(`=== Matching ===`);
  console.log(`Matched:   ${rows.length - unmatched.length} / ${rows.length}`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`Ambiguous: ${ambigMatches.length}`);
  console.log("");

  if (unmatched.length) {
    console.log("--- UNMATCHED (no DB row found) ---");
    for (const r of unmatched) console.log(`  row ${r.rowNum}: ${r.name} | @${r.igHandle} | ${r.email}`);
    console.log("");
  }
  if (ambigMatches.length) {
    console.log("--- AMBIGUOUS (multiple matches — picked first) ---");
    for (const { row, model, how } of ambigMatches) {
      console.log(`  row ${row.rowNum}: ${row.name} (${how}) -> ${model.first_name} ${model.last_name} <${model.email}> ${model.instagram_url}`);
    }
    console.log("");
  }

  console.log(`=== Instagram followers ===`);
  console.log(`Will update:    ${followerUpdates.length}`);
  console.log(`Already match:  ${followerNoChange.length}`);
  if (followerUpdates.length) {
    console.log("--- Updates ---");
    for (const u of followerUpdates) {
      console.log(`  ${u.row.name.padEnd(28)} ${(u.from ?? 0).toString().padStart(9)} -> ${u.to.toString().padStart(9)}  (@${u.row.igHandle})`);
    }
  }
  console.log("");

  console.log(`=== MSW gig applications ===`);
  console.log(`Already accepted: ${appsAlreadyAccepted.length}`);
  console.log(`Already pending:  ${appsAlreadyPending.length}`);
  console.log(`Other status:     ${appsOtherStatus.length} (will be left alone)`);
  console.log(`Will insert pending: ${appsToInsert.length}`);
  if (appsToInsert.length) {
    console.log("--- New pending applications ---");
    for (const a of appsToInsert) {
      console.log(`  ${a.row.name.padEnd(28)} model_id=${a.model.id}  @${a.row.igHandle}`);
    }
  }
  if (appsOtherStatus.length) {
    console.log("--- Other status (leaving as-is) ---");
    for (const a of appsOtherStatus) {
      console.log(`  ${a.row.name.padEnd(28)} status=${a.status}  model_id=${a.model.id}`);
    }
  }
  console.log("");

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to write the changes above.");
    return;
  }

  // ============ Apply ============
  console.log("Applying changes...");

  let okFollowers = 0, errFollowers = 0;
  for (const u of followerUpdates) {
    const { error } = await supabase
      .from("models")
      .update({ instagram_followers: u.to })
      .eq("id", u.model.id);
    if (error) { console.error(`  ! update failed for ${u.row.name}:`, error.message); errFollowers++; }
    else okFollowers++;
  }
  console.log(`Followers updated: ${okFollowers} ok, ${errFollowers} errors`);

  let okApps = 0, errApps = 0;
  for (const a of appsToInsert) {
    const { error } = await supabase
      .from("gig_applications")
      .insert({ gig_id: MSW_GIG_ID, model_id: a.model.id, status: "pending" });
    if (error) { console.error(`  ! insert failed for ${a.row.name}:`, error.message); errApps++; }
    else okApps++;
  }
  console.log(`MSW pending applications inserted: ${okApps} ok, ${errApps} errors`);
  console.log("(Note: spots_filled intentionally NOT bumped — that's reserved for accepted apps.)");
}

main().catch(e => { console.error(e); process.exit(1); });
