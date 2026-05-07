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
  // 1. Find the Miami Swim Week event
  const { data: events, error: evtErr } = await supabase
    .from("events")
    .select("id, name, slug")
    .ilike("name", "%miami swim week%");

  if (evtErr || !events?.length) {
    console.error("Could not find Miami Swim Week event:", evtErr);
    process.exit(1);
  }

  const event = events[0];
  console.log(`Found event: ${event.name} (${event.id})`);

  const confirmedModelIds = new Set<string>();

  // 2a. Models confirmed via gig_applications (status='accepted') for gigs in this event
  const { data: gigs, error: gigErr } = await supabase
    .from("gigs")
    .select("id, title")
    .eq("event_id", event.id);

  if (!gigErr && gigs?.length) {
    console.log(`Found ${gigs.length} gig(s) linked to event`);
    const gigIds = gigs.map((g) => g.id);

    const { data: apps, error: appErr } = await supabase
      .from("gig_applications")
      .select("model_id")
      .in("gig_id", gigIds)
      .eq("status", "accepted");

    if (!appErr && apps?.length) {
      console.log(`Found ${apps.length} accepted gig application(s)`);
      apps.forEach((a) => confirmedModelIds.add(a.model_id));
    }
  }

  // 2b. Models confirmed via event_show_models (status='confirmed') for shows in this event
  const { data: shows, error: showErr } = await supabase
    .from("event_shows")
    .select("id")
    .eq("event_id", event.id);

  if (!showErr && shows?.length) {
    const showIds = shows.map((s) => s.id);

    const { data: designers, error: dErr } = await supabase
      .from("event_show_designers")
      .select("id")
      .in("show_id", showIds);

    if (!dErr && designers?.length) {
      const designerIds = designers.map((d) => d.id);

      const { data: showModels, error: smErr } = await supabase
        .from("event_show_models")
        .select("model_id")
        .in("designer_entry_id", designerIds)
        .eq("status", "confirmed");

      if (!smErr && showModels?.length) {
        console.log(`Found ${showModels.length} confirmed show model slot(s)`);
        showModels.forEach((m) => confirmedModelIds.add(m.model_id));
      }
    }
  }

  console.log(`Total unique confirmed model IDs: ${confirmedModelIds.size}`);

  if (confirmedModelIds.size === 0) {
    console.log("No confirmed models found via event links. Falling back to all accepted MSW gig applications...");

    // Fallback: any accepted application where gig title mentions swim week
    const { data: allApps, error: allErr } = await supabase
      .from("gig_applications")
      .select("model_id, gigs!inner(title, event_id)")
      .eq("status", "accepted");

    if (!allErr && allApps?.length) {
      allApps.forEach((a) => confirmedModelIds.add(a.model_id));
      console.log(`Fallback found ${confirmedModelIds.size} models`);
    }
  }

  if (confirmedModelIds.size === 0) {
    console.error("No confirmed models found. Check the event and gig data.");
    process.exit(1);
  }

  // 3. Fetch full model profiles
  const ids = Array.from(confirmedModelIds);
  const { data: models, error: modelErr } = await supabase
    .from("models")
    .select(
      "id, first_name, last_name, username, instagram_url, instagram_name, instagram_followers, height, bust, waist, hips, dress_size, shoe_size"
    )
    .in("id", ids)
    .order("first_name", { ascending: true });

  if (modelErr || !models) {
    console.error("Error fetching models:", modelErr);
    process.exit(1);
  }

  console.log(`Fetched ${models.length} model profile(s)`);

  // 4. Build CSV
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

  const rows = models.map((m) => {
    const name =
      [m.first_name, m.last_name].filter(Boolean).join(" ") ||
      m.username ||
      "Unknown";

    // Build clickable Instagram URL
    const igHandle = m.instagram_name || m.username;
    const igUrl = m.instagram_url || (igHandle ? `https://instagram.com/${igHandle.replace(/^@/, "")}` : "");

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
  const outPath = "/Users/examodels/Desktop/msw-confirmed-models.csv";
  fs.writeFileSync(outPath, csv, "utf-8");

  console.log(`\nExported ${models.length} models to: ${outPath}`);

  // Summary of missing data
  const noIg = models.filter((m) => !m.instagram_name && !m.instagram_url);
  const noFollowers = models.filter((m) => !m.instagram_followers);
  const noMeasurements = models.filter((m) => !m.bust && !m.waist && !m.hips);
  if (noIg.length) console.log(`  ${noIg.length} model(s) missing Instagram info`);
  if (noFollowers.length) console.log(`  ${noFollowers.length} model(s) missing follower count`);
  if (noMeasurements.length) console.log(`  ${noMeasurements.length} model(s) missing measurements`);
}

main().catch(console.error);
