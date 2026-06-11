/**
 * Read an MSW roster xlsx (Name / Instagram / Followers ...),
 * look up each model in the DB by Instagram handle (fallback: username, then name),
 * and append Height / Bust / Waist / Hips columns.
 *
 * Idempotent: re-running refreshes the measurement columns, not duplicates them.
 *
 * Usage: npx tsx scripts/enrich-msw-roster-measurements.ts "/path/to/roster.xlsx"
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const FILE_PATH =
  process.argv[2] ??
  "/Users/examodels/Desktop/MSW Model Roster - O NIKI BIKINIS.xlsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function extractHandle(url: string): string {
  if (!url) return "";
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/[\/?#].*$/, "")
    .toLowerCase();
}

type DbModel = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  instagram_url: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
};

const SELECT = "id, first_name, last_name, username, instagram_url, height, bust, waist, hips";

async function findByHandle(handle: string): Promise<DbModel | null> {
  if (!handle) return null;
  const { data } = await supabase
    .from("models")
    .select(SELECT)
    .ilike("instagram_url", `%/${handle}%`)
    .limit(5);
  if (!data || data.length === 0) return null;
  const exact = data.find((m: any) =>
    (m.instagram_url ?? "")
      .toLowerCase()
      .replace(/\/+$/, "")
      .endsWith(`/${handle}`)
  );
  return (exact ?? data[0]) as DbModel;
}

async function findByUsername(handle: string): Promise<DbModel | null> {
  if (!handle) return null;
  // Try exact handle, then handle with underscores stripped (DB often stores
  // username without underscores).
  const candidates = Array.from(new Set([handle, handle.replace(/_/g, "")]));
  for (const u of candidates) {
    const { data } = await supabase
      .from("models")
      .select(SELECT)
      .eq("username", u)
      .limit(2);
    if (data && data.length === 1) return data[0] as DbModel;
  }
  return null;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

async function findByName(name: string): Promise<DbModel | null> {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const first = parts[0];
  const last = parts.slice(1).join(" ");

  // Try exact (diacritic-sensitive) first
  let { data } = await supabase
    .from("models")
    .select(SELECT)
    .ilike("first_name", first)
    .ilike("last_name", last)
    .limit(2);
  if (data && data.length === 1) return data[0] as DbModel;

  // Retry with diacritics stripped (DB rows may or may not have accents)
  const firstA = stripDiacritics(first);
  const lastA = stripDiacritics(last);
  if (firstA !== first || lastA !== last) {
    const r2 = await supabase
      .from("models")
      .select(SELECT)
      .ilike("first_name", firstA)
      .ilike("last_name", lastA)
      .limit(2);
    if (r2.data && r2.data.length === 1) return r2.data[0] as DbModel;
  }
  return null;
}

async function main() {
  const wb = XLSX.readFile(FILE_PATH);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Idempotency: strip any existing Height/Bust/Waist/Hips columns at the end,
  // so re-running the script doesn't keep appending duplicate measurement cols.
  const MEAS = ["height", "bust", "waist", "hips"];
  let header = [...rawRows[0]];
  let rows = rawRows.map(r => [...r]);
  while (header.length >= 4) {
    const tail = header.slice(-4).map((h: any) => String(h ?? "").trim().toLowerCase());
    const isMeasTail =
      tail[0] === "height" && tail[1] === "bust" && tail[2] === "waist" && tail[3] === "hips";
    if (!isMeasTail) break;
    header = header.slice(0, -4);
    rows = rows.map(r => r.slice(0, header.length));
  }
  rows[0] = header;
  const newHeader = [...header, "Height", "Bust", "Waist", "Hips"];

  const out: any[][] = [newHeader];
  let matched = 0;
  let unmatched: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[0] ?? "").toString().trim();
    const ig = (r[1] ?? "").toString().trim();

    // Skip fully-empty rows
    if (!name && !ig) {
      out.push(r);
      continue;
    }

    const handle = extractHandle(ig);
    let model = await findByHandle(handle);
    if (!model) model = await findByUsername(handle);
    if (!model) model = await findByName(name);

    if (model) {
      matched++;
      console.log(
        `OK   ${name.padEnd(28)} ${handle.padEnd(28)} h=${model.height ?? ""} b=${model.bust ?? ""} w=${model.waist ?? ""} hp=${model.hips ?? ""}`
      );
    } else {
      unmatched.push(`${name}  (${handle})`);
      console.log(`MISS ${name.padEnd(28)} ${handle}`);
    }

    out.push([
      ...r,
      model?.height ?? "",
      model?.bust ?? "",
      model?.waist ?? "",
      model?.hips ?? "",
    ]);
  }

  // Build new sheet with sensible column widths.
  const newSheet = XLSX.utils.aoa_to_sheet(out);
  const cols = newHeader.map((h: any) => {
    const k = String(h ?? "").trim().toLowerCase();
    if (k === "name") return { wch: 24 };
    if (k === "instagram") return { wch: 48 };
    if (k === "followers") return { wch: 12 };
    if (["height", "bust", "waist", "hips"].includes(k)) return { wch: 8 };
    return { wch: 6 };
  });
  newSheet["!cols"] = cols;
  wb.Sheets[sheetName] = newSheet;

  XLSX.writeFile(wb, FILE_PATH);

  console.log("");
  console.log(`Matched: ${matched}`);
  console.log(`Unmatched: ${unmatched.length}`);
  if (unmatched.length) {
    console.log("");
    console.log("Unmatched models:");
    for (const u of unmatched) console.log("  - " + u);
  }
  console.log("");
  console.log(`Wrote: ${FILE_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
