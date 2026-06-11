/**
 * Match Stripe payment emails to names across the EXA platform.
 *
 * Reads:  /Users/examodels/Desktop/unified_payments_organized.csv
 * Writes: /Users/examodels/Desktop/unified_payments_named.csv
 *
 * Looks up each email across multiple tables and fills in the best name found,
 * along with the table the name was sourced from.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const IN_PATH = "/Users/examodels/Desktop/unified_payments_organized.csv";
const OUT_PATH = "/Users/examodels/Desktop/unified_payments_named.csv";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type NameHit = { name: string; source: string };

function titleCase(raw: string): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().split(/\s+/).map(w =>
    w.split(/(['\-.])/).map(p =>
      /^['\-.]$/.test(p) || !p ? p : p.charAt(0).toUpperCase() + p.slice(1)
    ).join("")
  ).join(" ");
}

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Simple CSV parser for our well-formed file
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

async function batchSelect<T>(
  table: string,
  columns: string,
  emailCol: string,
  emails: string[]
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .in(emailCol, batch);
    if (error) {
      console.warn(`  [${table}] error:`, error.message);
      continue;
    }
    if (data) out.push(...(data as unknown as T[]));
  }
  return out;
}

async function main() {
  const csvText = readFileSync(IN_PATH, "utf-8");
  const { header, rows } = parseCsv(csvText);

  const emailIdx = header.indexOf("Email");
  const nameIdx = header.indexOf("Name");
  if (emailIdx < 0 || nameIdx < 0) {
    console.error("Could not find Name/Email columns in input CSV");
    process.exit(1);
  }

  const emails = Array.from(new Set(
    rows.map(r => (r[emailIdx] || "").trim().toLowerCase()).filter(Boolean)
  ));
  console.log(`Looking up ${emails.length} distinct emails...`);

  // Best name wins. Priority (highest first): models, model_applications,
  // workshop_registrations, model_onboarding_bookings, ticket_purchases,
  // academy_applications, miami_digitals_bookings, comp_card_leads, fans, auth.users.
  const found = new Map<string, NameHit>();
  const setIfBetter = (email: string, name: string, source: string, priority: number) => {
    const e = (email || "").toLowerCase().trim();
    const n = (name || "").trim();
    if (!e || !n) return;
    const cur = found.get(e);
    if (!cur || (cur as any)._p > priority) {
      found.set(e, { name: n, source, ...({ _p: priority } as any) });
    }
  };

  // 1. models
  console.log("Querying models...");
  type M = { email: string | null; first_name: string | null; last_name: string | null; verified_legal_name: string | null };
  const ms = await batchSelect<M>("models", "email, first_name, last_name, verified_legal_name", "email", emails);
  for (const m of ms) {
    const full = [m.first_name, m.last_name].filter(Boolean).join(" ").trim() || m.verified_legal_name || "";
    setIfBetter(m.email || "", full, "models", 1);
  }
  console.log(`  hits: ${ms.length}`);

  // 2. model_applications
  console.log("Querying model_applications...");
  type MA = { email: string | null; display_name: string | null };
  const mas = await batchSelect<MA>("model_applications", "email, display_name", "email", emails);
  for (const m of mas) setIfBetter(m.email || "", m.display_name || "", "model_applications", 2);
  console.log(`  hits: ${mas.length}`);

  // 3. workshop_registrations
  console.log("Querying workshop_registrations...");
  type WR = { buyer_email: string | null; buyer_name: string | null };
  const wrs = await batchSelect<WR>("workshop_registrations", "buyer_email, buyer_name", "buyer_email", emails);
  for (const r of wrs) setIfBetter(r.buyer_email || "", r.buyer_name || "", "workshop_registrations", 3);
  console.log(`  hits: ${wrs.length}`);

  // 4. model_onboarding_bookings
  console.log("Querying model_onboarding_bookings...");
  type OB = { email: string | null; name: string | null };
  const obs = await batchSelect<OB>("model_onboarding_bookings", "email, name", "email", emails);
  for (const r of obs) setIfBetter(r.email || "", r.name || "", "model_onboarding_bookings", 4);
  console.log(`  hits: ${obs.length}`);

  // 5. ticket_purchases
  console.log("Querying ticket_purchases...");
  type TP = { buyer_email: string | null; buyer_name: string | null };
  const tps = await batchSelect<TP>("ticket_purchases", "buyer_email, buyer_name", "buyer_email", emails);
  for (const r of tps) setIfBetter(r.buyer_email || "", r.buyer_name || "", "ticket_purchases", 5);
  console.log(`  hits: ${tps.length}`);

  // 6. academy_applications
  console.log("Querying academy_applications...");
  type AA = { applicant_email: string | null; applicant_name: string | null };
  const aas = await batchSelect<AA>("academy_applications", "applicant_email, applicant_name", "applicant_email", emails);
  for (const r of aas) setIfBetter(r.applicant_email || "", r.applicant_name || "", "academy_applications", 6);
  console.log(`  hits: ${aas.length}`);

  // 7. miami_digitals_bookings
  console.log("Querying miami_digitals_bookings...");
  type MD = { email: string | null; name: string | null };
  const mds = await batchSelect<MD>("miami_digitals_bookings", "email, name", "email", emails);
  for (const r of mds) setIfBetter(r.email || "", r.name || "", "miami_digitals_bookings", 7);
  console.log(`  hits: ${mds.length}`);

  // 8. comp_card_leads
  console.log("Querying comp_card_leads...");
  type CCL = { email: string | null; first_name: string | null };
  const ccls = await batchSelect<CCL>("comp_card_leads", "email, first_name", "email", emails);
  for (const r of ccls) setIfBetter(r.email || "", r.first_name || "", "comp_card_leads", 8);
  console.log(`  hits: ${ccls.length}`);

  // 9. fans
  console.log("Querying fans...");
  type F = { email: string | null; display_name: string | null };
  const fans = await batchSelect<F>("fans", "email, display_name", "email", emails);
  for (const r of fans) setIfBetter(r.email || "", r.display_name || "", "fans", 9);
  console.log(`  hits: ${fans.length}`);

  // 10. auth.users metadata fallback (paginate, then filter locally)
  console.log("Querying auth.users (paginated)...");
  let authHits = 0;
  let page = 1;
  const perPage = 1000;
  const emailSet = new Set(emails);
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) { console.warn("  auth listUsers error:", error.message); break; }
    if (!data.users || data.users.length === 0) break;
    for (const u of data.users) {
      const e = (u.email || "").toLowerCase();
      if (!emailSet.has(e)) continue;
      const meta = (u.user_metadata || {}) as Record<string, unknown>;
      const name =
        (meta.full_name as string) ||
        (meta.name as string) ||
        (meta.display_name as string) ||
        [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim();
      if (name) {
        setIfBetter(e, name, "auth.users", 10);
        authHits++;
      }
    }
    if (data.users.length < perPage) break;
    page++;
  }
  console.log(`  hits: ${authHits}`);

  // Write output
  const newHeader = ["Name", "Email", "What they bought", "Price Paid (USD)", "Status", "Date", "Name Source"];
  const outLines = [newHeader.map(csvEscape).join(",")];

  let matched = 0;
  for (const r of rows) {
    const email = (r[emailIdx] || "").trim().toLowerCase();
    const hit = email ? found.get(email) : undefined;
    if (hit) matched++;
    const newRow = [
      hit ? titleCase(hit.name) : "",
      r[emailIdx] || "",
      r[header.indexOf("What they bought")] || "",
      r[header.indexOf("Price Paid (USD)")] || "",
      r[header.indexOf("Status")] || "",
      r[header.indexOf("Date")] || "",
      hit ? hit.source : "",
    ];
    outLines.push(newRow.map(csvEscape).join(","));
  }

  writeFileSync(OUT_PATH, outLines.join("\n") + "\n");
  console.log(`\nMatched ${matched}/${rows.length} rows. Wrote ${OUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
