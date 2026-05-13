/**
 * Deeper read-only drill-down on findings from audit-storage-egress.ts:
 *   - List ALL files in the small `examodels` bucket (likely hero videos)
 *   - Hunt for the hardcoded swimcrown / travel video paths in portfolio
 *   - Break down the giant `flyers/` folder in portfolio
 *   - Check whether `profile-pictures` bucket (142 MB, no code refs) is dead
 *   - Show the date range of `profile-pictures` — is anything still writing?
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

const rule = (s: string) => {
  console.log("\n" + "═".repeat(80));
  console.log("  " + s);
  console.log("═".repeat(80));
};

async function listRecursive(bucket: string, prefix = "") {
  const out: { path: string; size: number; createdAt: string | null; updatedAt: string | null }[] = [];
  const stack = [prefix];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(cur, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error || !data || data.length === 0) break;
      for (const item of data) {
        const full = cur ? `${cur}/${item.name}` : item.name;
        if (item.id === null) stack.push(full);
        else {
          out.push({
            path: full,
            size: Number((item.metadata as any)?.size) || 0,
            createdAt: item.created_at ?? null,
            updatedAt: item.updated_at ?? null,
          });
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return out;
}

async function main() {
  // 1. examodels bucket - tiny, list everything
  rule(`"examodels" bucket — every file`);
  const exa = await listRecursive("examodels");
  for (const f of exa.sort((a, b) => b.size - a.size)) {
    console.log(`  ${fmtBytes(f.size).padStart(10)}  ${f.path}  (created ${f.createdAt})`);
  }

  // 2. Hardcoded hero video paths from code audit
  rule(`Searching portfolio bucket for hardcoded hero video paths`);
  // These are referenced in src/app/(public)/swimcrown/page.tsx and travel/page.tsx
  const hardcodedPrefixes = ["swimcrown", "examodels/travel"];
  for (const pfx of hardcodedPrefixes) {
    const files = await listRecursive("portfolio", pfx);
    if (files.length === 0) {
      console.log(`  (no files under portfolio/${pfx})`);
      continue;
    }
    console.log(`\n  portfolio/${pfx}/  (${files.length} files)`);
    let total = 0;
    for (const f of files.sort((a, b) => b.size - a.size)) {
      total += f.size;
      console.log(`    ${fmtBytes(f.size).padStart(10)}  ${f.path}`);
    }
    console.log(`    ${"─".repeat(48)}`);
    console.log(`    ${fmtBytes(total).padStart(10)}  TOTAL`);
  }

  // 3. flyers/ breakdown (1.10 GB in portfolio bucket)
  rule(`"portfolio/flyers/" breakdown — 1.10 GB in this folder`);
  const flyers = await listRecursive("portfolio", "flyers");
  const byEvent = new Map<string, { bytes: number; count: number }>();
  for (const f of flyers) {
    const parts = f.path.split("/");
    const event = parts[1] || "(root)";
    const cur = byEvent.get(event) ?? { bytes: 0, count: 0 };
    cur.bytes += f.size;
    cur.count += 1;
    byEvent.set(event, cur);
  }
  console.log(`Total flyers: ${flyers.length} files, ${fmtBytes(flyers.reduce((s, f) => s + f.size, 0))}`);
  console.log(`\nBy event slug:`);
  console.log(`${"event".padEnd(38)} ${"files".padStart(6)}  ${"size".padStart(11)}`);
  for (const [evt, v] of Array.from(byEvent.entries()).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`${evt.padEnd(38)} ${String(v.count).padStart(6)}  ${fmtBytes(v.bytes).padStart(11)}`);
  }

  // 4. profile-pictures bucket — is it still being written to?
  rule(`"profile-pictures" bucket — date range (is it abandoned?)`);
  const pp = await listRecursive("profile-pictures");
  const dates = pp.map((f) => f.createdAt).filter(Boolean).sort();
  if (dates.length > 0) {
    console.log(`  Files: ${pp.length}`);
    console.log(`  Oldest: ${dates[0]}`);
    console.log(`  Newest: ${dates[dates.length - 1]}`);
    const daysSinceNew =
      (Date.now() - new Date(dates[dates.length - 1]!).getTime()) / (1000 * 60 * 60 * 24);
    console.log(`  Days since newest file: ${daysSinceNew.toFixed(0)}`);
  }

  // 5. ai-studio breakdown — `upsert: true` means versions stack up
  rule(`"portfolio/ai-studio/" — every file (we use upsert:true, may have stacked versions)`);
  const aiStudio = await listRecursive("portfolio", "ai-studio");
  console.log(`Total: ${aiStudio.length} files, ${fmtBytes(aiStudio.reduce((s, f) => s + f.size, 0))}`);
  // Group by file type and prefix
  const aiByPrefix = new Map<string, { bytes: number; count: number }>();
  for (const f of aiStudio) {
    const filename = f.path.split("/").pop() || "";
    const m = filename.match(/^([a-z]+(?:-[a-z]+)*)/i);
    const prefix = m ? m[1] : "(other)";
    const cur = aiByPrefix.get(prefix) ?? { bytes: 0, count: 0 };
    cur.bytes += f.size;
    cur.count += 1;
    aiByPrefix.set(prefix, cur);
  }
  console.log(`\nBy filename prefix:`);
  for (const [p, v] of Array.from(aiByPrefix.entries()).sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${p.padEnd(20)} ${String(v.count).padStart(5)}  ${fmtBytes(v.bytes).padStart(11)}`);
  }

  // 6. Per-model portfolio totals — top 10 biggest model folders
  rule(`Top 10 model folders in portfolio (excluding flyers/ai-studio/system folders)`);
  const allPortfolio = await listRecursive("portfolio");
  const modelTotals = new Map<string, { bytes: number; count: number; videoBytes: number; videoCount: number }>();
  const SKIP_PREFIXES = new Set(["flyers", "ai-studio", "examodels", "swimcrown", "content-library", "deliveries", "admin-upload", "premium"]);
  for (const f of allPortfolio) {
    const top = f.path.split("/")[0];
    if (SKIP_PREFIXES.has(top)) continue;
    // Only UUID-shaped folders look like model IDs
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(top)) continue;
    const cur = modelTotals.get(top) ?? { bytes: 0, count: 0, videoBytes: 0, videoCount: 0 };
    cur.bytes += f.size;
    cur.count += 1;
    if (/\.(mp4|mov|webm|m4v)$/i.test(f.path)) {
      cur.videoBytes += f.size;
      cur.videoCount += 1;
    }
    modelTotals.set(top, cur);
  }

  const top10Models = Array.from(modelTotals.entries())
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 10);

  // Look up model names for these
  const modelIds = top10Models.map(([id]) => id);
  const { data: actors } = await supabase
    .from("actors")
    .select("id, display_name")
    .in("id", modelIds);
  const nameOf = new Map((actors ?? []).map((a: any) => [a.id, a.display_name]));

  console.log(`${"actor id".padEnd(38)} ${"name".padEnd(25)} ${"files".padStart(5)} ${"vids".padStart(4)} ${"size".padStart(10)} ${"vid bytes".padStart(10)}`);
  for (const [id, v] of top10Models) {
    const name = (nameOf.get(id) || "(unknown)").slice(0, 23);
    console.log(`${id.padEnd(38)} ${name.padEnd(25)} ${String(v.count).padStart(5)} ${String(v.videoCount).padStart(4)} ${fmtBytes(v.bytes).padStart(10)} ${fmtBytes(v.videoBytes).padStart(10)}`);
  }

  rule("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
