import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// These were wrongly updated by partial brand name matching — restoring correct emails
const fixes = [
  { name: "Tula Skincare", email: "press@tula.com" },
  { name: "Milk + Honey Spa", email: "info@milkandhoney.com" },
  { name: "Osea Malibu", email: "info@oseamalibu.com" },
  { name: "Colorescience Sunforgettable", email: "concierge@colorescience.com" },
  { name: "Bioderma Photoderm", email: "info@bioderma.com" },
];

for (const f of fixes) {
  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .update({ email: f.email, updated_at: new Date().toISOString() })
    .eq("contact_type", "sponsor")
    .ilike("brand_name", f.name)
    .select("brand_name, email");
  if (error) console.error("Error:", f.name, error.message);
  else console.log("Fixed:", data?.[0]?.brand_name, "→", f.email);
}
