import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// OLD auth (typo'd email, has the real model record)
const OLD_UID = "95b87510-e252-4a31-8f48-8008d8304df7";
// NEW auth (correct email, has only an empty fan/actor)
const NEW_UID = "2063bfc0-c23a-4541-9695-07e65338e20f";

// Her real model record (stays the same id, just changes user_id)
const MODEL_ID = "d770b873-86f7-480b-b20a-8a5d4accf99e";
// The orphan actor/fan that lives on NEW_UID (Astrogirl)
const ORPHAN_ID = "f7409c73-3b4d-4ab5-832f-e9bd28b7ac48";

const CORRECT_EMAIL = "nataliefernandez23nsr@gmail.com";

async function step(label: string, fn: () => Promise<any>) {
  console.log(`\n--- ${label} ---`);
  const r = await fn();
  console.log(r);
  return r;
}

async function main() {
  // --- Snapshot before ---
  await step("Snapshot: model record", async () => {
    const { data } = await supabase.from("models").select("id, user_id, username, email, is_approved").eq("id", MODEL_ID).single();
    return data;
  });
  await step("Snapshot: actors", async () => {
    const { data } = await supabase.from("actors").select("*").in("user_id", [OLD_UID, NEW_UID]);
    return data;
  });
  await step("Snapshot: fans", async () => {
    const { data } = await supabase.from("fans").select("id, display_name, coin_balance").in("user_id", [OLD_UID, NEW_UID]);
    return data;
  });

  // --- 1. Delete orphan fan (Astrogirl) on NEW user ---
  await step("Delete orphan fan (Astrogirl)", async () => {
    return await supabase.from("fans").delete().eq("id", ORPHAN_ID);
  });

  // --- 2. Delete orphan actor on NEW user ---
  await step("Delete orphan actor on NEW user", async () => {
    return await supabase.from("actors").delete().eq("id", ORPHAN_ID);
  });

  // --- 3. Re-point the real actor (model d770b873) to NEW user ---
  await step("Move actor → NEW user", async () => {
    return await supabase
      .from("actors")
      .update({ user_id: NEW_UID })
      .eq("id", MODEL_ID)
      .select();
  });

  // --- 4. Re-point the model row to NEW user (+ ensure email is correct) ---
  await step("Move model → NEW user (and set email)", async () => {
    return await supabase
      .from("models")
      .update({ user_id: NEW_UID, email: CORRECT_EMAIL })
      .eq("id", MODEL_ID)
      .select("id, user_id, username, email, is_approved");
  });

  // --- 5. Verify everything looks right BEFORE deleting OLD auth ---
  await step("Verify: model now linked to NEW", async () => {
    const { data: m } = await supabase.from("models").select("id, user_id, email").eq("id", MODEL_ID).single();
    const { data: a } = await supabase.from("actors").select("id, user_id, type").eq("id", MODEL_ID).single();
    return { model: m, actor: a };
  });
  await step("Verify: no leftover records on OLD user", async () => {
    const { data: a } = await supabase.from("actors").select("*").eq("user_id", OLD_UID);
    const { data: m } = await supabase.from("models").select("id, username").eq("user_id", OLD_UID);
    const { data: f } = await supabase.from("fans").select("id").eq("user_id", OLD_UID);
    return { actors: a, models: m, fans: f };
  });

  // --- 6. Delete OLD auth user (typo'd email) ---
  await step("Delete OLD auth user (typo'd email)", async () => {
    return await supabase.auth.admin.deleteUser(OLD_UID);
  });

  // --- Final state ---
  await step("Final: NEW auth user", async () => {
    const { data } = await supabase.auth.admin.getUserById(NEW_UID);
    return { id: data.user?.id, email: data.user?.email, last_sign_in_at: data.user?.last_sign_in_at };
  });
  await step("Final: OLD auth user (should be gone)", async () => {
    const { data, error } = await supabase.auth.admin.getUserById(OLD_UID);
    return { found: !!data.user, error: error?.message };
  });
  await step("Final: Natalie's model + applications", async () => {
    const { data: model } = await supabase.from("models").select("id, user_id, username, email, is_approved").eq("id", MODEL_ID).single();
    const { data: apps } = await supabase.from("gig_applications").select("id, gig_id, status, applied_at").eq("model_id", MODEL_ID);
    return { model, applications: apps };
  });

  console.log("\n✓ Migration complete");
}

main().catch((e) => { console.error("\n✗ FAILED:", e); process.exit(1); });
