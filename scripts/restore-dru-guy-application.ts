import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function restoreApplication() {
  // Find Dru Guy's model ID
  const { data: model, error: modelError } = await supabase
    .from("models")
    .select("id, first_name, username")
    .eq("username", "druguy02")
    .single();

  if (modelError || !model) {
    console.error("Model not found:", modelError);
    return;
  }

  console.log("Found model:", model);

  // Find Miami Swim Week gig
  const { data: gig, error: gigError } = await supabase
    .from("gigs")
    .select("id, title")
    .ilike("title", "%miami%swim%")
    .single();

  if (gigError || !gig) {
    // Try alternative search
    const { data: gigs } = await supabase
      .from("gigs")
      .select("id, title")
      .ilike("title", "%miami%");

    console.log("Available Miami gigs:", gigs);

    if (!gigs || gigs.length === 0) {
      console.error("No Miami gig found");
      return;
    }

    // Use the first Miami gig found
    console.log("Using gig:", gigs[0]);

    // Check if application already exists
    const { data: existingApp } = await supabase
      .from("gig_applications")
      .select("id, status")
      .eq("gig_id", gigs[0].id)
      .eq("model_id", model.id)
      .single();

    if (existingApp) {
      console.log("Application already exists:", existingApp);
      return;
    }

    // Insert the application
    const { data: newApp, error: insertError } = await supabase
      .from("gig_applications")
      .insert({
        gig_id: gigs[0].id,
        model_id: model.id,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to restore application:", insertError);
      return;
    }

    console.log("Application restored successfully:", newApp);
    return;
  }

  console.log("Found gig:", gig);

  // Check if application already exists
  const { data: existingApp } = await supabase
    .from("gig_applications")
    .select("id, status")
    .eq("gig_id", gig.id)
    .eq("model_id", model.id)
    .single();

  if (existingApp) {
    console.log("Application already exists:", existingApp);

    // Update to pending status
    const { data: updatedApp, error: updateError } = await supabase
      .from("gig_applications")
      .update({ status: "pending", reviewed_at: null })
      .eq("id", existingApp.id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update application:", updateError);
      return;
    }

    console.log("Application restored to pending:", updatedApp);
    return;
  }

  // Insert the application
  const { data: newApp, error: insertError } = await supabase
    .from("gig_applications")
    .insert({
      gig_id: gig.id,
      model_id: model.id,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to restore application:", insertError);
    return;
  }

  console.log("Application restored successfully:", newApp);
}

restoreApplication();
