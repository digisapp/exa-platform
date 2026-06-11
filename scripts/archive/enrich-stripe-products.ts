/**
 * Enrich the unified_payments CSV with the actual product purchased.
 *
 * Strategy:
 *   1. Stripe API lookup per charge: pull description, metadata, invoice
 *      line items, or checkout session line items.
 *   2. Resolve workshop_id / tier_id / event_id UUIDs in metadata to
 *      human-readable names from Supabase.
 *   3. For charges that are bare in Stripe (no info at all), match against
 *      Supabase booking tables by email + amount, since our app records what
 *      each customer actually bought even when Stripe doesn't know.
 *   4. Final fallback: amount-based heuristic.
 *
 * Reads:  /Users/examodels/Desktop/unified_payments (1).csv
 *         /Users/examodels/Desktop/unified_payments_named.csv
 * Writes: /Users/examodels/Desktop/unified_payments_final.csv
 */
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const ORIGINAL = "/Users/examodels/Desktop/unified_payments (1).csv";
const NAMED = "/Users/examodels/Desktop/unified_payments_named.csv";
const OUT = "/Users/examodels/Desktop/unified_payments_final.csv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === ',') { out.push(cur); cur = ""; }
        else if (c === '"') inQ = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  return { header: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) };
}

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// --- Reference lookups (preloaded) ---

const workshopNames = new Map<string, string>();
const tierNames = new Map<string, string>();
const eventNames = new Map<string, string>();

async function preloadRefs() {
  const [w, t, e] = await Promise.all([
    supabase.from("workshops").select("id, title"),
    supabase.from("ticket_tiers").select("id, name").then(r => r),
    supabase.from("events").select("id, name").then(r => r),
  ]);
  for (const r of w.data || []) workshopNames.set(r.id, r.title);
  for (const r of t.data || []) tierNames.set(r.id, r.name);
  for (const r of e.data || []) eventNames.set(r.id, r.name);
  console.log(`Loaded ${workshopNames.size} workshops, ${tierNames.size} tiers, ${eventNames.size} events`);
}

function humanizeMetadata(meta: Record<string, string>): string {
  const parts: string[] = [];
  const t = meta.type || "";
  const pt = meta.payment_type || "";
  if (t === "workshop_registration") {
    const name = (meta.workshop_id && workshopNames.get(meta.workshop_id)) || "Workshop";
    parts.push(pt === "installment" ? `${name} (installment plan)` : name);
  } else if (t === "workshop_installment") {
    const name = (meta.workshop_id && workshopNames.get(meta.workshop_id)) || "Workshop";
    parts.push(`${name} — installment ${meta.installment_number || ""}/${meta.installments_total || ""}`.replace(/\s+$/, ""));
  } else if (t === "ticket_purchase") {
    const tier = (meta.tier_id && tierNames.get(meta.tier_id)) || "Ticket";
    const event = (meta.event_id && eventNames.get(meta.event_id)) || "";
    parts.push(event ? `${event} — ${tier}` : tier);
  } else if (t) {
    parts.push(t);
  }
  return parts.join(", ");
}

async function lookupViaStripe(chargeId: string): Promise<{ product: string; source: string }> {
  try {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["invoice", "payment_intent"],
    });

    // 1. Invoice path (subscriptions, invoice-based)
    const invoice = charge.invoice as Stripe.Invoice | null;
    if (invoice && typeof invoice !== "string") {
      const full = await stripe.invoices.retrieve(invoice.id, {
        expand: ["lines.data.price.product"],
      });
      const names: string[] = [];
      for (const li of full.lines.data) {
        const price = li.price as Stripe.Price | null;
        const product = (price?.product as Stripe.Product | null) || null;
        if (product && typeof product !== "string" && product.name) names.push(product.name);
        else if (li.description) names.push(li.description);
      }
      if (names.length) return { product: names.join(" + "), source: "stripe:invoice" };
      if (full.description) return { product: full.description, source: "stripe:invoice.desc" };
    }

    // 2. Payment Intent
    const pi = charge.payment_intent as Stripe.PaymentIntent | null;
    if (pi && typeof pi !== "string") {
      // 2a. Checkout session line items
      try {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: pi.id,
          limit: 1,
          expand: ["data.line_items", "data.line_items.data.price.product"],
        });
        if (sessions.data.length > 0) {
          const items = sessions.data[0].line_items?.data || [];
          const names: string[] = [];
          for (const li of items) {
            const price = li.price as Stripe.Price | null;
            const product = (price?.product as Stripe.Product | null) || null;
            if (product && typeof product !== "string" && product.name) {
              names.push(li.quantity && li.quantity > 1 ? `${product.name} ×${li.quantity}` : product.name);
            } else if (li.description) names.push(li.description);
          }
          if (names.length) return { product: names.join(" + "), source: "stripe:checkout" };
        }
      } catch {}

      // 2b. PI description / metadata
      if (pi.description) return { product: pi.description, source: "stripe:pi.desc" };
      if (pi.metadata && Object.keys(pi.metadata).length) {
        const human = humanizeMetadata(pi.metadata as Record<string, string>);
        if (human) return { product: human, source: "stripe:pi.metadata" };
      }
    }

    // 3. Charge description / metadata
    if (charge.description) return { product: charge.description, source: "stripe:charge.desc" };
    if (charge.metadata && Object.keys(charge.metadata).length) {
      const human = humanizeMetadata(charge.metadata as Record<string, string>);
      if (human) return { product: human, source: "stripe:charge.metadata" };
    }

    return { product: "", source: "" };
  } catch (e: any) {
    return { product: "", source: `error:${e.message?.slice(0, 60)}` };
  }
}

