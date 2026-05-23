/**
 * Correct Angelina Morris's email across models / model_applications / auth.users.
 * Application was submitted with the typo "angelina_morros@icloud.com"; correct
 * address is "angelina_morris@icloud.com".
 *
 * Run: npx tsx scripts/fix-angelina-morris-email.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const USERNAME = "angelinamorris_";
const CORRECT_EMAIL = "angelina_morris@icloud.com";
const TYPO_EMAIL = "angelina_morros@icloud.com";

async function main() {
  const { data: model, error: mErr } = await supabase
    .from("models")
    .select("id, user_id, username, first_name, last_name, email")
    .eq("username", USERNAME)
    .maybeSingle();
  if (mErr || !model) {
    console.error("Model not found for username", USERNAME, mErr);
    process.exit(1);
  }
  console.log("Model:", model);

  const { data: app } = await supabase
    .from("model_applications")
    .select("id, display_name, email, status, user_id")
    .eq("user_id", model.user_id)
    .maybeSingle();
  console.log("Application:", app);

  const { data: { user: authUser } } = await supabase.auth.admin.getUserById(model.user_id);
  console.log("Auth user:", authUser ? { id: authUser.id, email: authUser.email } : null);

  console.log("\n=== Updates ===");

  if (model.email !== CORRECT_EMAIL) {
    const { error } = await supabase.from("models").update({ email: CORRECT_EMAIL }).eq("id", model.id);
    console.log("models.email:", error ?? `updated -> ${CORRECT_EMAIL}`);
  } else {
    console.log("models.email: already correct");
  }

  if (app && app.email !== CORRECT_EMAIL) {
    const { error } = await supabase
      .from("model_applications")
      .update({ email: CORRECT_EMAIL })
      .eq("id", app.id);
    console.log("model_applications.email:", error ?? `updated -> ${CORRECT_EMAIL}`);
  } else if (app) {
    console.log("model_applications.email: already correct");
  } else {
    console.log("model_applications: no row");
  }

  if (authUser && authUser.email !== CORRECT_EMAIL) {
    const { error } = await supabase.auth.admin.updateUserById(model.user_id, {
      email: CORRECT_EMAIL,
      email_confirm: true,
    });
    console.log("auth.users.email:", error ?? `updated -> ${CORRECT_EMAIL}`);
  } else if (authUser) {
    console.log("auth.users.email: already correct");
  }

  // Sanity: warn if the typo address still exists on a different account.
  const { data: typoModel } = await supabase
    .from("models")
    .select("id, username, email")
    .eq("email", TYPO_EMAIL)
    .maybeSingle();
  if (typoModel) console.log("WARN: another model still has typo email:", typoModel);
}

main().catch((e) => { console.error(e); process.exit(1); });
