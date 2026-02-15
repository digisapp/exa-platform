import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: allModels, error } = await supabase
    .from("models")
    .select("id, email, username, first_name, last_name, instagram_url, is_approved, user_id, profile_photo_url, claimed_at")
    .order("created_at", { ascending: false });

  if (error || !allModels) {
    console.error("Error:", error);
    return;
  }

  const total = allModels.length;
  const claimed = allModels.filter(m => m.user_id);
  const unclaimed = allModels.filter(m => !m.user_id);

  console.log("=== ALL MODELS ===");
  console.log("Total:", total);
  console.log("Claimed (has user_id):", claimed.length);
  console.log("Not claimed (no user_id):", unclaimed.length);
  console.log("");

  // Unclaimed breakdown
  const unclaimedApproved = unclaimed.filter(m => m.is_approved);
  const unclaimedWithName = unclaimed.filter(m => m.first_name || m.last_name);
  const unclaimedWithPhoto = unclaimed.filter(m => m.profile_photo_url);

  console.log("=== UNCLAIMED MODELS (never signed up) ===");
  console.log("Total unclaimed:", unclaimed.length);
  console.log("  Approved:", unclaimedApproved.length);
  console.log("  Has name:", unclaimedWithName.length);
  console.log("  Has photo:", unclaimedWithPhoto.length);
  console.log("");

  // Claimed breakdown
  const claimedNoName = claimed.filter(m => !m.first_name && !m.last_name);
  const claimedNoPhoto = claimed.filter(m => !m.profile_photo_url);
  const claimedNoIG = claimed.filter(m => !m.instagram_url);
  const claimedComplete = claimed.filter(m => m.first_name && m.last_name && m.profile_photo_url && m.instagram_url);
  const claimedEmpty = claimed.filter(m => !m.first_name && !m.last_name && !m.profile_photo_url && !m.instagram_url);

  console.log("=== CLAIMED MODELS (signed up) ===");
  console.log("Total claimed:", claimed.length);
  console.log("  Complete profile (name + photo + IG):", claimedComplete.length);
  console.log("  No name:", claimedNoName.length);
  console.log("  No photo:", claimedNoPhoto.length);
  console.log("  No Instagram:", claimedNoIG.length);
  console.log("  Completely empty (just email):", claimedEmpty.length);
  console.log("");

  console.log("=== UNCLAIMED MODELS LIST ===");
  for (const m of unclaimed) {
    const name = m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : "(no name)";
    console.log(`  @${m.username} | ${m.email} | ${name} | approved:${m.is_approved} | photo:${!!m.profile_photo_url}`);
  }
}

main().catch(console.error);
