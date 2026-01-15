import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find both Kaitlyn Chang accounts
  const { data: models } = await supabase
    .from("models")
    .select("id, username, email, user_id, instagram_name, created_at")
    .in("id", [
      "aca4327e-a611-42df-b866-895b0b072403",
      "233f0c1d-94cc-45e0-874e-c6edf81a260e"
    ]);

  console.log("Kaitlyn Chang accounts:");
  for (const m of models || []) {
    console.log(`  Username: ${m.username}`);
    console.log(`  ID: ${m.id}`);
    console.log(`  Email: ${m.email}`);
    console.log(`  IG: ${m.instagram_name}`);
    console.log(`  user_id: ${m.user_id}`);
    console.log(`  Created: ${m.created_at}`);
    console.log();
  }

  // Find the one with username _kaitlynchang
  const keepAccount = models?.find(m => m.username === "_kaitlynchang");
  const deleteAccount = models?.find(m => m.username !== "_kaitlynchang");

  if (!keepAccount) {
    console.log("Account with username '_kaitlynchang' not found!");
    return;
  }

  console.log("KEEP:", keepAccount.username, "-", keepAccount.email);

  if (!deleteAccount) {
    console.log("No duplicate to delete");
    return;
  }

  console.log("DELETE:", deleteAccount.username, "-", deleteAccount.email);

  // Delete the duplicate
  console.log("\nDeleting duplicate...");

  const { error: modelError } = await supabase
    .from("models")
    .delete()
    .eq("id", deleteAccount.id);

  if (modelError) {
    console.error("Error deleting model:", modelError.message);
    return;
  }
  console.log("Model record deleted");

  const { error: actorError } = await supabase
    .from("actors")
    .delete()
    .eq("id", deleteAccount.id);

  if (actorError) {
    console.log("Actor delete note:", actorError.message);
  } else {
    console.log("Actor record deleted");
  }

  // If deleted account had auth user, delete that too
  if (deleteAccount.user_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(deleteAccount.user_id);
    if (authError) {
      console.log("Auth user delete note:", authError.message);
    } else {
      console.log("Auth user deleted");
    }
  }

  console.log("\n✓ Kept account:");
  console.log("  Username:", keepAccount.username);
  console.log("  Email:", keepAccount.email);
  console.log("  URL: https://www.examodels.com/" + keepAccount.username);
}

main().catch(console.error);
