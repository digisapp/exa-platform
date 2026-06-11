/**
 * Reconcile paid models with Stripe.
 *
 *  - Lists all Stripe Checkout Sessions since 2026-01-01 with metadata.type in
 *    { workshop_registration, model_onboarding } and payment_status="paid".
 *  - For onboarding split plans, also lists Stripe subscriptions with
 *    metadata.type="model_onboarding".
 *  - Joins back to the DB rows by stripe_checkout_session_id.
 *  - Reports:
 *      * Orphan Stripe sessions (paid, no DB row)
 *      * DB rows whose Stripe payment is refunded / disputed
 *      * Cardholder name when it differs from buyer name (e.g. parent paid)
 *      * Actual #invoices paid for split-plan subscriptions
 *  - Writes Paid Models Roster (Stripe-verified).csv to the Desktop.
 *
 * Usage: npx tsx scripts/reconcile-paid-models-stripe.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const OUT_PATH = "/Users/examodels/Desktop/Paid Models Roster.csv";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-09-30.clover" as any });

// 2026-01-01 — both products launched after this
const SINCE_TS = Math.floor(new Date("2026-01-01").getTime() / 1000);

type CombinedRow = {
  product: string;             // "Runway Workshop" | "Model Onboarding"
  workshopTitle: string;       // specific workshop, for runway rows
  source: string;              // "DB+Stripe" | "DB-only" | "Stripe-only"
  name: string;
  email: string;
  igUrl: string;
  cardholderName: string;      // from Stripe (may be a parent)
  paid: string;                // human-readable
  paidCents: number;
  status: string;              // synthesized state
  stripeSessionId: string;
  stripeNotes: string;         // refund / dispute / orphan / etc.
  createdAt: string;
};

function extractHandle(raw: string | null | undefined): string {
  if (!raw) return "";
  let h = raw.trim().replace(/^@/, "");
  h = h.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^instagram\.com\//i, "");
  h = h.replace(/[\/?#].*$/, "");
  return h.toLowerCase();
}
const normalizeIgUrl = (h: string) => h ? `https://www.instagram.com/${h}` : "";
function titleCase(raw: string): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().split(/\s+/).map(w =>
    w.split(/(['\-.])/).map(p =>
      /^['\-.]$/.test(p) || !p ? p : p.charAt(0).toUpperCase() + p.slice(1)
    ).join("")
  ).join(" ");
}
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
const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

function namesLookSame(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s,.\-']+/g, " ").trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return true;
  if (na === nb) return true;
  // One is substring of the other (e.g. "joe smith" vs "joe a smith") -> likely same
  const aTokens = na.split(" ");
  const bTokens = nb.split(" ");
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  // If first AND last tokens both match, same person with middle name variation
  if (aTokens[0] === bTokens[0] && aTokens[aTokens.length - 1] === bTokens[bTokens.length - 1]) return true;
  // If 75%+ of tokens overlap, treat as same
  const overlap = aTokens.filter(t => bSet.has(t)).length;
  const minLen = Math.min(aTokens.length, bTokens.length);
  if (minLen >= 2 && overlap / minLen >= 0.75) return true;
  return false;
}

async function main() {
  // ---------------------------------------------------------------
  // 1. Pull DB rows
  // ---------------------------------------------------------------
  // All $350 runway workshops (there are 3: runway-workshop, 3-month-runway-coaching, miami-swim-week-runway-training)
  const { data: workshops } = await supabase
    .from("workshops").select("id, slug, title, price_cents").eq("price_cents", 35000);
  if (!workshops || workshops.length === 0) { console.error("No $350 workshops found"); process.exit(1); }
  const workshopById = new Map(workshops.map(w => [w.id, w]));
  const workshopIds = workshops.map(w => w.id);
  console.log(`$350 workshops: ${workshops.map(w => w.title).join(" | ")}`);

  const { data: wRegs } = await supabase
    .from("workshop_registrations")
    .select("id, workshop_id, buyer_email, buyer_name, status, payment_type, unit_price_cents, total_price_cents, quantity, installments_paid, installments_total, stripe_checkout_session_id, created_at")
    .in("workshop_id", workshopIds);

  const { data: obBookings } = await (supabase as any)
    .from("model_onboarding_bookings")
    .select("id, name, email, instagram, status, payment_plan, payments_completed, amount_cents, stripe_session_id, stripe_subscription_id, created_at");

  console.log(`DB workshop_registrations: ${wRegs?.length ?? 0}`);
  console.log(`DB model_onboarding_bookings: ${obBookings?.length ?? 0}`);

  // ---------------------------------------------------------------
  // 2. Pull all Stripe Checkout Sessions since 2026-01-01
  // ---------------------------------------------------------------
  console.log("Listing Stripe Checkout Sessions since 2026-01-01...");
  const sessions: Stripe.Checkout.Session[] = [];
  for await (const s of stripe.checkout.sessions.list({
    created: { gte: SINCE_TS },
    limit: 100,
    expand: ["data.payment_intent", "data.payment_intent.latest_charge"],
  })) {
    const type = s.metadata?.type;
    if (type === "workshop_registration" || type === "model_onboarding") {
      sessions.push(s);
    }
  }
  console.log(`  Found ${sessions.length} Stripe sessions for our two products`);

  // Index sessions by ID
  const stripeBySessionId = new Map<string, Stripe.Checkout.Session>();
  for (const s of sessions) stripeBySessionId.set(s.id, s);

  // ---------------------------------------------------------------
  // 3. Pull Stripe subscriptions for onboarding split plans
  // ---------------------------------------------------------------
  console.log("Listing Stripe subscriptions for onboarding split plans...");
  const subsBySubId = new Map<string, Stripe.Subscription>();
  for await (const sub of stripe.subscriptions.list({
    created: { gte: SINCE_TS },
    limit: 100,
    status: "all",
  })) {
    if (sub.metadata?.type === "model_onboarding") {
      subsBySubId.set(sub.id, sub);
    }
  }
  console.log(`  Found ${subsBySubId.size} onboarding subscriptions`);

  // For each subscription, count successfully-paid invoices
  const paidInvoicesBySubId = new Map<string, number>();
  for (const subId of subsBySubId.keys()) {
    let paidCount = 0;
    for await (const inv of stripe.invoices.list({ subscription: subId, limit: 100 } as any)) {
      if (inv.status === "paid") paidCount++;
    }
    paidInvoicesBySubId.set(subId, paidCount);
  }

  // ---------------------------------------------------------------
  // 4. Helpers: get cardholder name + refund/dispute state from a session
  // ---------------------------------------------------------------
  function sessionState(s: Stripe.Checkout.Session): { cardholder: string; notes: string[] } {
    const notes: string[] = [];
    let cardholder = "";
    const pi = typeof s.payment_intent === "object" && s.payment_intent !== null ? s.payment_intent : null;
    const charge = pi && typeof (pi as any).latest_charge === "object" ? (pi as any).latest_charge as Stripe.Charge : null;
    if (charge) {
      cardholder = charge.billing_details?.name ?? "";
      if (charge.refunded) notes.push("REFUNDED");
      else if ((charge.amount_refunded ?? 0) > 0) notes.push(`partial refund ${dollars(charge.amount_refunded)}`);
      if (charge.disputed) notes.push("DISPUTED");
    }
    return { cardholder, notes };
  }

  const rows: CombinedRow[] = [];
  const usedSessionIds = new Set<string>();

  // ---------------------------------------------------------------
  // 5. Walk DB workshop registrations
  // ---------------------------------------------------------------
  for (const r of wRegs ?? []) {
    const session = r.stripe_checkout_session_id ? stripeBySessionId.get(r.stripe_checkout_session_id) : undefined;
    if (session) usedSessionIds.add(session.id);

    const isInstallment = r.payment_type === "installment" && (r.installments_total ?? 1) > 1;
    let paidCents: number;
    let paidLabel: string;
    if (isInstallment) {
      paidCents = (r.unit_price_cents ?? 0) * (r.installments_paid ?? 0);
      paidLabel = `${dollars(paidCents)} paid (${r.installments_paid}/${r.installments_total} × ${dollars(r.unit_price_cents ?? 0)} monthly — plan total ${dollars(r.total_price_cents ?? 0)})`;
    } else {
      paidCents = r.total_price_cents ?? 0;
      paidLabel = `${dollars(paidCents)} (full)`;
    }

    const { cardholder, notes } = session ? sessionState(session) : { cardholder: "", notes: [] };
    const stripeNotes: string[] = [];
    if (!session) {
      if (r.status === "completed") stripeNotes.push("DB says completed but no matching Stripe session");
      else stripeNotes.push("no Stripe session");
    } else {
      if (session.payment_status !== "paid" && r.status === "completed") stripeNotes.push(`Stripe payment_status=${session.payment_status}`);
      stripeNotes.push(...notes);
    }

    // Only include rows the user cares about: DB status='completed' OR we have a paid Stripe session
    const stripePaid = session?.payment_status === "paid";
    if (r.status !== "completed" && !stripePaid) continue;

    rows.push({
      product: "Runway Workshop",
      workshopTitle: workshopById.get(r.workshop_id)?.title ?? "",
      source: session ? "DB+Stripe" : "DB-only",
      name: titleCase(r.buyer_name ?? ""),
      email: (r.buyer_email ?? "").toLowerCase(),
      igUrl: "",
      cardholderName: cardholder && !namesLookSame(cardholder, r.buyer_name ?? "") ? cardholder : "",
      paid: paidLabel,
      paidCents,
      status: r.status,
      stripeSessionId: session?.id ?? "",
      stripeNotes: stripeNotes.join("; "),
      createdAt: r.created_at,
    });
  }

  // ---------------------------------------------------------------
  // 6. Walk DB onboarding bookings
  // ---------------------------------------------------------------
  for (const b of obBookings ?? []) {
    const session = b.stripe_session_id ? stripeBySessionId.get(b.stripe_session_id) : undefined;
    if (session) usedSessionIds.add(session.id);

    const isSplit = b.payment_plan === "split";
    let paidCents: number;
    let paidLabel: string;

    if (isSplit) {
      const paidInvoices = b.stripe_subscription_id ? (paidInvoicesBySubId.get(b.stripe_subscription_id) ?? 0) : 0;
      const perInstallment = Math.ceil((b.amount_cents ?? 0) / 3);
      paidCents = perInstallment * paidInvoices;
      paidLabel = `${dollars(paidCents)} paid (${paidInvoices}/3 × ${dollars(perInstallment)} every 18d — plan total ${dollars(b.amount_cents ?? 0)})`;
    } else {
      paidCents = b.amount_cents ?? 0;
      paidLabel = `${dollars(paidCents)} (full)`;
    }

    const { cardholder, notes } = session ? sessionState(session) : { cardholder: "", notes: [] };
    const stripeNotes: string[] = [];
    if (!session) {
      if (b.status !== "pending") stripeNotes.push(`DB status=${b.status} but no Stripe session found`);
    } else {
      stripeNotes.push(...notes);
    }

    const stripePaid = session?.payment_status === "paid";
    if (b.status === "pending" && !stripePaid && !isSplit) continue;
    if (isSplit && (paidInvoicesBySubId.get(b.stripe_subscription_id ?? "") ?? 0) === 0 && b.status === "pending") continue;

    rows.push({
      product: "Model Onboarding",
      workshopTitle: "",
      source: session ? "DB+Stripe" : "DB-only",
      name: titleCase(b.name ?? ""),
      email: (b.email ?? "").toLowerCase(),
      igUrl: b.instagram ? normalizeIgUrl(extractHandle(b.instagram)) || b.instagram : "",
      cardholderName: cardholder && !namesLookSame(cardholder, b.name ?? "") ? cardholder : "",
      paid: paidLabel,
      paidCents,
      status: b.status,
      stripeSessionId: session?.id ?? "",
      stripeNotes: stripeNotes.join("; "),
      createdAt: b.created_at,
    });
  }

  // ---------------------------------------------------------------
  // 7. Find Stripe orphans (paid sessions with no DB match)
  // ---------------------------------------------------------------
  for (const s of sessions) {
    if (usedSessionIds.has(s.id)) continue;
    if (s.payment_status !== "paid") continue;
    const type = s.metadata?.type;
    const product = type === "workshop_registration" ? "Runway Workshop" : "Model Onboarding";
    const name = s.metadata?.buyer_name ?? s.metadata?.name ?? "";
    const email = (s.metadata?.buyer_email ?? s.metadata?.email ?? s.customer_details?.email ?? "").toLowerCase();
    const { cardholder, notes } = sessionState(s);
    rows.push({
      product,
      workshopTitle: type === "workshop_registration" ? (workshopById.get(s.metadata?.workshop_id ?? "")?.title ?? "") : "",
      source: "Stripe-only",
      name: titleCase(name),
      email,
      igUrl: s.metadata?.instagram ? normalizeIgUrl(extractHandle(s.metadata?.instagram)) : "",
      cardholderName: cardholder && !namesLookSame(cardholder, name) ? cardholder : "",
      paid: dollars(s.amount_total ?? 0),
      paidCents: s.amount_total ?? 0,
      status: "orphan",
      stripeSessionId: s.id,
      stripeNotes: ["ORPHAN: paid in Stripe but no DB row", ...notes].join("; "),
      createdAt: new Date((s.created ?? 0) * 1000).toISOString(),
    });
  }

  // ---------------------------------------------------------------
  // 8. Backfill IG from models table by email
  // ---------------------------------------------------------------
  const lookupEmails = Array.from(new Set(rows.filter(r => !r.igUrl && r.email).map(r => r.email)));
  const igByEmail = new Map<string, string>();
  for (let i = 0; i < lookupEmails.length; i += 100) {
    const batch = lookupEmails.slice(i, i + 100);
    const { data } = await supabase
      .from("models")
      .select("email, instagram_url")
      .in("email", batch);
    for (const m of data ?? []) {
      const e = (m.email ?? "").toLowerCase();
      if (e && m.instagram_url) igByEmail.set(e, m.instagram_url);
    }
  }
  for (const r of rows) {
    if (!r.igUrl && r.email && igByEmail.has(r.email)) {
      const h = extractHandle(igByEmail.get(r.email));
      r.igUrl = h ? normalizeIgUrl(h) : (igByEmail.get(r.email) ?? "");
    }
  }

  // ---------------------------------------------------------------
  // 9. Sort and write CSV
  // ---------------------------------------------------------------
  rows.sort((a, b) => {
    if (a.product !== b.product) return a.product.localeCompare(b.product);
    return a.name.localeCompare(b.name);
  });

  const header = ["Product", "Workshop", "Name", "Cardholder (if different)", "Email", "Instagram", "Paid", "Status", "Source", "Stripe Notes", "Stripe Session", "Registered At"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvEscape(r.product),
      csvEscape(r.workshopTitle),
      csvEscape(r.name),
      csvEscape(r.cardholderName),
      csvEscape(r.email),
      hyperlinkCell(r.igUrl),
      csvEscape(r.paid),
      csvEscape(r.status),
      csvEscape(r.source),
      csvEscape(r.stripeNotes),
      csvEscape(r.stripeSessionId),
      csvEscape(r.createdAt),
    ].join(","));
  }
  writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf-8");

  // ---------------------------------------------------------------
  // 10. Report
  // ---------------------------------------------------------------
  const orphans = rows.filter(r => r.source === "Stripe-only");
  const dbOnly = rows.filter(r => r.source === "DB-only");
  const refunded = rows.filter(r => /REFUND/i.test(r.stripeNotes));
  const disputed = rows.filter(r => /DISPUTE/i.test(r.stripeNotes));
  const cardholderMismatches = rows.filter(r => r.cardholderName);

  console.log("");
  console.log(`Wrote ${rows.length} rows to ${OUT_PATH}`);
  console.log("");
  console.log(`Reconciliation summary:`);
  console.log(`  Stripe orphans (paid in Stripe, no DB row): ${orphans.length}`);
  console.log(`  DB-only (no matching Stripe session):       ${dbOnly.length}`);
  console.log(`  Refunds:                                    ${refunded.length}`);
  console.log(`  Disputes:                                   ${disputed.length}`);
  console.log(`  Cardholder name differs from buyer:         ${cardholderMismatches.length}`);

  if (orphans.length) {
    console.log("\nOrphans:");
    for (const o of orphans) console.log(`  ${o.product} | ${o.name} | ${o.email} | ${o.paid} | session ${o.stripeSessionId}`);
  }
  if (dbOnly.length) {
    console.log("\nDB-only:");
    for (const d of dbOnly) console.log(`  ${d.product} | ${d.name} | ${d.email} | ${d.paid} | ${d.stripeNotes}`);
  }
  if (refunded.length) {
    console.log("\nRefunded:");
    for (const r of refunded) console.log(`  ${r.product} | ${r.name} | ${r.email} | ${r.stripeNotes}`);
  }
  if (cardholderMismatches.length) {
    console.log("\nCardholder differs from buyer (likely parent paid):");
    for (const c of cardholderMismatches) console.log(`  ${c.product} | ${c.name}  ←  ${c.cardholderName}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
