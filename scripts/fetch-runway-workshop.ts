import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await supabase.from("workshops").select("id, slug, title, description, highlights, what_to_bring").eq("slug", "runway-workshop").single();
console.log(JSON.stringify(data, null, 2));
