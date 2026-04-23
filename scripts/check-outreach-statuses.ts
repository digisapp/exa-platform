import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .select("status, category");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No rows in brand_outreach_contacts table at all.");
    return;
  }

  console.log(`Total contacts: ${data.length}\n`);

  const statuses = new Map<string, number>();
  const categories = new Map<string, number>();

  for (const row of data) {
    statuses.set(row.status, (statuses.get(row.status) || 0) + 1);
    categories.set(row.category, (categories.get(row.category) || 0) + 1);
  }

  console.log("Status breakdown:");
  for (const [s, c] of Array.from(statuses.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(20)} ${c}`);
  }

  console.log("\nCategory breakdown:");
  for (const [cat, c] of Array.from(categories.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${c}`);
  }
}

main();
