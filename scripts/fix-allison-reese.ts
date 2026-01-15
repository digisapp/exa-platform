import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const KEEP_ID = "92913ce9-3e1d-4dc9-9869-09c2db49c6b6"; // allison_reese (active)
  const DELETE_ID = "d430375d-e2f9-4aec-972c-fe4c57e2d862"; // duplicate

  // First, verify both accounts
  const { data: models } = await supabase
    .from("models")
    .select("id, user_id, email, username, first_name, last_name, created_at, is_approved")
    .in("id", [KEEP_ID, DELETE_ID]);

  console.log("Found accounts:");
  for (const m of models || []) {
    const action = m.id === KEEP_ID ? "KEEP" : "DELETE";
    console.log(`  [${action}] ID: ${m.id}`);
    console.log(`         Username: ${m.username}`);
    console.log(`         Email: ${m.email}`);
    console.log(`         Created: ${m.created_at}`);
    console.log();
  }

  const keepAccount = models?.find((m) => m.id === KEEP_ID);
  const deleteAccount = models?.find((m) => m.id === DELETE_ID);

  if (!keepAccount) {
    console.error("Account to keep not found!");
    return;
  }

  if (!deleteAccount) {
    console.log("Duplicate account already deleted or not found.");
  } else {
    // Delete the duplicate account
    // Models table has FK to actors, so we need to delete from models first, then actors

    console.log("Deleting duplicate model record...");
    const { error: modelError } = await supabase
      .from("models")
      .delete()
      .eq("id", DELETE_ID);

    if (modelError) {
      console.error("Error deleting model:", modelError);
      return;
    }

    // Delete the actor record (this will cascade to other related tables)
    console.log("Deleting duplicate actor record...");
    const { error: actorError } = await supabase
      .from("actors")
      .delete()
      .eq("id", DELETE_ID);

    if (actorError) {
      console.error("Error deleting actor:", actorError);
      // Continue anyway - actor might not exist
    }

    // Delete auth user if exists
    if (deleteAccount.user_id) {
      console.log("Deleting auth user...");
      const { error: authError } = await supabase.auth.admin.deleteUser(
        deleteAccount.user_id
      );
      if (authError) {
        console.error("Error deleting auth user:", authError);
        // Continue anyway
      }
    }

    console.log("Duplicate account deleted!");
  }

  // Update username from allison_reese to allisonreese
  console.log("\nUpdating username to 'allisonreese'...");
  const { error: updateError } = await supabase
    .from("models")
    .update({ username: "allisonreese" })
    .eq("id", KEEP_ID);

  if (updateError) {
    console.error("Error updating username:", updateError);
    return;
  }

  console.log("Username updated successfully!");

  // Verify final state
  const { data: final } = await supabase
    .from("models")
    .select("id, username, email")
    .eq("id", KEEP_ID)
    .single();

  console.log("\nFinal state:");
  console.log(`  ID: ${final?.id}`);
  console.log(`  Username: ${final?.username}`);
  console.log(`  Email: ${final?.email}`);
  console.log(`  Profile URL: https://www.examodels.com/${final?.username}`);
}

main().catch(console.error);
