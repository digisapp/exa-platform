import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const KEEP_ID = "e8e8f6c5-7948-46d6-8d5f-f24ea620fde5";    // ashleylam (active, Jan 4)
  const DELETE_ID = "268281de-9ff7-4e26-8e92-b5f4705008e1";  // ashleyylam (roster import, Nov 4)

  // Verify before deleting
  const { data: models } = await supabase
    .from("models")
    .select("id, username, email, user_id, created_at")
    .in("id", [KEEP_ID, DELETE_ID]);

  console.log("Accounts found:");
  for (const m of models || []) {
    const action = m.id === KEEP_ID ? "KEEP" : "DELETE";
    console.log(`  [${action}] ${m.username} - ${m.email} (user_id: ${m.user_id})`);
  }

  const deleteAccount = models?.find(m => m.id === DELETE_ID);

  if (!deleteAccount) {
    console.log("\nAccount to delete not found - may already be deleted");
    return;
  }

  // Delete the roster import account
  console.log("\nDeleting roster import account (ashleyylam)...");

  const { error: modelError } = await supabase
    .from("models")
    .delete()
    .eq("id", DELETE_ID);

  if (modelError) {
    console.error("Error deleting model:", modelError.message);
    return;
  }
  console.log("Model record deleted");

  // Delete actor if exists
  const { error: actorError } = await supabase
    .from("actors")
    .delete()
    .eq("id", DELETE_ID);

  if (actorError) {
    console.log("Actor delete note:", actorError.message);
  } else {
    console.log("Actor record deleted");
  }

  // Verify final state
  const { data: kept } = await supabase
    .from("models")
    .select("id, username, email, is_approved")
    .eq("id", KEEP_ID)
    .single();

  console.log("\n✓ Kept account:");
  console.log("  Username:", kept?.username);
  console.log("  Email:", kept?.email);
  console.log("  Approved:", kept?.is_approved);
  console.log("  URL: https://www.examodels.com/" + kept?.username);
}

main().catch(console.error);
