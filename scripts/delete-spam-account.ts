import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find the suspicious account
  const { data: models } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name, is_approved, created_at")
    .or("username.ilike.%jsn%,first_name.ilike.%hma%,last_name.ilike.%hma%");

  if (!models || models.length === 0) {
    console.log("No matching accounts found");
    return;
  }

  console.log("Found accounts:");
  for (const m of models) {
    console.log(`  Username: ${m.username}`);
    console.log(`  Name: ${m.first_name} ${m.last_name}`);
    console.log(`  Email: ${m.email}`);
    console.log(`  Approved: ${m.is_approved}`);
    console.log(`  Created: ${m.created_at}`);
    console.log(`  ID: ${m.id}`);
    console.log();
  }

  // Delete each account
  for (const m of models) {
    console.log(`Deleting ${m.username}...`);

    // Delete model
    const { error: modelError } = await supabase
      .from("models")
      .delete()
      .eq("id", m.id);

    if (modelError) {
      console.log("  Model delete error:", modelError.message);
    } else {
      console.log("  Model deleted");
    }

    // Delete actor
    const { error: actorError } = await supabase
      .from("actors")
      .delete()
      .eq("id", m.id);

    if (actorError) {
      console.log("  Actor note:", actorError.message);
    } else {
      console.log("  Actor deleted");
    }

    // Delete auth user if exists
    if (m.user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(m.user_id);
      if (authError) {
        console.log("  Auth note:", authError.message);
      } else {
        console.log("  Auth user deleted");
      }
    }
  }

  console.log("\nDone");
}

main().catch(console.error);
