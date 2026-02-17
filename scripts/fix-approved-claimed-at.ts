/**
 * Fix claimed_at for models approved via model_applications
 * that were linked to existing imported profiles (claimed_at is null).
 *
 * Sets claimed_at = reviewed_at from the model_application record.
 *
 * Usage: npx tsx scripts/fix-approved-claimed-at.ts
 * Add --dry-run to preview without making changes
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE RUN ===");

  // Find approved model applications
  const { data: approvedApps, error: appsError } = await supabase
    .from("model_applications")
    .select("id, user_id, display_name, reviewed_at")
    .eq("status", "approved")
    .not("reviewed_at", "is", null);

  if (appsError) {
    console.error("Error fetching applications:", appsError);
    process.exit(1);
  }

  console.log(`Found ${approvedApps?.length || 0} approved applications`);

  let fixed = 0;
  let alreadySet = 0;
  let noModel = 0;

  for (const app of approvedApps || []) {
    // Find the model record for this user
    const { data: model } = await supabase
      .from("models")
      .select("id, username, claimed_at, created_at")
      .eq("user_id", app.user_id)
      .single();

    if (!model) {
      console.log(`  No model found for user_id=${app.user_id} (${app.display_name})`);
      noModel++;
      continue;
    }

    if (model.claimed_at) {
      alreadySet++;
      continue;
    }

    // Model has no claimed_at — set it to the application's reviewed_at
    const claimedAt = app.reviewed_at || new Date().toISOString();
    console.log(`  Fixing: @${model.username} (${app.display_name}) → claimed_at = ${claimedAt}`);

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("models")
        .update({ claimed_at: claimedAt })
        .eq("id", model.id);

      if (updateError) {
        console.error(`    Error updating ${model.username}:`, updateError);
      } else {
        fixed++;
      }
    } else {
      fixed++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Already had claimed_at: ${alreadySet}`);
  console.log(`  No model record found: ${noModel}`);
}

main().catch(console.error);
