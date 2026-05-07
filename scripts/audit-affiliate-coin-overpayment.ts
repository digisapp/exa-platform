/**
 * Audit the 10× overpayment bug in EXA-platform affiliate commission coin credits.
 *
 * Bug: src/app/api/webhooks/stripe/handlers/checkout.ts (processAffiliateCommission)
 * credits `commissionCents` directly via `add_coins(p_amount=...)`. Coins are
 * worth $0.10 each (1 coin = 10 cents), so the call credits 10× the intended
 * coin amount. Symptom: a $20 commission ($2,000 cents) credits 2,000 coins
 * ($200 cashout) instead of 200 coins ($20 cashout).
 *
 * This audit only READS — it does not modify any wallet balances.
 *
 * Note on /api/affiliate/commission (postback receiver): that endpoint records
 * an affiliate_commissions row but does NOT credit coins. So affiliate sales
 * driven from digis.cc → exa-platform are stored as cents-only commissions
 * (correct) and are NOT affected by this bug.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const COIN_USD = 0.1;
const fmt = (n: number) => n.toLocaleString();
const usd = (coins: number) => `$${(coins * COIN_USD).toFixed(2)}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: rows, error } = await supabase
    .from("coin_transactions")
    .select("id, actor_id, amount, action, metadata, created_at")
    .eq("action", "affiliate_commission")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Audit query failed:", error);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No affiliate_commission coin transactions found. Nothing to fix.");
    return;
  }

  // Pull actor names for display (best-effort)
  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const { data: actors } = await supabase
    .from("models")
    .select("id, display_name, instagram_handle, email")
    .in("id", actorIds);
  const actorMap = new Map(actors?.map((a) => [a.id, a]) ?? []);

  // Pull current coin balances
  const { data: balances } = await supabase
    .from("models")
    .select("id, coin_balance")
    .in("id", actorIds);
  const balanceMap = new Map(balances?.map((b) => [b.id, b.coin_balance ?? 0]) ?? []);

  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(" AFFECTED affiliate_commission TRANSACTIONS");
  console.log("═══════════════════════════════════════════════════════════════════════");

  type Affected = {
    id: string;
    actorId: string;
    name: string;
    amount: number;
    correct: number;
    overpayment: number;
    saleAmountCents: number | null;
    commissionCents: number | null;
    createdAt: string | null;
  };

  const affected: Affected[] = [];
  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const commissionCents = typeof meta.commission_cents === "number" ? (meta.commission_cents as number) : null;
    const saleAmountCents = typeof meta.sale_amount_cents === "number" ? (meta.sale_amount_cents as number) : null;
    // The original credit treated cents as coins. Correct coin amount = floor(amount/10)
    const correct = Math.floor(r.amount / 10);
    const overpayment = r.amount - correct;
    const a = actorMap.get(r.actor_id);
    const name = a ? `${a.display_name ?? a.instagram_handle ?? "(no name)"} <${a.email ?? "no email"}>` : `actor ${r.actor_id.slice(0, 8)}`;

    affected.push({
      id: r.id,
      actorId: r.actor_id,
      name,
      amount: r.amount,
      correct,
      overpayment,
      saleAmountCents,
      commissionCents,
      createdAt: r.created_at,
    });

    console.log();
    console.log(`  tx_id:        ${r.id}`);
    console.log(`  actor:        ${name}`);
    console.log(`  created:      ${r.created_at}`);
    console.log(`  sale cents:   ${saleAmountCents !== null ? fmt(saleAmountCents) + " cents ($" + (saleAmountCents / 100).toFixed(2) + ")" : "(unknown)"}`);
    console.log(`  comm. cents:  ${commissionCents !== null ? fmt(commissionCents) + " cents ($" + (commissionCents / 100).toFixed(2) + ")" : "(unknown)"}`);
    console.log(`  credited:     ${fmt(r.amount)} coins  (${usd(r.amount)} cashout)`);
    console.log(`  should be:    ${fmt(correct)} coins   (${usd(correct)} cashout)`);
    console.log(`  OVERPAID BY:  ${fmt(overpayment)} coins   (${usd(overpayment)} cashout)`);
  }

  // Per-actor summary
  console.log();
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(" PER-ACTOR SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════════");
  const byActor = new Map<string, { name: string; balance: number; txs: number; credited: number; correct: number; overpayment: number }>();
  for (const a of affected) {
    const v = byActor.get(a.actorId) ?? {
      name: a.name,
      balance: balanceMap.get(a.actorId) ?? 0,
      txs: 0,
      credited: 0,
      correct: 0,
      overpayment: 0,
    };
    v.txs++;
    v.credited += a.amount;
    v.correct += a.correct;
    v.overpayment += a.overpayment;
    byActor.set(a.actorId, v);
  }
  for (const [actorId, v] of [...byActor.entries()].sort((x, y) => y[1].overpayment - x[1].overpayment)) {
    console.log();
    console.log(`  ${v.name}`);
    console.log(`    actor_id:          ${actorId}`);
    console.log(`    affected txs:      ${v.txs}`);
    console.log(`    current balance:   ${fmt(v.balance)} coins  (${usd(v.balance)})`);
    console.log(`    total credited:    ${fmt(v.credited)} coins  (${usd(v.credited)})`);
    console.log(`    should have been:  ${fmt(v.correct)} coins   (${usd(v.correct)})`);
    console.log(`    OVERPAID BY:       ${fmt(v.overpayment)} coins  (${usd(v.overpayment)} cashout)`);
  }

  // Grand totals
  const grandCredited = affected.reduce((s, a) => s + a.amount, 0);
  const grandCorrect = affected.reduce((s, a) => s + a.correct, 0);
  const grandOverpayment = affected.reduce((s, a) => s + a.overpayment, 0);

  console.log();
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(" GRAND TOTAL");
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log(`  affected txs:       ${affected.length}`);
  console.log(`  affected actors:    ${byActor.size}`);
  console.log(`  total credited:     ${fmt(grandCredited)} coins  (${usd(grandCredited)})`);
  console.log(`  should have been:   ${fmt(grandCorrect)} coins   (${usd(grandCorrect)})`);
  console.log(`  TOTAL OVERPAYMENT:  ${fmt(grandOverpayment)} coins  (${usd(grandOverpayment)} cashout)`);
  console.log("═══════════════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
