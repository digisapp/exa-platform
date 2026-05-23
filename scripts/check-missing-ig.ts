/**
 * Diagnose why some MSW accepted models have no instagram_url / instagram_followers.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const MSW_GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: apps } = await supabase
    .from("gig_applications")
    .select("model_id")
    .eq("gig_id", MSW_GIG_ID)
    .eq("status", "accepted");
  const ids = (apps ?? []).map((a: any) => a.model_id);

  const { data: models } = await supabase
    .from("models")
    .select("id, first_name, last_name, username, email, instagram_url, instagram_followers, instagram_name, claimed_at, created_at, last_active_at, form_data")
    .in("id", ids);

  const missing = (models ?? []).filter(
    (m: any) => !m.instagram_url || m.instagram_followers == null
  );

  console.log(`Total accepted: ${models?.length}`);
  console.log(`Missing IG URL or followers: ${missing.length}\n`);

  for (const m of missing as any[]) {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.username;
    const formIg = (m.form_data as any)?.instagram_url || (m.form_data as any)?.instagram_handle || (m.form_data as any)?.instagram || "";
    console.log(
      `${name}` +
      `\n  email: ${m.email}` +
      `\n  ig_url: ${m.instagram_url ?? "(null)"}` +
      `\n  ig_name: ${m.instagram_name ?? "(null)"}` +
      `\n  ig_followers: ${m.instagram_followers ?? "(null)"}` +
      `\n  claimed_at: ${m.claimed_at ?? "(unclaimed)"}` +
      `\n  last_active: ${m.last_active_at ?? "(never)"}` +
      `\n  form_data IG: ${formIg || "(none)"}\n`
    );
  }
}

main().catch(e => { console.error(e); process.exit(1); });
