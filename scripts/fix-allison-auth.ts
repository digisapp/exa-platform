import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const MODEL_ID = "92913ce9-3e1d-4dc9-9869-09c2db49c6b6";
  const EMAIL = "alliereese14@gmail.com";
  const TEMP_PASSWORD = "TempPassword123!"; // She'll need to reset this

  // 1. Get current model state
  const { data: model } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name")
    .eq("id", MODEL_ID)
    .single();

  if (!model) {
    console.error("Model not found!");
    return;
  }

  console.log("Current model state:");
  console.log("  ID:", model.id);
  console.log("  Username:", model.username);
  console.log("  Email:", model.email);
  console.log("  user_id:", model.user_id);

  if (model.user_id) {
    console.log("\nModel already has a user_id linked!");
    return;
  }

  // 2. Create auth user
  console.log("\nCreating auth user...");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: TEMP_PASSWORD,
    email_confirm: true, // Auto-confirm email
  });

  if (authError) {
    console.error("Error creating auth user:", authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log("Auth user created:", userId);

  // 3. Check if actor exists for this model
  const { data: existingActor } = await supabase
    .from("actors")
    .select("id, user_id, type")
    .eq("id", MODEL_ID)
    .single();

  if (existingActor) {
    // Update existing actor with user_id
    console.log("\nUpdating existing actor record...");
    const { error: actorUpdateError } = await supabase
      .from("actors")
      .update({ user_id: userId })
      .eq("id", MODEL_ID);

    if (actorUpdateError) {
      console.error("Error updating actor:", actorUpdateError.message);
      return;
    }
  } else {
    // Create new actor record
    console.log("\nCreating actor record...");
    const { error: actorError } = await supabase
      .from("actors")
      .insert({
        id: MODEL_ID,
        user_id: userId,
        type: "model",
      });

    if (actorError) {
      console.error("Error creating actor:", actorError.message);
      return;
    }
  }
  console.log("Actor record ready");

  // 4. Update model with user_id
  console.log("\nUpdating model with user_id...");
  const { error: modelError } = await supabase
    .from("models")
    .update({ user_id: userId })
    .eq("id", MODEL_ID);

  if (modelError) {
    console.error("Error updating model:", modelError.message);
    return;
  }

  // 5. Verify final state
  const { data: finalModel } = await supabase
    .from("models")
    .select("id, username, email, user_id")
    .eq("id", MODEL_ID)
    .single();

  console.log("\n✓ Account setup complete!");
  console.log("  Username:", finalModel?.username);
  console.log("  Email:", finalModel?.email);
  console.log("  user_id:", finalModel?.user_id);
  console.log("  URL: https://www.examodels.com/" + finalModel?.username);
  console.log("\n  She can now login with:");
  console.log("  Email:", EMAIL);
  console.log("  (Tell her to use 'Forgot Password' to set her own password)");
}

main().catch(console.error);
