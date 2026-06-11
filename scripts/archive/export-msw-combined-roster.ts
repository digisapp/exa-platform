/**
 * Export a polished combined roster of:
 *   - All models with status='accepted' on the MSW gig (117)
 *   - All 166 models from "Full List Final - Models.csv"
 *
 * Deduplicated by model_id / IG handle / email.
 *
 * For each row, fill missing fields from the DB:
 *   - instagram_url (normalized to https://www.instagram.com/<handle>)
 *   - instagram_followers
 *   - height, waist, hips
 *
 * Title-case names. URLs written as =HYPERLINK(...) so they open in Sheets.
 *
 * Output: /Users/examodels/Desktop/MSW Combined Roster.csv
 *
 * Usage: npx tsx scripts/export-msw-combined-roster.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const MSW_GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0";
const CSV_PATH = "/Users/examodels/Desktop/Full List Final - Models.csv";
const OUT_PATH = "/Users/examodels/Desktop/MSW Combined Roster.csv";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Row = {
  source: string;
  name: string;
  igUrl: string;
  igHandle: string;
  igFollowers: number | null;
  height: string;
  waist: string;
  hips: string;
  email: string;
  phone: string;
  modelId: string;
  mswStatus: string;
};

function parseCsv(text: string): string[][] {
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
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function extractHandle(url: string): string {
  if (!url) return "";
  let h = url.trim();
  h = h.replace(/^https?:\/\//i, "");
  h = h.replace(/^www\./i, "");
  h = h.replace(/^instagram\.com\//i, "");
  h = h.replace(/[\/?#].*$/, "");
  return h.toLowerCase();
}

function normalizeIgUrl(handle: string): string {
  return handle ? `https://www.instagram.com/${handle}` : "";
}

function titleCase(raw: string): string {
  if (!raw) return "";
  // Handle apostrophes, hyphens, and periods within words.
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word =>
      word
        .split(/(['\-.])/)
        .map(part =>
          /^['\-.]$/.test(part) || !part
            ? part
            : part.charAt(0).toUpperCase() + part.slice(1)
        )
        .join("")
    )
    .join(" ");
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function hyperlinkCell(url: string): string {
  if (!url) return "";
  // =HYPERLINK("url","url") — both args identical so display = link.
  // Wrap whole formula in quotes and escape inner quotes.
  const inner = `=HYPERLINK("${url}","${url}")`;
  return '"' + inner.replace(/"/g, '""') + '"';
}

async function main() {
  // ---- 1. Fetch accepted MSW models ----
  const { data: acceptedApps, error: appsErr } = await supabase
    .from("gig_applications")
    .select("model_id, status")
    .eq("gig_id", MSW_GIG_ID)
    .eq("status", "accepted");
  if (appsErr) { console.error(appsErr); process.exit(1); }
  const acceptedIds = (acceptedApps ?? []).map(a => a.model_id);
  console.log(`MSW accepted applications: ${acceptedIds.length}`);

  const SELECT = "id, first_name, last_name, username, email, phone, instagram_url, instagram_followers, height, waist, hips";
  const acceptedModels: any[] = [];
  for (let i = 0; i < acceptedIds.length; i += 200) {
    const batch = acceptedIds.slice(i, i + 200);
    const { data, error } = await supabase.from("models").select(SELECT).in("id", batch);
    if (error) { console.error(error); process.exit(1); }
    acceptedModels.push(...(data ?? []));
  }

  // ---- 2. Parse Final List CSV ----
  const csvRows = parseCsv(readFileSync(CSV_PATH, "utf-8"));
  const finalListRows: any[] = [];
  for (let r = 1; r < csvRows.length; r++) {
    const cols = csvRows[r];
    if (!cols || cols.every(c => !c?.trim())) continue;
    finalListRows.push({
      name: (cols[0] ?? "").trim(),
      igUrl: (cols[1] ?? "").trim(),
      igFollowersRaw: (cols[2] ?? "").trim(),
      height: (cols[3] ?? "").trim(),
      waist: (cols[4] ?? "").trim(),
      hips: (cols[5] ?? "").trim(),
      email: (cols[6] ?? "").trim(),
      phone: (cols[7] ?? "").trim(),
    });
  }
  console.log(`Final List CSV rows: ${finalListRows.length}`);

  // ---- 3. Build dedup-aware combined list ----
  const byId = new Map<string, Row>();
  const byHandle = new Map<string, Row>();
  const byEmail = new Map<string, Row>();
  const all: Row[] = [];

  function ensureRow(r: Row): Row {
    if (r.modelId && byId.has(r.modelId)) return byId.get(r.modelId)!;
    if (r.igHandle && byHandle.has(r.igHandle)) return byHandle.get(r.igHandle)!;
    if (r.email && byEmail.has(r.email)) return byEmail.get(r.email)!;
    all.push(r);
    if (r.modelId) byId.set(r.modelId, r);
    if (r.igHandle) byHandle.set(r.igHandle, r);
    if (r.email) byEmail.set(r.email, r);
    return r;
  }

  // 3a. Add accepted-MSW models
  for (const m of acceptedModels) {
    const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ").trim() || m.username || "";
    const igHandle = extractHandle(m.instagram_url ?? "");
    ensureRow({
      source: "MSW Accepted",
      name: titleCase(fullName),
      igUrl: m.instagram_url ?? "",
      igHandle,
      igFollowers: m.instagram_followers,
      height: m.height ?? "",
      waist: m.waist ?? "",
      hips: m.hips ?? "",
      email: (m.email ?? "").toLowerCase(),
      phone: m.phone ?? "",
      modelId: m.id,
      mswStatus: "accepted",
    });
  }

  // 3b. Add Final List rows — mark dupes as "Both"
  for (const r of finalListRows) {
    const igHandle = extractHandle(r.igUrl);
    const email = r.email.toLowerCase();
    const followersNum = r.igFollowersRaw.replace(/[^0-9]/g, "");
    const newRow: Row = {
      source: "Final List",
      name: titleCase(r.name),
      igUrl: r.igUrl,
      igHandle,
      igFollowers: followersNum ? parseInt(followersNum, 10) : null,
      height: r.height,
      waist: r.waist,
      hips: r.hips,
      email,
      phone: r.phone,
      modelId: "",
      mswStatus: "",
    };
    const existing = ensureRow(newRow);
    if (existing !== newRow) {
      existing.source = "Both";
    }
  }

  // ---- 4. For Final-List-only rows, look up the DB model to fill missing fields ----
  const finalOnly = all.filter(r => r.source === "Final List");

  for (const r of finalOnly) {
    let dbModel: any = null;
    if (r.igHandle) {
      const { data } = await supabase
        .from("models").select(SELECT)
        .ilike("instagram_url", `%/${r.igHandle}%`).limit(2);
      if (data && data.length) {
        const exact = data.find((m: any) =>
          (m.instagram_url ?? "").toLowerCase().replace(/\/+$/, "").endsWith(`/${r.igHandle}`)
        );
        dbModel = exact ?? data[0];
      }
    }
    if (!dbModel && r.email) {
      const { data } = await supabase.from("models").select(SELECT).ilike("email", r.email).limit(1);
      if (data && data.length) dbModel = data[0];
    }
    if (dbModel) {
      r.modelId = dbModel.id;
      // Fill missing fields from DB
      if (!r.igHandle && dbModel.instagram_url) {
        r.igHandle = extractHandle(dbModel.instagram_url);
        r.igUrl = dbModel.instagram_url;
      }
      if (r.igFollowers == null || r.igFollowers === 0) {
        r.igFollowers = dbModel.instagram_followers ?? r.igFollowers;
      }
      if (!r.height) r.height = dbModel.height ?? "";
      if (!r.waist) r.waist = dbModel.waist ?? "";
      if (!r.hips) r.hips = dbModel.hips ?? "";
      if (!r.phone) r.phone = dbModel.phone ?? "";
      if (!r.email && dbModel.email) r.email = dbModel.email.toLowerCase();
      // Prefer DB name if CSV name is just a username/initial
      const dbName = [dbModel.first_name, dbModel.last_name].filter(Boolean).join(" ").trim();
      if (dbName && (r.name.length < 3 || !r.name.includes(" "))) {
        r.name = titleCase(dbName);
      }
    }
  }

  // 4b. Same fill-from-DB pass for MSW Accepted / Both rows (they already came
  // from DB, but the CSV might have richer measurements for overlap rows).
  // For "Both" rows, prefer CSV measurements only when DB is empty.
  // (Already correct since 3a populated from DB, and 3b matched as dupe of DB row.)

  // ---- 5. Look up MSW status for Final-List-only rows ----
  const finalOnlyIds = finalOnly.map(r => r.modelId).filter(Boolean);
  const appsByModel = new Map<string, string>();
  for (let i = 0; i < finalOnlyIds.length; i += 200) {
    const batch = finalOnlyIds.slice(i, i + 200);
    const { data } = await supabase
      .from("gig_applications")
      .select("model_id, status")
      .eq("gig_id", MSW_GIG_ID)
      .in("model_id", batch);
    for (const a of data ?? []) appsByModel.set(a.model_id, a.status);
  }
  for (const r of finalOnly) {
    r.mswStatus = r.modelId ? (appsByModel.get(r.modelId) ?? "none") : "none";
  }

  // ---- 6. Normalize IG URL on every row ----
  for (const r of all) {
    r.igUrl = normalizeIgUrl(r.igHandle);
  }

  // ---- 7. Write CSV ----
  const headerOut = [
    "Source", "Name", "Instagram", "Instagram Following",
    "Height", "Waist", "Hips", "Email", "Phone", "MSW Status",
  ];
  const lines = [headerOut.join(",")];

  const sortKey = (s: string) => s === "MSW Accepted" ? 0 : s === "Both" ? 1 : 2;
  all.sort((a, b) => {
    const k = sortKey(a.source) - sortKey(b.source);
    if (k !== 0) return k;
    return a.name.localeCompare(b.name);
  });

  for (const r of all) {
    lines.push([
      csvEscape(r.source),
      csvEscape(r.name),
      hyperlinkCell(r.igUrl),
      csvEscape(r.igFollowers ?? ""),
      csvEscape(r.height),
      csvEscape(r.waist),
      csvEscape(r.hips),
      csvEscape(r.email),
      csvEscape(r.phone),
      csvEscape(r.mswStatus),
    ].join(","));
  }
  writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf-8");

  // ---- 8. Report ----
  const counts = { msw: 0, both: 0, finalOnly: 0 };
  let missingIg = 0, missingHeight = 0, missingWaist = 0, missingHips = 0;
  for (const r of all) {
    if (r.source === "MSW Accepted") counts.msw++;
    else if (r.source === "Both") counts.both++;
    else counts.finalOnly++;
    if (!r.igUrl) missingIg++;
    if (!r.height) missingHeight++;
    if (!r.waist) missingWaist++;
    if (!r.hips) missingHips++;
  }
  console.log("");
  console.log(`Wrote ${all.length} rows to ${OUT_PATH}`);
  console.log(`  MSW Accepted only: ${counts.msw}`);
  console.log(`  Both: ${counts.both}`);
  console.log(`  Final List only: ${counts.finalOnly}`);
  console.log("");
  console.log(`Still missing after DB fill:`);
  console.log(`  Instagram URL: ${missingIg}`);
  console.log(`  Height: ${missingHeight}`);
  console.log(`  Waist:  ${missingWaist}`);
  console.log(`  Hips:   ${missingHips}`);
}

main().catch(e => { console.error(e); process.exit(1); });
