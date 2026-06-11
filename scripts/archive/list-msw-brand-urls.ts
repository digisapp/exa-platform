import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: mswEvent } = await supabase
    .from("events").select("id").ilike("name", "%miami swim week%").order("year", { ascending: false }).limit(1).maybeSingle();
  const { data: shows } = await supabase.from("event_shows").select("id").eq("event_id", mswEvent!.id);
  const showIds = (shows || []).map(s => s.id);
  const { data: designers } = await supabase
    .from("event_show_designers")
    .select("designer_name, brand_id")
    .in("show_id", showIds);

  const brandIds = Array.from(new Set((designers || []).map(d => d.brand_id).filter(Boolean)));
  const { data: brands } = await supabase
    .from("brands")
    .select("id, company_name, username, website, instagram_handle, profile_picture_url, logo_url")
    .in("id", brandIds);

  // Map brand info by name
  const byName: Record<string, any> = {};
  for (const d of designers || []) {
    if (!d.brand_id) continue;
    const b = brands?.find(x => x.id === d.brand_id);
    if (!b) continue;
    byName[d.designer_name] = b;
  }
  console.log(JSON.stringify(byName, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
