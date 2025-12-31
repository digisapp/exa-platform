const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function convertToModels() {
  const femaleEmails = [
    "aryeona@outlook.com",
    "itsssshaylaa@gmail.com",
    "brookechirichello16@icloud.com",
    "hautumn211@gmail.com",
    "noelletthomas@outlook.com",
    "noelle1110@comcast.net",
    "verrellixox@gmail.com",
    "vieana.p@yahoo.com",
    "briannaungaro@gmail.com"
  ];

  console.log("=== CONVERTING FANS TO MODELS ===\n");

  for (const email of femaleEmails) {
    const { data: fan } = await supabase
      .from("fans")
      .select("id, user_id, email, display_name, phone")
      .eq("email", email)
      .single();

    if (!fan) {
      console.log("Fan not found:", email);
      continue;
    }

    let username = (fan.display_name || "").toLowerCase().replace(/[^a-z0-9]/g, "") ||
                   email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

    const { data: existing } = await supabase
      .from("models")
      .select("username")
      .eq("username", username)
      .single();

    if (existing) {
      username = username + Math.floor(Math.random() * 1000);
    }

    const nameParts = (fan.display_name || "").trim().split(" ");
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(" ") || null;

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", fan.user_id)
      .single();

    if (!actor) {
      console.log("Actor not found for:", email);
      continue;
    }

    const { error: actorError } = await supabase
      .from("actors")
      .update({ type: "model" })
      .eq("id", actor.id);

    if (actorError) {
      console.log("Error updating actor:", actorError.message);
      continue;
    }

    const inviteToken = require("crypto").randomBytes(16).toString("hex");

    const { error: modelError } = await supabase
      .from("models")
      .insert({
        id: actor.id,
        user_id: fan.user_id,
        email: fan.email,
        username: username,
        first_name: firstName,
        last_name: lastName,
        phone: fan.phone || null,
        is_approved: false,
        invite_token: inviteToken,
        profile_views: 0,
        coin_balance: 0,
      });

    if (modelError) {
      console.log("Error creating model:", email, modelError.message);
      await supabase.from("actors").update({ type: "fan" }).eq("id", actor.id);
      continue;
    }

    await supabase.from("fans").delete().eq("id", fan.id);

    console.log("Converted:", fan.display_name, "(" + email + ") -> @" + username);
  }

  const { count: fanCount } = await supabase.from("fans").select("*", { count: "exact", head: true });
  const { count: modelCount } = await supabase.from("models").select("*", { count: "exact", head: true });

  console.log("\n=== DONE ===");
  console.log("Remaining fans:", fanCount);
  console.log("Total models:", modelCount);
}

convertToModels();
