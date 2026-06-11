/**
 * Export a CSV of all models who have paid for:
 *   - Runway Workshop ($350)
 *   - Model Onboarding ($550)
 * Including monthly / installment payment plans for both.
 *
 * Output: /Users/examodels/Desktop/Paid Models Roster.csv
 *
 * Usage: npx tsx scripts/export-paid-models.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const OUT_PATH = "/Users/examodels/Desktop/Paid Models Roster.csv";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Row = {
  product: string;        // "Runway Workshop" | "Model Onboarding"
  name: string;
  email: string;
  igUrl: string;
  paid: string;           // human-readable paid amount + plan info
  paidCents: number;
  status: string;
  createdAt: string;
};

function extractHandle(raw: string | null | undefined): string {
  if (!raw) return "";
  let h = raw.trim();
  h = h.replace(/^@/, "");
  h = h.replace(/^https?:\/\//i, "");
  h = h.replace(/^www\./i, "");
  h = h.replace(/^instagram\.com\//i, "");
  h = h.replace(/[\/?#].*$/, "");
  return h.toLowerCase();
}

function normalizeIgUrl(handle: string): string {
  return handle ? `https://www.instagram.com/${handle}` : "";
}

function titleCase(raw: string): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().split(/\s+/).map(word =>
    word.split(/(['\-.])/).map(part =>
      /^['\-.]$/.test(part) || !part
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1)
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

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

async function main() {
  // -----------------------------------------------------------------
  // 1. Runway Workshop ($350) — workshop_registrations
  // -----------------------------------------------------------------
  const { data: workshop, error: wErr } = await supabase
    .from("workshops")
    .select("id, slug, title, price_cents")
    .eq("slug", "runway-workshop")
    .single();
  if (wErr || !workshop) {
    console.error("Runway workshop not found:", wErr);
    process.exit(1);
  }
  console.log(`Workshop: ${workshop.title} | price: ${dollars(workshop.price_cents)}`);

  const { data: wRegs, error: regErr } = await supabase
    .from("workshop_registrations")
    .select("id, buyer_email, buyer_name, status, payment_type, unit_price_cents, total_price_cents, quantity, installments_paid, installments_total, created_at, completed_at")
    .eq("workshop_id", workshop.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (regErr) { console.error(regErr); process.exit(1); }
  console.log(`Workshop completed registrations: ${wRegs?.length ?? 0}`);

  const rows: Row[] = [];

  for (const r of wRegs ?? []) {
    const isInstallment = r.payment_type === "installment" && (r.installments_total ?? 1) > 1;
    let paidLabel: string;
    let paidCents: number;
    if (isInstallment) {
      paidCents = (r.unit_price_cents ?? 0) * (r.installments_paid ?? 0);
      paidLabel = `${dollars(paidCents)} paid (${r.installments_paid}/${r.installments_total} × ${dollars(r.unit_price_cents ?? 0)} monthly — plan total ${dollars(r.total_price_cents ?? 0)})`;
    } else {
      paidCents = r.total_price_cents ?? 0;
      paidLabel = `${dollars(paidCents)} (full)`;
    }
    rows.push({
      product: "Runway Workshop",
      name: titleCase(r.buyer_name ?? ""),
      email: (r.buyer_email ?? "").toLowerCase(),
      igUrl: "",
      paid: paidLabel,
      paidCents,
      status: r.status,
      createdAt: r.created_at,
    });
  }

  // -----------------------------------------------------------------
  // 2. Model Onboarding ($550) — model_onboarding_bookings
  // -----------------------------------------------------------------
  const { data: obBookings, error: obErr } = await supabase
    .from("model_onboarding_bookings")
    .select("id, name, email, instagram, status, payment_plan, payments_completed, amount_cents, created_at")
    .in("status", ["paid", "partial"])
    .order("created_at", { ascending: false });
  if (obErr) { console.error(obErr); process.exit(1); }
  console.log(`Onboarding bookings (paid/partial): ${obBookings?.length ?? 0}`);

  for (const b of obBookings ?? []) {
    const isSplit = b.payment_plan === "split";
    let paidLabel: string;
    let paidCents: number;
    if (isSplit) {
      // Split = monthly. Total amount_cents is the full plan; per-payment = amount_cents / installmentsTotal.
      // We don't have installments_total on this table — but it's typically 4 (per code conventions).
      // Be safe: derive from amount_cents (full price) and report what we know.
      const completed = b.payments_completed ?? 0;
      // We can't perfectly compute installment size without knowing total count. Look for a metadata hint.
      paidCents = 0; // will set after computing per-installment if possible
      // Conservative: if status='paid' assume all paid; if 'partial' assume completed installments of unknown count.
      if (b.status === "paid") {
        paidCents = b.amount_cents ?? 0;
        paidLabel = `${dollars(paidCents)} (split plan complete)`;
      } else {
        // partial — we know payments_completed but not total; mark accordingly
        paidLabel = `${completed} monthly payment(s) made (split plan, plan total ${dollars(b.amount_cents ?? 0)})`;
        paidCents = 0;
      }
    } else {
      paidCents = b.amount_cents ?? 0;
      paidLabel = `${dollars(paidCents)} (full)`;
    }
    const handle = extractHandle(b.instagram);
    rows.push({
      product: "Model Onboarding",
      name: titleCase(b.name ?? ""),
      email: (b.email ?? "").toLowerCase(),
      igUrl: handle ? normalizeIgUrl(handle) : (b.instagram ?? ""),
      paid: paidLabel,
      paidCents,
      status: b.status,
      createdAt: b.created_at,
    });
  }

  // -----------------------------------------------------------------
  // 3. Fill in Instagram URL from `models` table when missing
  //    (workshop_registrations has no instagram column)
  // -----------------------------------------------------------------
  const emailsToLookup = Array.from(new Set(
    rows.filter(r => !r.igUrl && r.email).map(r => r.email)
  ));
  console.log(`Looking up IG for ${emailsToLookup.length} emails via models table...`);

  const igByEmail = new Map<string, string>();
  const nameByEmail = new Map<string, string>();
  for (let i = 0; i < emailsToLookup.length; i += 100) {
    const batch = emailsToLookup.slice(i, i + 100);
    const { data, error } = await supabase
      .from("models")
      .select("email, first_name, last_name, instagram_url")
      .in("email", batch);
    if (error) { console.error(error); continue; }
    for (const m of data ?? []) {
      const email = (m.email ?? "").toLowerCase();
      if (!email) continue;
      if (m.instagram_url) igByEmail.set(email, m.instagram_url);
      const fullName = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
      if (fullName) nameByEmail.set(email, fullName);
    }
  }

  for (const r of rows) {
    if (!r.igUrl && r.email && igByEmail.has(r.email)) {
      const handle = extractHandle(igByEmail.get(r.email));
      r.igUrl = handle ? normalizeIgUrl(handle) : (igByEmail.get(r.email) ?? "");
    }
    if (!r.name && r.email && nameByEmail.has(r.email)) {
      r.name = titleCase(nameByEmail.get(r.email)!);
    }
  }

  // -----------------------------------------------------------------
  // 4. Sort: product then by name
  // -----------------------------------------------------------------
  rows.sort((a, b) => {
    if (a.product !== b.product) return a.product.localeCompare(b.product);
    return a.name.localeCompare(b.name);
  });

  // -----------------------------------------------------------------
  // 5. Write CSV
  // -----------------------------------------------------------------
  const header = ["Product", "Name", "Email", "Instagram", "Paid", "Status", "Registered At"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvEscape(r.product),
      csvEscape(r.name),
      csvEscape(r.email),
      hyperlinkCell(r.igUrl),
      csvEscape(r.paid),
      csvEscape(r.status),
      csvEscape(r.createdAt),
    ].join(","));
  }
  writeFileSync(OUT_PATH, lines.join("\n") + "\n", "utf-8");

  // -----------------------------------------------------------------
  // 6. Report
  // -----------------------------------------------------------------
  const counts: Record<string, number> = {};
  let missingIg = 0;
  for (const r of rows) {
    counts[r.product] = (counts[r.product] ?? 0) + 1;
    if (!r.igUrl) missingIg++;
  }
  console.log("");
  console.log(`Wrote ${rows.length} rows to ${OUT_PATH}`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`  Missing Instagram: ${missingIg}`);
}

main().catch(e => { console.error(e); process.exit(1); });
