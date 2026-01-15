import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const KEEP_USERNAME = "aliciamorrisofficial";
  const DELETE_USERNAME = "aliciamorrisofficial1";

  // Find both accounts
  const { data: models } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name, instagram_name, created_at")
    .in("username", [KEEP_USERNAME, DELETE_USERNAME]);

  console.log("Accounts found:");
  for (const m of models || []) {
    const action = m.username === KEEP_USERNAME ? "KEEP" : "DELETE";
    console.log(`  [${action}] ${m.username}`);
    console.log(`         Email: ${m.email}`);
    console.log(`         user_id: ${m.user_id}`);
    console.log();
  }

  const deleteAccount = models?.find(m => m.username === DELETE_USERNAME);

  if (!deleteAccount) {
    console.log("Account to delete not found - may already be deleted");
    return;
  }

  console.log("Deleting", DELETE_USERNAME, "...");

  // Delete model
  const { error: modelError } = await supabase
    .from("models")
    .delete()
    .eq("id", deleteAccount.id);

  if (modelError) {
    console.error("Error deleting model:", modelError.message);
    return;
  }
  console.log("Model deleted");

  // Delete actor
  const { error: actorError } = await supabase
    .from("actors")
    .delete()
    .eq("id", deleteAccount.id);

  if (actorError) {
    console.log("Actor note:", actorError.message);
  } else {
    console.log("Actor deleted");
  }

  // Delete auth user if exists
  if (deleteAccount.user_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(deleteAccount.user_id);
    if (authError) {
      console.log("Auth note:", authError.message);
    } else {
      console.log("Auth user deleted");
    }
  }

  console.log("\nKept account:");
  console.log("  URL: https://www.examodels.com/" + KEEP_USERNAME);
}

main().catch(console.error);
