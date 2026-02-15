import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get all models with no first AND last name
  const { data: models, error } = await supabase
    .from("models")
    .select("id, email, username, first_name, last_name, instagram_url, is_approved, user_id, profile_photo_url, bio, height, created_at, claimed_at, last_active_at")
    .is("first_name", null)
    .is("last_name", null)
    .order("created_at", { ascending: false });

  if (error || !models) {
    console.error("Error:", error);
    return;
  }

  console.log("Total models with NO name:", models.length);
  console.log("");

  // Check which ones have any activity
  let realCount = 0;
  let emptyCount = 0;
  const emptyModels: typeof models = [];
  const partialModels: typeof models = [];

  for (const m of models) {
    const hasPhoto = !!m.profile_photo_url;
    const hasBio = !!m.bio;
    const hasHeight = !!m.height;
    const hasInstagram = !!m.instagram_url;
    const hasClaimed = !!m.claimed_at;
    const hasActivity = !!m.last_active_at;

    // Check for gig applications
    const { count: appCount } = await supabase
      .from("gig_applications")
      .select("id", { count: "exact", head: true })
      .eq("model_id", m.id);

    // Check for photos in portfolio
    const { count: photoCount } = await supabase
      .from("model_photos")
      .select("id", { count: "exact", head: true })
      .eq("model_id", m.id);

    const isReal = hasPhoto || hasBio || hasHeight || hasInstagram || (appCount ?? 0) > 0 || (photoCount ?? 0) > 0;

    if (isReal) {
      realCount++;
      partialModels.push(m);
      console.log(`  PARTIAL: @${m.username} | ${m.email} | photo:${hasPhoto} | bio:${hasBio} | ig:${hasInstagram} | apps:${appCount} | photos:${photoCount} | active:${m.last_active_at || "never"}`);
    } else {
      emptyCount++;
      emptyModels.push(m);
    }
  }

  console.log("");
  console.log("--- SUMMARY ---");
  console.log("Models with some profile data:", realCount);
  console.log("Completely empty (email-only):", emptyCount);
  console.log("");

  console.log("--- COMPLETELY EMPTY MODELS (just email) ---");
  for (const m of emptyModels) {
    console.log(`  @${m.username} | ${m.email} | approved:${m.is_approved} | claimed:${!!m.user_id} | created:${m.created_at}`);
  }
}

main().catch(console.error);
