import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const PAGE_SIZE = 1000;
  let allModels: any[] = [];
  let from = 0;

  // Match the admin models page filters exactly:
  // - user_id IS NOT NULL (claimed accounts)
  // - deleted_at IS NULL (not deleted)
  console.log("Fetching all claimed, active models (matching admin/models page)...");

  while (true) {
    const { data, error } = await supabase
      .from("models")
      .select(
        "id, first_name, last_name, username, instagram_url, instagram_name, instagram_followers, height, bust, waist, hips, dress_size, shoe_size"
      )
      .not("user_id", "is", null)
      .is("deleted_at", null)
      .order("first_name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching models:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allModels = allModels.concat(data);
    console.log(`  Fetched ${allModels.length} so far...`);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Total models (claimed + active): ${allModels.length}`);

  const headers = [
    "Name",
    "Instagram URL",
    "Instagram Followers",
    "Height",
    "Bust",
    "Waist",
    "Hips",
    "Dress Size",
    "Shoe Size",
  ];

  const rows = allModels.map((m) => {
    const name =
      [m.first_name, m.last_name].filter(Boolean).join(" ") ||
      m.username ||
      "Unknown";

    const igHandle = m.instagram_name || m.username;
    const igUrl =
      m.instagram_url ||
      (igHandle ? `https://instagram.com/${igHandle.replace(/^@/, "")}` : "");

    return [
      escapeCsv(name),
      escapeCsv(igUrl),
      escapeCsv(m.instagram_followers),
      escapeCsv(m.height),
      escapeCsv(m.bust),
      escapeCsv(m.waist),
      escapeCsv(m.hips),
      escapeCsv(m.dress_size),
      escapeCsv(m.shoe_size),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const outPath = "/Users/examodels/Desktop/approved-models.csv";
  fs.writeFileSync(outPath, csv, "utf-8");

  console.log(`\nExported ${allModels.length} models to: ${outPath}`);

  const noIg = allModels.filter((m) => !m.instagram_name && !m.instagram_url);
  const noFollowers = allModels.filter((m) => !m.instagram_followers);
  const noMeasurements = allModels.filter((m) => !m.bust && !m.waist && !m.hips);
  console.log(`  ${noIg.length} model(s) missing Instagram info`);
  console.log(`  ${noFollowers.length} model(s) missing follower count`);
  console.log(`  ${noMeasurements.length} model(s) missing measurements`);
}

main().catch(console.error);
