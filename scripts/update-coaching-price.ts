import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const { data, error } = await supabase
  .from("workshops")
  .update({ price_cents: 35000 }) // $350 pay in full
  .eq("slug", "3-month-runway-coaching")
  .select("slug, price_cents");

if (error) {
  console.error("Error:", error.message);
} else {
  console.log("Updated:", data);
}
