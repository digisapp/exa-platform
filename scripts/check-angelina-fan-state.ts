import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FAN_USER_ID = "287493dc-69c2-4f10-8331-922ce90d2f6f";

async function main() {
  const { data: fan } = await supabase.from("fans").select("*").eq("user_id", FAN_USER_ID).maybeSingle();
  console.log("Fan row:", fan);

  const { data: actor } = await supabase.from("actors").select("*").eq("user_id", FAN_USER_ID).maybeSingle();
  console.log("Actor row:", actor);

  // Activity signals
  const [convos, purchases, tips, follows] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).or(`fan_id.eq.${fan?.id ?? ""},model_id.eq.${fan?.id ?? ""}`),
    supabase.from("coin_purchases").select("id, coins, amount_cents, created_at").eq("fan_id", fan?.id ?? "").limit(20),
    supabase.from("tips").select("id, amount, created_at").eq("fan_id", fan?.id ?? "").limit(20),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("fan_id", fan?.id ?? ""),
  ]);
  console.log("conversations count:", convos.count, convos.error?.message);
  console.log("coin_purchases:", purchases.data, purchases.error?.message);
  console.log("tips:", tips.data, tips.error?.message);
  console.log("follows count:", follows.count, follows.error?.message);
}

main().catch(console.error);
