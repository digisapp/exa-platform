/**
 * Read-only investigation of the 6 "orphan" Stripe sessions.
 * Goal: distinguish real orphans (no DB row at all) from session-id mismatches
 * (DB row exists under a different session_id).
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-09-30.clover" as any });

const ORPHANS = [
  { email: "angeladong123@yahoo.com",     session: "cs_live_a19am6d93NHbpLUZOfG2s16VXfo3lQ0hmxhGNUMmjhgVJf5mBwiNEBex4o" },
  { email: "shoultsavary@gmail.com",      session: "cs_live_a1uVIX9bLEoCNuPpRYWqlUq9DTolKoHTMZgtMY3RpY92ankBtLPa2NKqOc" },
  { email: "chelseajenks@hotmail.co.uk",  session: "cs_live_a1qngzX443d6fyBEmkYFvhmr4HUULPXnEqVze7182KRueuJzfG116CDStF" },
  { email: "jessicatomas2709@gmail.com",  session: "cs_live_a1LYDYecD3EYTYrqHnG3gh0s6vxJXAtBDUucbzukOl9ycu0QR6lCdMuSfT" },
  { email: "kamccall00@gmail.com",        session: "cs_live_a14ALXeHhdcY8ybU1ik9EIDodxzFRm4oRpWJLZKx24iZu5IkotriPFZDRc" },
  { email: "kendallp127@icloud.com",      session: "cs_live_a1sUC7z1JBPL8pk0XI2n3eqBaeFI8VPa6ZAuelPkQmzkAQbCDQBWjzGM03" },
];

async function main() {
  for (const o of ORPHANS) {
    console.log(`\n=== ${o.email} ===`);

    // Stripe session details
    const s = await stripe.checkout.sessions.retrieve(o.session, { expand: ["payment_intent", "payment_intent.latest_charge"] });
    console.log(`  Stripe session:`);
    console.log(`    created_at:    ${new Date((s.created ?? 0) * 1000).toISOString()}`);
    console.log(`    payment_status: ${s.payment_status}`);
    console.log(`    amount_total:   $${((s.amount_total ?? 0) / 100).toFixed(2)}`);
    console.log(`    customer_email: ${s.customer_details?.email ?? "(none)"}`);
    console.log(`    metadata.workshop_id: ${s.metadata?.workshop_id ?? "(none)"}`);

    // Any registration in DB by email
    const { data: byEmail } = await supabase
      .from("workshop_registrations")
      .select("id, buyer_email, buyer_name, status, payment_type, total_price_cents, stripe_checkout_session_id, stripe_payment_intent_id, created_at, completed_at")
      .ilike("buyer_email", o.email)
      .order("created_at", { ascending: false });
    console.log(`  DB rows for ${o.email}: ${byEmail?.length ?? 0}`);
    for (const r of byEmail ?? []) {
      console.log(`    ${r.id} | status=${r.status} | session=${r.stripe_checkout_session_id} | created=${r.created_at}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
