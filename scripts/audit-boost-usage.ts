/**
 * One-off: measure EXA Boost usage to decide keep vs delete.
 * - votes: total / last 30d / last 7d, free vs paid, unique voters
 * - sessions: total / last 30d, anon vs logged-in
 * - coins spent on boosts (ledger), all time / last 30d
 * - leaderboard: models with any points
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
const d7 = new Date(Date.now() - 7 * 864e5).toISOString();

async function count(table: string, mod?: (q: any) => any) {
  let q: any = supabase.from(table).select("id", { count: "exact", head: true });
  if (mod) q = mod(q);
  const { count: c, error } = await q;
  if (error) return `ERR: ${error.message}`;
  return c ?? 0;
}

async function main() {
  console.log("=== top_model_votes ===");
  console.log("all time:", await count("top_model_votes"));
  console.log("last 30d:", await count("top_model_votes", (q) => q.gte("created_at", d30)));
  console.log("last 7d:", await count("top_model_votes", (q) => q.gte("created_at", d7)));
  console.log("paid (is_boosted) all time:", await count("top_model_votes", (q) => q.eq("is_boosted", true)));
  console.log("paid last 30d:", await count("top_model_votes", (q) => q.eq("is_boosted", true).gte("created_at", d30)));

  const { data: voters } = await supabase
    .from("top_model_votes")
    .select("voter_id, created_at")
    .not("voter_id", "is", null);
  const uniqAll = new Set((voters || []).map((v: any) => v.voter_id));
  const uniq30 = new Set((voters || []).filter((v: any) => v.created_at >= d30).map((v: any) => v.voter_id));
  console.log("unique logged-in voters all time:", uniqAll.size, "| last 30d:", uniq30.size);

  console.log("\n=== top_model_sessions ===");
  console.log("all time:", await count("top_model_sessions"));
  console.log("last 30d:", await count("top_model_sessions", (q) => q.gte("created_at", d30)));
  console.log("last 7d:", await count("top_model_sessions", (q) => q.gte("created_at", d7)));

  console.log("\n=== coin ledger (boost spend) ===");
  const { data: tx, error: txErr } = await supabase
    .from("coin_transactions")
    .select("amount, action, created_at")
    .ilike("action", "%boost%");
  if (txErr) {
    console.log("ledger ERR:", txErr.message);
  } else {
    const all = (tx || []).filter((t: any) => t.amount < 0);
    const last30 = all.filter((t: any) => t.created_at >= d30);
    const sum = (a: any[]) => a.reduce((s, t) => s + Math.abs(t.amount), 0);
    console.log(`boost spends all time: ${all.length} tx, ${sum(all)} coins ($${(sum(all) * 0.1).toFixed(2)})`);
    console.log(`boost spends last 30d: ${last30.length} tx, ${sum(last30)} coins ($${(sum(last30) * 0.1).toFixed(2)})`);
    const actions = [...new Set((tx || []).map((t: any) => t.action))];
    console.log("boost-ish actions seen:", actions.join(", "));
  }

  console.log("\n=== leaderboard ===");
  console.log("models with total_points > 0:", await count("top_model_leaderboard", (q) => q.gt("total_points", 0)));
  console.log("models with week_points > 0:", await count("top_model_leaderboard", (q) => q.gt("week_points", 0)));

  const { data: top } = await supabase
    .from("top_model_leaderboard")
    .select("model_id, total_points, week_points")
    .order("total_points", { ascending: false })
    .limit(5);
  console.log("top 5 by total_points:", JSON.stringify(top));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