// --- Supabase booking lookup by email (with optional amount match) ---

type BookingHit = { product: string; source: string };
const bookingsByEmail = new Map<string, Array<{ product: string; amountCents: number | null; createdAt: string; source: string }>>();

function pushBooking(email: string, entry: { product: string; amountCents: number | null; createdAt: string; source: string }) {
  const k = email.toLowerCase().trim();
  if (!k) return;
  if (!bookingsByEmail.has(k)) bookingsByEmail.set(k, []);
  bookingsByEmail.get(k)!.push(entry);
}

async function preloadBookings(emails: string[]) {
  // model_onboarding_bookings
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const { data } = await supabase
      .from("model_onboarding_bookings")
      .select("email, amount_cents, payment_plan, status, created_at")
      .in("email", batch);
    for (const b of data || []) {
      pushBooking(b.email || "", {
        product: `Model Onboarding${b.payment_plan === "split" ? " (split plan)" : ""}`,
        amountCents: b.amount_cents,
        createdAt: b.created_at,
        source: "db:model_onboarding_bookings",
      });
    }
  }
  // workshop_registrations
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const { data } = await supabase
      .from("workshop_registrations")
      .select("buyer_email, workshop_id, payment_type, unit_price_cents, total_price_cents, created_at")
      .in("buyer_email", batch);
    for (const r of data || []) {
      const workshopName = (r.workshop_id && workshopNames.get(r.workshop_id)) || "Workshop";
      pushBooking(r.buyer_email || "", {
        product: r.payment_type === "installment" ? `${workshopName} (installment plan)` : workshopName,
        amountCents: r.payment_type === "installment" ? r.unit_price_cents : r.total_price_cents,
        createdAt: r.created_at,
        source: "db:workshop_registrations",
      });
    }
  }
  // ticket_purchases
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const { data } = await supabase
      .from("ticket_purchases")
      .select("buyer_email, tier_id, total_cents, created_at")
      .in("buyer_email", batch);
    for (const r of data || []) {
      const tier = (r.tier_id && tierNames.get(r.tier_id)) || "Ticket";
      pushBooking(r.buyer_email || "", {
        product: tier,
        amountCents: r.total_cents,
        createdAt: r.created_at,
        source: "db:ticket_purchases",
      });
    }
  }
  // miami_digitals_bookings (covers $35 / digitals charges)
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const { data } = await supabase
      .from("miami_digitals_bookings")
      .select("email, total_cents, created_at")
      .in("email", batch);
    for (const r of data || []) {
      pushBooking(r.email || "", {
        product: "Miami Digitals booking",
        amountCents: r.total_cents,
        createdAt: r.created_at,
        source: "db:miami_digitals_bookings",
      });
    }
  }
}

function lookupViaDb(email: string, amount: string, date: string): BookingHit {
  const list = bookingsByEmail.get(email.toLowerCase().trim()) || [];
  if (list.length === 0) return { product: "", source: "" };

  const amtCents = Math.round(parseFloat(amount) * 100);
  const dateMs = Date.parse(date + "T00:00:00Z");

  // Prefer exact amount + closest date
  let best: typeof list[0] | null = null;
  let bestScore = Infinity;
  for (const b of list) {
    const amtDiff = b.amountCents == null ? Infinity : Math.abs(b.amountCents - amtCents);
    const dDiff = b.createdAt ? Math.abs(Date.parse(b.createdAt) - dateMs) : Infinity;
    // amount match weights more heavily
    const score = amtDiff * 10 + Math.min(dDiff / (1000 * 60 * 60 * 24), 30);
    if (score < bestScore) { best = b; bestScore = score; }
  }
  if (best && bestScore < Infinity) {
    return { product: best.product, source: best.source };
  }
  // Fallback: only one booking on file
  if (list.length === 1) return { product: list[0].product, source: list[0].source };
  return { product: "", source: "" };
}

