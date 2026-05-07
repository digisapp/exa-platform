import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("event_show_designers")
    .select("designer_name, brand_id")
    .order("designer_name");

  if (error) { console.error(error); process.exit(1); }

  const linked = (data || []).filter((d) => d.brand_id);
  const unlinked = (data || []).filter((d) => !d.brand_id);

  console.log(`\nTotal designers: ${data?.length}`);
  console.log(`Already have accounts: ${linked.length}`);
  console.log(`Need accounts: ${unlinked.length}\n`);

  console.log("── Need accounts (add these to your CSV) ──");
  unlinked.forEach((d) => console.log(d.designer_name));

  if (linked.length) {
    console.log("\n── Already linked to a brand account ──");
    linked.forEach((d) => console.log(d.designer_name));
  }
}

main();
