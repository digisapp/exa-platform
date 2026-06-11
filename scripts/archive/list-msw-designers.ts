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
    .from("events")
    .select("id, name")
    .ilike("name", "%miami swim week%")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!mswEvent) { console.error("No MSW event found"); process.exit(1); }
  console.log("EVENT:", mswEvent.name, mswEvent.id);

  const { data: shows } = await supabase
    .from("event_shows")
    .select("id, name, show_order")
    .eq("event_id", mswEvent.id)
    .order("show_order");
  console.log("\nSHOWS:", JSON.stringify(shows, null, 2));

  const showIds = (shows || []).map(s => s.id);
  const { data: designers } = await supabase
    .from("event_show_designers")
    .select("designer_name, show_id, designer_order")
    .in("show_id", showIds)
    .order("designer_name");

  console.log("\nTOTAL DESIGNERS:", designers?.length);
  console.log("\nDESIGNER LIST:");
  designers?.forEach(d => console.log(`  - ${d.designer_name}`));

  const uniqueNames = Array.from(new Set((designers || []).map(d => d.designer_name)));
  console.log("\nUNIQUE NAMES:", uniqueNames.length);
  uniqueNames.sort().forEach(n => console.log(n));
}

main().catch(e => { console.error(e); process.exit(1); });
