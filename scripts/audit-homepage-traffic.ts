/**
 * One-off: where does site traffic actually land? (last 30d, page_views)
 * Decides whether homepage Boost placement is worth anything.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const d30 = new Date(Date.now() - 30 * 864e5).toISOString();

async function main() {
  const pageSize = 1000;
  let from = 0;
  const rows: any[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("page_views")
      .select("page_type, page_path, visitor_id, user_id, created_at")
      .gte("created_at", d30)
      .range(from, from + pageSize - 1);
    if (error) { console.error("ERR", error.message); break; }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  console.log("total page_views last 30d:", rows.length);

  const byType = new Map<string, { views: number; uniq: Set<string> }>();
  for (const r of rows) {
    const t = r.page_type || "unknown";
    if (!byType.has(t)) byType.set(t, { views: 0, uniq: new Set() });
    const e = byType.get(t)!;
    e.views++;
    e.uniq.add(r.visitor_id || r.user_id || "?");
  }
  const sorted = [...byType.entries()].sort((a, b) => b[1].views - a[1].views);
  console.log("\npage_type | views | unique visitors");
  for (const [t, e] of sorted.slice(0, 15)) {
    console.log(`${t} | ${e.views} | ${e.uniq.size}`);
  }

  const home = rows.filter((r) => r.page_type === "home");
  const homeAnon = home.filter((r) => !r.user_id);
  console.log(`\nhome views: ${home.length} (anon: ${homeAnon.length})`);
  const boost = rows.filter((r) => r.page_path?.startsWith("/boost"));
  console.log(`boost page views last 30d: ${boost.length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
