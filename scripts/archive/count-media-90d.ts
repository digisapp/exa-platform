import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("/Users/examodels/Desktop/exa-platform/.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { count: total } = await supabase
    .from("media_contacts")
    .select("*", { count: "exact", head: true });

  const { count: c90 } = await supabase
    .from("media_contacts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", ninetyDaysAgo.toISOString());

  const { count: c30 } = await supabase
    .from("media_contacts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo.toISOString());

  const { count: c7 } = await supabase
    .from("media_contacts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString());

  // status breakdown last 90d
  const { data: byStatus } = await supabase
    .from("media_contacts")
    .select("status, created_at")
    .gte("created_at", ninetyDaysAgo.toISOString());

  const statusCounts: Record<string, number> = {};
  for (const r of byStatus ?? []) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }

  console.log(`Total in media_contacts:        ${total}`);
  console.log(`Last 90 days  (since ${ninetyDaysAgo.toISOString().slice(0, 10)}): ${c90}`);
  console.log(`Last 30 days  (since ${thirtyDaysAgo.toISOString().slice(0, 10)}): ${c30}`);
  console.log(`Last 7 days   (since ${sevenDaysAgo.toISOString().slice(0, 10)}): ${c7}`);
  console.log(`\nStatus breakdown (last 90d):`);
  for (const [k, v] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
