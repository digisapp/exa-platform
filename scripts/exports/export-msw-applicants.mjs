import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. Find all Miami Swim Week gigs via the event
  const { data: event } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", "miami-swim-week-2026")
    .single();

  if (!event) {
    // Fallback: try by name pattern
    const { data: events } = await supabase
      .from("events")
      .select("id, name, slug")
      .ilike("name", "%miami%swim%");
    console.log("No event found with slug miami-swim-week-2026. Events matching 'miami swim':", events);
    if (!events?.length) {
      console.error("No Miami Swim Week event found.");
      process.exit(1);
    }
  }

  console.log(`Found event: ${event.name} (${event.id})`);

  // 2. Get all gig IDs for this event
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title")
    .eq("event_id", event.id);

  if (!gigs?.length) {
    console.error("No gigs found for this event.");
    process.exit(1);
  }

  console.log(`Found ${gigs.length} gig(s): ${gigs.map(g => g.title).join(", ")}`);
  const gigIds = gigs.map((g) => g.id);

  // 3. Fetch all applications (paginate)
  let allApps = [];
  const PAGE_SIZE = 1000;

  for (const gigId of gigIds) {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("gig_applications")
        .select("id, model_id, status, applied_at, instagram_handle")
        .eq("gig_id", gigId)
        .order("applied_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Query error:", error.message);
        process.exit(1);
      }

      if (!data?.length) break;
      allApps.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  console.log(`Total applications: ${allApps.length}`);

  if (!allApps.length) {
    console.error("No applications found.");
    process.exit(1);
  }

  // 4. Fetch model details in batches
  const modelIds = [...new Set(allApps.map((a) => a.model_id))];
  const modelMap = {};

  const MODEL_BATCH = 100;
  for (let i = 0; i < modelIds.length; i += MODEL_BATCH) {
    const batch = modelIds.slice(i, i + MODEL_BATCH);
    const { data: models, error } = await supabase
      .from("models")
      .select("id, first_name, last_name, email, username, instagram_name")
      .in("id", batch);

    if (error) {
      console.error("Models query error:", error.message);
      process.exit(1);
    }

    for (const m of models) {
      modelMap[m.id] = m;
    }
  }

  console.log(`Found ${Object.keys(modelMap).length} unique models`);

  // 5. Build CSV
  const header = "First Name,Last Name,Email,Username,Instagram,Application Status,Applied At";
  const rows = allApps.map((row) => {
    const m = modelMap[row.model_id] || {};
    const firstName = (m.first_name || "").replace(/,/g, " ");
    const lastName = (m.last_name || "").replace(/,/g, " ");
    const email = m.email || "";
    const username = m.username || "";
    const instagram = row.instagram_handle || m.instagram_name || "";
    const status = row.status || "";
    const appliedAt = row.applied_at ? new Date(row.applied_at).toISOString().split("T")[0] : "";
    return `${firstName},${lastName},${email},${username},${instagram},${status},${appliedAt}`;
  });

  const csv = [header, ...rows].join("\n");
  const outPath = "msw-applicants.csv";
  writeFileSync(outPath, csv);
  console.log(`\nExported ${rows.length} rows to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
