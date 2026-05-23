/**
 * Export MSW model availability to a CSV for Google Sheets.
 *
 * Columns: Name | Instagram (clickable) | Instagram Followers
 *          | Tue 5/26 | Wed 5/27 | Thu 5/28 | Fri 5/29 | Sat 5/30 | Sun 5/31
 *          | Days Available | Available Dates
 *
 * Output: /Users/examodels/Desktop/MSW Model Availability.csv
 *
 * Usage: npx tsx scripts/export-msw-availability.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const MSW_GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0";
const OUT_PATH = "/Users/examodels/Desktop/MSW Model Availability.csv";

const MSW_DAYS = [
  { date: "2026-05-26", label: "Tue 5/26" },
  { date: "2026-05-27", label: "Wed 5/27" },
  { date: "2026-05-28", label: "Thu 5/28" },
  { date: "2026-05-29", label: "Fri 5/29" },
  { date: "2026-05-30", label: "Sat 5/30" },
  { date: "2026-05-31", label: "Sun 5/31" },
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function hyperlinkCell(url: string): string {
  if (!url) return "";
  const inner = `=HYPERLINK("${url}","${url}")`;
  return '"' + inner.replace(/"/g, '""') + '"';
}

function titleCase(raw: string): string {
  if (!raw) return "";
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

async function main() {
  // 1. All accepted MSW applications
  const { data: apps, error: appsErr } = await supabase
    .from("gig_applications")
    .select("model_id")
    .eq("gig_id", MSW_GIG_ID)
    .eq("status", "accepted");
  if (appsErr) { console.error(appsErr); process.exit(1); }

  const modelIds = (apps ?? []).map((a: any) => a.model_id);
  console.log(`Accepted MSW models: ${modelIds.length}`);

  // 2. Fetch model details
  const models: any[] = [];
  for (let i = 0; i < modelIds.length; i += 200) {
    const batch = modelIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("models")
      .select("id, first_name, last_name, username, instagram_url, instagram_name, instagram_followers")
      .in("id", batch);
    if (error) { console.error(error); process.exit(1); }
    models.push(...(data ?? []));
  }

  // 3. Availability rows for the gig
  const { data: availability, error: availErr } = await supabase
    .from("gig_availability")
    .select("model_id, available_date")
    .eq("gig_id", MSW_GIG_ID);
  if (availErr) { console.error(availErr); process.exit(1); }

  const availMap: Record<string, Set<string>> = {};
  for (const row of availability ?? []) {
    const r = row as any;
    if (!availMap[r.model_id]) availMap[r.model_id] = new Set();
    availMap[r.model_id].add(r.available_date);
  }

  // 4. Build rows
  type OutRow = {
    name: string;
    igUrl: string;
    igFollowers: number | null;
    days: boolean[];
    daysCount: number;
    availableLabels: string;
    hasResponded: boolean;
  };

  const rows: OutRow[] = models.map((m: any) => {
    const fullName =
      [m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
      m.username ||
      "";
    const dates = availMap[m.id] ?? new Set<string>();
    const days = MSW_DAYS.map(d => dates.has(d.date));
    const availableLabels = MSW_DAYS
      .filter(d => dates.has(d.date))
      .map(d => d.label)
      .join(", ");

    // Prefer instagram_url; fall back to building one from instagram_name (handle).
    let igUrl = (m.instagram_url ?? "").trim();
    if (!igUrl && m.instagram_name) {
      const handle = String(m.instagram_name).trim().replace(/^@+/, "");
      if (handle) igUrl = `https://www.instagram.com/${handle.toLowerCase()}`;
    }

    return {
      name: titleCase(fullName),
      igUrl,
      igFollowers: m.instagram_followers,
      days,
      daysCount: days.filter(Boolean).length,
      availableLabels,
      hasResponded: dates.size > 0,
    };
  });

  // 5. Sort: responded first by days desc, then unresponded; ties by name
  rows.sort((a, b) => {
    if (a.hasResponded !== b.hasResponded) return a.hasResponded ? -1 : 1;
    if (a.daysCount !== b.daysCount) return b.daysCount - a.daysCount;
    return a.name.localeCompare(b.name);
  });

  // 6. Write CSV
  const header = [
    "Name",
    "Instagram",
    "Instagram Followers",
    ...MSW_DAYS.map(d => d.label),
    "Days Available",
    "Available Dates",
    "Status",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push([
      csvEscape(r.name),
      hyperlinkCell(r.igUrl),
      csvEscape(r.igFollowers ?? ""),
      ...r.days.map(b => (b ? "Y" : "")),
      csvEscape(r.daysCount),
      csvEscape(r.availableLabels),
      csvEscape(r.hasResponded ? "Responded" : "No Response"),
    ].join(","));
  }

  writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf-8");

  const responded = rows.filter(r => r.hasResponded).length;
  console.log("");
  console.log(`Wrote ${rows.length} rows to ${OUT_PATH}`);
  console.log(`  Responded: ${responded}`);
  console.log(`  No response: ${rows.length - responded}`);
}

main().catch(e => { console.error(e); process.exit(1); });
