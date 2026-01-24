import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixOrphanActors() {
  console.log("Finding and fixing models with orphan actor issues...\n");

  const { data: models, error: modelsError } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name")
    .not("user_id", "is", null);

  if (modelsError) {
    console.error("Error fetching models:", modelsError);
    return;
  }

  console.log("Total models with user_id:", models.length);

  let fixed = 0;
  let alreadyOk = 0;
  let errors = 0;

  for (const model of models) {
    // Check if correct actor exists
    const { data: correctActor } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .eq("id", model.id)
      .single();

    // Check if there's an orphan actor
    const { data: orphanActor } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .eq("user_id", model.user_id)
      .single();

    const hasCorrectActor =
      correctActor && correctActor.user_id === model.user_id;
    const hasOrphanActor = orphanActor && orphanActor.id !== model.id;

    if (hasCorrectActor && !hasOrphanActor) {
      alreadyOk++;
      continue;
    }

    // Fix needed
    console.log(`Fixing ${model.username} (${model.email})...`);

    try {
      // Delete orphan actor if exists
      if (hasOrphanActor) {
        const { error: deleteError } = await supabase
          .from("actors")
          .delete()
          .eq("id", orphanActor.id);

        if (deleteError) {
          console.error(`  Failed to delete orphan actor: ${deleteError.message}`);
          errors++;
          continue;
        }
      }

      // Create or update correct actor
      if (!correctActor) {
        const { error: insertError } = await supabase
          .from("actors")
          .insert({ id: model.id, user_id: model.user_id, type: "model" });

        if (insertError) {
          console.error(`  Failed to create actor: ${insertError.message}`);
          errors++;
          continue;
        }
      } else if (correctActor.user_id !== model.user_id) {
        const { error: updateError } = await supabase
          .from("actors")
          .update({ user_id: model.user_id, type: "model" })
          .eq("id", model.id);

        if (updateError) {
          console.error(`  Failed to update actor: ${updateError.message}`);
          errors++;
          continue;
        }
      }

      console.log(`  Fixed!`);
      fixed++;
    } catch (err) {
      console.error(`  Error: ${err}`);
      errors++;
    }
  }

  console.log("\n========================================");
  console.log("SUMMARY");
  console.log("========================================");
  console.log(`Already OK: ${alreadyOk}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${models.length}`);
}

fixOrphanActors().catch(console.error);
