import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function run() {
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title")
    .ilike("title", "%miami swim week%")
    .limit(5);

  if (!gigs?.length) { console.log("No gig found"); return; }
  const gig = gigs[0];
  console.log("Gig:", gig.title, gig.id);

  const { data: apps, error } = await (supabase
    .from("gig_applications")
    .select("id, status, model:models(id, username, email, first_name, profile_photo_url, height, bust, waist, hips)")
    .eq("gig_id", gig.id)
    .not("status", "in", "(withdrawn,rejected)") as any);

  if (error) { console.log("Error:", error); return; }

  const total = apps?.length || 0;
  const withEmail = (apps || []).filter((a: any) => a.model?.email);
  const noPhoto = withEmail.filter((a: any) => !a.model?.profile_photo_url);
  const hasPhoto = withEmail.filter((a: any) => a.model?.profile_photo_url);

  const statuses = new Map<string, number>();
  for (const a of apps || []) statuses.set(a.status, (statuses.get(a.status) || 0) + 1);

  console.log("\nTotal applications (not withdrawn/rejected):", total);
  console.log("With email:", withEmail.length);
  console.log("Have profile photo:", hasPhoto.length);
  console.log("Missing profile photo (will be emailed):", noPhoto.length);
  console.log("Status breakdown:", Object.fromEntries(statuses));

  let missingMeasurements = 0;
  let missingPortfolio = 0;

  // Count portfolio assets for no-photo models
  const modelIds = noPhoto.map((a: any) => a.model.id);
  const { data: portfolioData } = await supabase
    .from("media_assets")
    .select("model_id")
    .in("model_id", modelIds)
    .eq("asset_type", "portfolio");

  const portfolioCounts = new Map<string, number>();
  for (const asset of portfolioData || []) {
    portfolioCounts.set(asset.model_id, (portfolioCounts.get(asset.model_id) || 0) + 1);
  }

  console.log("\nModels to email (missing profile photo):");
  for (const a of noPhoto) {
    const m = a.model;
    const hasMeasurements = !!(m.height || m.bust || m.waist || m.hips);
    const hasPortfolio = (portfolioCounts.get(m.id) || 0) > 0;
    if (!hasMeasurements) missingMeasurements++;
    if (!hasPortfolio) missingPortfolio++;
    const flags = [
      "NO PHOTO",
      !hasMeasurements && "no measurements",
      !hasPortfolio && "no portfolio",
    ].filter(Boolean).join(" | ");
    console.log(`  @${m.username} | ${m.email} | ${m.first_name || "(no name)"} → [${flags}]`);
  }

  console.log("\n── Also missing among those without photo ──");
  console.log("  Missing measurements:", missingMeasurements);
  console.log("  Missing portfolio:   ", missingPortfolio);
}

run().catch(console.error);
