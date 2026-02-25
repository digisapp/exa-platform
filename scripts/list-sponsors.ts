import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await supabase.from("brand_outreach_contacts").select("brand_name, category").eq("contact_type", "sponsor").order("category").order("brand_name");
data?.forEach(r => console.log(`${r.category.padEnd(12)} ${r.brand_name}`));
console.log("\nTotal:", data?.length);
