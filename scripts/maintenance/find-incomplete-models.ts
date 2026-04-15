import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from("models")
    .select("id, email, username, first_name, last_name, instagram_url, instagram_name, is_approved, user_id, profile_photo_url")
    .or("first_name.is.null,last_name.is.null,instagram_url.is.null")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Total models missing name or instagram:", data.length);
  console.log("");

  const noName = data.filter(m => !m.first_name && !m.last_name);
  const noInstagram = data.filter(m => !m.instagram_url);
  const noPhoto = data.filter(m => !m.profile_photo_url);
  const approved = data.filter(m => m.is_approved);
  const claimed = data.filter(m => m.user_id);

  console.log("--- BREAKDOWN ---");
  console.log("No first AND last name:", noName.length);
  console.log("No instagram:", noInstagram.length);
  console.log("No profile photo:", noPhoto.length);
  console.log("Approved:", approved.length);
  console.log("Claimed (has user_id):", claimed.length);
  console.log("");

  console.log("--- MODELS WITH NO NAME ---");
  for (const m of noName) {
    console.log(`  @${m.username} | ${m.email} | approved:${m.is_approved} | claimed:${!!m.user_id}`);
  }

  console.log("");
  console.log("--- APPROVED MODELS MISSING KEY FIELDS ---");
  const approvedIncomplete = data.filter(
    m => m.is_approved && (!m.first_name || !m.last_name || !m.instagram_url)
  );
  for (const m of approvedIncomplete) {
    const missing: string[] = [];
    if (!m.first_name) missing.push("first_name");
    if (!m.last_name) missing.push("last_name");
    if (!m.instagram_url) missing.push("instagram_url");
    console.log(`  @${m.username} | ${m.email} | missing: ${missing.join(", ")}`);
  }
  console.log("Total approved but incomplete:", approvedIncomplete.length);
}

main().catch(console.error);
