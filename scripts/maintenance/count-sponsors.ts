import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { count, data } = await supabase.from("brand_outreach_contacts").select("category", { count: "exact" }).eq("contact_type", "sponsor");
console.log("Total sponsors:", count);
const byCat: Record<string, number> = {};
data?.forEach((r: any) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
Object.entries(byCat).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c.padEnd(15)} ${n}`));
