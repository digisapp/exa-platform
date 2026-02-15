import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMAIL = "itspresplay@gmail.com";

async function main() {
  // 1. Find the imported model record
  const { data: model } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name, is_approved")
    .eq("email", EMAIL)
    .single();

  if (!model) {
    console.error("Model not found for email:", EMAIL);
    return;
  }

  console.log("Found model:");
  console.log("  ID:", model.id);
  console.log("  Name:", model.first_name, model.last_name);
  console.log("  Username:", model.username);
  console.log("  user_id:", model.user_id);
  console.log("  is_approved:", model.is_approved);

  if (model.user_id) {
    console.log("\nModel already has user_id linked!");
    return;
  }

  // 2. Find existing auth user
  const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let authUser = listData?.users?.find(
    (u) => u.email?.toLowerCase() === EMAIL.toLowerCase()
  );

  if (!authUser && listData?.users?.length === 1000) {
    let page = 2;
    while (!authUser) {
      const { data: moreData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (!moreData?.users?.length) break;
      authUser = moreData.users.find(
        (u) => u.email?.toLowerCase() === EMAIL.toLowerCase()
      );
      if (moreData.users.length < 1000) break;
      page++;
    }
  }

  if (!authUser) {
    console.error("No auth user found for:", EMAIL);
    return;
  }

  const userId = authUser.id;
  console.log("\nFound auth user:", userId);
  console.log("  Email confirmed:", authUser.email_confirmed_at ? "yes" : "no");

  // Ensure email is confirmed
  if (!authUser.email_confirmed_at) {
    console.log("  Confirming email...");
    await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
  }

  // 3. Check actor by user_id (she may have signed up as fan)
  const { data: actorByUserId } = await supabase
    .from("actors")
    .select("id, user_id, type")
    .eq("user_id", userId)
    .single();

  // Also check if an actor exists for the model ID
  const { data: actorByModelId } = await supabase
    .from("actors")
    .select("id, user_id, type")
    .eq("id", model.id)
    .single();

  console.log("\nActor by user_id:", actorByUserId ? `${actorByUserId.id} (type: ${actorByUserId.type})` : "none");
  console.log("Actor by model_id:", actorByModelId ? `${actorByModelId.id} (type: ${actorByModelId.type})` : "none");

  // If she has a fan actor, update it to model type
  if (actorByUserId && actorByUserId.id !== model.id) {
    console.log("\nShe has a separate fan actor. Updating type to 'model'...");
    await supabase
      .from("actors")
      .update({ type: "model" })
      .eq("id", actorByUserId.id);
  }

  // If model has its own actor without user_id, link it
  if (actorByModelId && !actorByModelId.user_id) {
    console.log("\nModel actor exists without user_id. Linking...");
    await supabase
      .from("actors")
      .update({ user_id: userId, type: "model" })
      .eq("id", model.id);
  } else if (!actorByModelId && !actorByUserId) {
    // No actor at all, create one
    console.log("\nCreating actor record...");
    await supabase.from("actors").insert({
      id: model.id,
      user_id: userId,
      type: "model",
    });
  }

  // 4. Link model to auth user
  console.log("\nLinking model to auth user...");
  const { error: modelError } = await supabase
    .from("models")
    .update({
      user_id: userId,
      claimed_at: new Date().toISOString(),
      is_approved: true,
    })
    .eq("id", model.id);

  if (modelError) {
    console.error("Error updating model:", modelError.message);
    return;
  }

  // 5. Send password reset email
  console.log("\nSending password reset email...");
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: EMAIL,
    options: {
      redirectTo: `${origin}/auth/reset-password`,
    },
  });

  if (linkError) {
    console.error("Error generating reset link:", linkError.message);
    console.log("She can use 'Forgot Password' on the sign-in page.");
  } else if (linkData?.properties?.action_link) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EXA Models <no-reply@examodels.com>",
        to: EMAIL,
        subject: "Set Your EXA Models Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to EXA Models!</h2>
            <p>Hi ${model.first_name || "there"},</p>
            <p>Your model account has been set up. Click the link below to set your password and access your dashboard:</p>
            <p style="margin: 24px 0;">
              <a href="${linkData.properties.action_link}"
                 style="background: linear-gradient(to right, #ec4899, #8b5cf6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Set Your Password
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If it expires, use "Forgot Password" on the sign-in page.</p>
            <p style="color: #666; font-size: 14px;">— The EXA Models Team</p>
          </div>
        `,
      }),
    });

    if (res.ok) {
      console.log("Password reset email sent to:", EMAIL);
    } else {
      const errBody = await res.text();
      console.error("Failed to send email:", errBody);
      console.log("She can use 'Forgot Password' on the sign-in page.");
    }
  }

  // 6. Verify final state
  const { data: finalModel } = await supabase
    .from("models")
    .select("id, username, email, user_id, is_approved, claimed_at")
    .eq("id", model.id)
    .single();

  console.log("\n✓ Account setup complete!");
  console.log("  Name:", model.first_name, model.last_name);
  console.log("  Username:", finalModel?.username);
  console.log("  Email:", finalModel?.email);
  console.log("  user_id:", finalModel?.user_id);
  console.log("  is_approved:", finalModel?.is_approved);
  console.log("  claimed_at:", finalModel?.claimed_at);
  console.log("  Profile: https://www.examodels.com/" + finalModel?.username);
  console.log("\n  A password reset email has been sent.");
  console.log("  She can click the link to set her password and sign in.");
}

main().catch(console.error);
