import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Find both Mina Mueller accounts
  const { data: models } = await supabase
    .from("models")
    .select("id, username, email, user_id, instagram_name, created_at")
    .in("id", [
      "09ff40ed-a296-48f9-b31f-f92469034938",
      "cb2b44b3-6e0b-421d-9e52-e04b838bbd79"
    ]);

  console.log("Mina Mueller accounts:");
  for (const m of models || []) {
    console.log(`  Username: ${m.username}`);
    console.log(`  ID: ${m.id}`);
    console.log(`  Email: ${m.email}`);
    console.log(`  user_id: ${m.user_id}`);
    console.log(`  Created: ${m.created_at}`);
    console.log();
  }

  // Find the one with username minamueller1
  const keepAccount = models?.find(m => m.username === "minamueller1");
  const deleteAccount = models?.find(m => m.username !== "minamueller1");

  if (!keepAccount) {
    console.log("Account with username 'minamueller1' not found!");
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
