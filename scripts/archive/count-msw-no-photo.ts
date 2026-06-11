import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("/Users/examodels/Desktop/exa-platform/.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const GIG = "c693fc9c-b6b4-4659-a323-0256ef3181c0";

  const { data: apps, error } = await supabase
    .from("gig_applications")
    .select("id, model_id, models!inner(id, first_name, last_name, profile_photo_url)")
    .eq("gig_id", GIG)
    .eq("status", "pending");

  if (error) throw error;

  const total = apps?.length ?? 0;
  const noPhoto = (apps ?? []).filter((a: any) => {
    const url = a.models?.profile_photo_url;
    return !url || url.trim() === "";
  });

  console.log(`Total pending: ${total}`);
  console.log(`Without profile_photo_url: ${noPhoto.length}`);
  console.log(`\nModels without photo:`);
  for (const a of noPhoto) {
    const m: any = a.models;
    console.log(`  - ${m.first_name ?? ""} ${m.last_name ?? ""}  (${m.id})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
