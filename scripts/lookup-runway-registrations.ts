import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAILS = ["christymd305@gmail.com", "connectwithyani.ee@gmail.com"];

async function main() {
  const { data: workshop, error: wErr } = await supabase
    .from("workshops")
    .select("id, slug, title, date, start_time, end_time, location_city, location_state, location_address, what_to_bring")
    .eq("slug", "runway-workshop")
    .single();

  if (wErr || !workshop) {
    console.error("Runway workshop not found:", wErr);
    return;
  }
  console.log("Workshop:", workshop.title, "| id:", workshop.id, "| date:", workshop.date);
  console.log("");

  for (const email of EMAILS) {
    const { data: regs, error } = await supabase
      .from("workshop_registrations")
      .select("id, buyer_email, buyer_name, status, payment_type, total_price_cents, quantity, installments_paid, installments_total, created_at, completed_at, workshop_id")
      .ilike("buyer_email", email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`Error for ${email}:`, error);
      continue;
    }

    console.log(`--- ${email} ---`);
    if (!regs || regs.length === 0) {
      console.log("  No registrations found.");
    } else {
      for (const r of regs) {
        const forRunway = r.workshop_id === workshop.id ? "  (RUNWAY)" : "";
        console.log(`  reg ${r.id}${forRunway}: name=${r.buyer_name} | status=${r.status} | pay=${r.payment_type} | qty=${r.quantity} | total=${(r.total_price_cents / 100).toFixed(2)} | inst=${r.installments_paid}/${r.installments_total} | created=${r.created_at}`);
      }
    }
    console.log("");
  }
}

main().catch(console.error);
