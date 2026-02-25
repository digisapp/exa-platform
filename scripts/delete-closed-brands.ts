// Deletes brand contacts that have confirmed closed / out of business
// Run with: npx ts-node scripts/delete-closed-brands.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLOSED_EMAILS = [
  "service@alalastyle.com",
].map(e => e.toLowerCase());

const DO_NOT_CONTACT_EMAILS = [
  "press@santandabel.com",
].map(e => e.toLowerCase());

async function main() {
  // Delete closed/out-of-business brands
  if (CLOSED_EMAILS.length > 0) {
    console.log(`Deleting ${CLOSED_EMAILS.length} closed/out-of-business contacts...`);
    const { data, error } = await supabase
      .from("brand_outreach_contacts")
      .delete()
      .in("email", CLOSED_EMAILS)
      .select("id, brand_name, email");
    if (error) console.error("Delete error:", error);
    data?.forEach(c => console.log(`  ✓ Deleted: ${c.brand_name} <${c.email}>`));
  }

  // Mark unsubscribed brands as do_not_contact
  if (DO_NOT_CONTACT_EMAILS.length > 0) {
    console.log(`\nMarking ${DO_NOT_CONTACT_EMAILS.length} contacts as do_not_contact...`);
    const { data, error } = await supabase
      .from("brand_outreach_contacts")
      .update({ status: "do_not_contact", updated_at: new Date().toISOString() })
      .in("email", DO_NOT_CONTACT_EMAILS)
      .select("id, brand_name, email");
    if (error) console.error("Update error:", error);
    data?.forEach(c => console.log(`  ✓ Do not contact: ${c.brand_name} <${c.email}>`));
  }
}

main().catch(console.error);