function amountHeuristic(amount: string): { product: string; source: string } {
  const a = parseFloat(amount);
  if (Number.isNaN(a)) return { product: "", source: "" };
  if (a === 350) return { product: "Runway Workshop (guess from amount)", source: "heuristic" };
  if (a === 550) return { product: "Model Onboarding (guess from amount)", source: "heuristic" };
  if (a === 125) return { product: "Workshop installment (guess from amount)", source: "heuristic" };
  if (a === 35) return { product: "Digitals / event ticket (guess from amount)", source: "heuristic" };
  if (a === 9.99 || a === 16.99 || a === 3.99 || a === 39.99) {
    return { product: "Subscription (guess from amount)", source: "heuristic" };
  }
  return { product: "", source: "" };
}

async function main() {
  await preloadRefs();

  // Build charge_id -> original key
  const origText = readFileSync(ORIGINAL, "utf-8");
  const origParsed = parseCsv(origText);
  const oIdIdx = origParsed.header.indexOf("id");
  const oEmailIdx = origParsed.header.indexOf("Customer Email");
  const oDateIdx = origParsed.header.indexOf("Created date (UTC)");
  const oAmountIdx = origParsed.header.indexOf("Amount");

  const origByKey = new Map<string, string>(); // email|date|amount -> charge id
  for (const r of origParsed.rows) {
    const id = (r[oIdIdx] || "").trim();
    const email = (r[oEmailIdx] || "").trim().toLowerCase();
    const date = (r[oDateIdx] || "").slice(0, 10);
    const amount = (r[oAmountIdx] || "").trim();
    origByKey.set(`${email}|${date}|${amount}`, id);
  }

  const namedText = readFileSync(NAMED, "utf-8");
  const namedParsed = parseCsv(namedText);
  const nHeader = namedParsed.header;
  const colIdx = (n: string) => nHeader.indexOf(n);

  const allEmails = Array.from(new Set(
    namedParsed.rows.map(r => (r[colIdx("Email")] || "").trim().toLowerCase()).filter(Boolean)
  ));
  console.log(`Preloading bookings for ${allEmails.length} emails...`);
  await preloadBookings(allEmails);
  console.log(`Bookings preloaded for ${bookingsByEmail.size} emails`);

  const outHeader = ["Name", "Email", "What they bought", "Price Paid (USD)", "Status", "Date", "Name Source", "Product Source"];
  const outRows: string[][] = [outHeader];

  let viaStripe = 0, viaDb = 0, viaHeuristic = 0, unresolved = 0, kept = 0;

  for (let i = 0; i < namedParsed.rows.length; i++) {
    const r = namedParsed.rows[i];
    const name = r[colIdx("Name")] || "";
    const email = (r[colIdx("Email")] || "").trim();
    const currentLabel = r[colIdx("What they bought")] || "";
    const price = r[colIdx("Price Paid (USD)")] || "";
    const status = r[colIdx("Status")] || "";
    const date = r[colIdx("Date")] || "";
    const nameSource = r[colIdx("Name Source")] || "";

    // Always re-resolve — we want consistent product names
    let product = "";
    let source = "";

    const chargeId = origByKey.get(`${email.toLowerCase()}|${date}|${price}`);
    if (chargeId && (chargeId.startsWith("ch_") || chargeId.startsWith("py_"))) {
      const s = await lookupViaStripe(chargeId);
      if (s.product) { product = s.product; source = s.source; viaStripe++; }
    }

    if (!product) {
      const db = lookupViaDb(email, price, date);
      if (db.product) { product = db.product; source = db.source; viaDb++; }
    }

    if (!product) {
      const h = amountHeuristic(price);
      if (h.product) { product = h.product; source = h.source; viaHeuristic++; }
    }

    if (!product) { product = "Unknown"; source = ""; unresolved++; }

    outRows.push([name, email, product, price, status, date, nameSource, source]);

    if ((i + 1) % 25 === 0) {
      console.log(`  processed ${i + 1}/${namedParsed.rows.length}  stripe=${viaStripe} db=${viaDb} heuristic=${viaHeuristic} unresolved=${unresolved}`);
    }
  }

  console.log(`\nFinal: stripe=${viaStripe}, db=${viaDb}, heuristic=${viaHeuristic}, unresolved=${unresolved}, kept=${kept}`);

  writeFileSync(OUT, outRows.map(row => row.map(csvEscape).join(",")).join("\n") + "\n");
  console.log(`Wrote ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
