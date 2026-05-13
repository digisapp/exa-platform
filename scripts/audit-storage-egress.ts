/**
 * READ-ONLY audit of Supabase Storage to surface egress culprits.
 *
 * Uses the Storage API (recursive list) to enumerate every object with its
 * size, then aggregates. No mutations.
 *
 * Run: npx tsx scripts/audit-storage-egress.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

type ObjInfo = { path: string; size: number; createdAt: string | null; updatedAt: string | null };

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

const sectionRule = (label: string) => {
  console.log("\n" + "═".repeat(80));
  console.log(`  ${label}`);
  console.log("═".repeat(80));
};

async function listAllInBucket(bucket: string): Promise<ObjInfo[]> {
  const out: ObjInfo[] = [];
  // BFS over folders. The storage API's list() returns both files and folders
  // (folders have null id, files have non-null id).
  const stack: string[] = [""];
  let pagesFetched = 0;
  while (stack.length > 0) {
    const prefix = stack.pop()!;
    let offset = 0;
    const limit = 1000;
    for (;;) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
      if (error) {
        console.error(`  list(${bucket}, "${prefix}", offset=${offset}) -> ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;
      pagesFetched++;
      if (pagesFetched % 50 === 0) {
        process.stderr.write(`  [${bucket}] ${pagesFetched} pages, ${out.length} files so far\n`);
      }
      for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        // Folder: id === null
        if (item.id === null) {
          stack.push(fullPath);
        } else {
          out.push({
            path: fullPath,
            size: Number((item.metadata as any)?.size) || 0,
            createdAt: item.created_at ?? null,
            updatedAt: item.updated_at ?? null,
          });
        }
      }
      if (data.length < limit) break;
      offset += limit;
    }
  }
  return out;
}

async function getBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  return data ?? [];
}

function topDirs(objs: ObjInfo[], depth: number) {
  const map = new Map<string, { bytes: number; count: number }>();
  for (const o of objs) {
    const parts = o.path.split("/");
    const key = parts.slice(0, depth).join("/") || "(root)";
    const cur = map.get(key) ?? { bytes: 0, count: 0 };
    cur.bytes += o.size;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([dir, v]) => ({ dir, ...v }))
    .sort((a, b) => b.bytes - a.bytes);
}

async function main() {
  const buckets = await getBuckets();
  console.log(`Found ${buckets.length} buckets`);

  // Phase 1: bucket totals
  const bucketStats: Array<{ bucket: string; public: boolean; objs: ObjInfo[] }> = [];
  for (const b of buckets) {
    process.stderr.write(`\nScanning bucket "${b.name}" (public=${b.public})...\n`);
    try {
      const objs = await listAllInBucket(b.name);
      bucketStats.push({ bucket: b.name, public: !!b.public, objs });
      process.stderr.write(`  done: ${objs.length} files, ${fmtBytes(objs.reduce((s, o) => s + o.size, 0))}\n`);
    } catch (e: any) {
      console.error(`  FAILED ${b.name}: ${e.message}`);
    }
  }

  sectionRule("BUCKET TOTALS");
  const summary = bucketStats
    .map((b) => ({
      bucket: b.bucket,
      public: b.public,
      files: b.objs.length,
      bytes: b.objs.reduce((s, o) => s + o.size, 0),
    }))
    .sort((a, b) => b.bytes - a.bytes);
  console.log(
    `${"bucket".padEnd(22)} ${"public".padEnd(8)} ${"files".padStart(7)}  ${"total".padStart(11)}`,
  );
  for (const r of summary) {
    console.log(
      `${r.bucket.padEnd(22)} ${(r.public ? "yes" : "no").padEnd(8)} ${String(r.files).padStart(7)}  ${fmtBytes(r.bytes).padStart(11)}`,
    );
  }
  const grandTotal = summary.reduce((s, r) => s + r.bytes, 0);
  console.log(`${" ".repeat(22)} ${" ".repeat(8)} ${" ".padStart(7)}  ${fmtBytes(grandTotal).padStart(11)}  (total on disk)`);

  // Phase 2: per-bucket drill (any bucket with > 100 MB)
  for (const b of bucketStats) {
    const total = b.objs.reduce((s, o) => s + o.size, 0);
    if (total < 100 * 1024 * 1024) continue;

    sectionRule(`"${b.bucket}" — top-level folders by size`);
    const dirs1 = topDirs(b.objs, 1);
    console.log(`${"folder".padEnd(40)} ${"files".padStart(7)}  ${"size".padStart(11)}`);
    for (const d of dirs1.slice(0, 20)) {
      console.log(`${d.dir.padEnd(40)} ${String(d.count).padStart(7)}  ${fmtBytes(d.bytes).padStart(11)}`);
    }

    // If a top folder is huge, drill one level deeper
    const huge = dirs1.filter((d) => d.bytes > 5 * 1024 * 1024 * 1024); // > 5 GB
    if (huge.length > 0) {
      sectionRule(`"${b.bucket}" — depth-2 breakdown for folders > 5 GB`);
      for (const h of huge) {
        const subset = b.objs.filter((o) => o.path.startsWith(h.dir + "/"));
        const dirs2 = topDirs(subset, 2);
        console.log(`\n  ${h.dir}/  (${fmtBytes(h.bytes)}, ${h.count} files)`);
        for (const d of dirs2.slice(0, 10)) {
          console.log(`    ${d.dir.padEnd(50)} ${String(d.count).padStart(6)}  ${fmtBytes(d.bytes).padStart(11)}`);
        }
      }
    }

    sectionRule(`"${b.bucket}" — top 30 largest objects`);
    const top = [...b.objs].sort((a, b) => b.size - a.size).slice(0, 30);
    for (const t of top) {
      console.log(`  ${fmtBytes(t.size).padStart(10)}  ${t.path}`);
    }

    const videos = b.objs.filter((o) =>
      /\.(mp4|mov|webm|m4v)$/i.test(o.path),
    );
    if (videos.length > 0) {
      const vidBytes = videos.reduce((s, v) => s + v.size, 0);
      sectionRule(`"${b.bucket}" — ${videos.length} videos, ${fmtBytes(vidBytes)} total`);
      const topVid = [...videos].sort((a, b) => b.size - a.size).slice(0, 20);
      for (const v of topVid) {
        console.log(`  ${fmtBytes(v.size).padStart(10)}  ${v.path}`);
      }
    }
  }

  sectionRule("DONE — read-only");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
