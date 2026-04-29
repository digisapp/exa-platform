/**
 * Diagnostic + fix script for Ami Cevallos fan-to-model conversion.
 * Run: npx tsx scripts/fix-ami-cevallos.ts
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

const EMAIL = "amicevallos@gmail.com";

async function main() {
  console.log("=== Diagnosing", EMAIL, "===\n");

  // 1. Find user_id — try fans, actors (via ghost model email), or direct auth search
  let userId: string | undefined;

  const { data: fanByEmail } = await supabase.from("fans").select("user_id").eq("email", EMAIL).maybeSingle();
  userId = fanByEmail?.user_id;

  if (!userId) {
    // Search auth users by email (paginate through all)
    let page = 1;
    outer: while (true) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (!users.length) break;
      for (const u of users) {
        if (u.email === EMAIL) { userId = u.id; break outer; }
      }
      if (users.length < 1000) break;
      page++;
    }
  }

  if (!userId) { console.error("Cannot find user_id for", EMAIL); process.exit(1); }

  const { data: { user: authUser }, error: authErr } = await supabase.auth.admin.getUserById(userId);
  if (authErr || !authUser) { console.error("Auth user fetch error:", authErr); process.exit(1); }
  console.log("auth.users:", { id: authUser.id, email: authUser.email });

  // 2. Actor record
  const { data: actor } = await supabase.from("actors").select("*").eq("user_id", authUser.id).single();
  console.log("actors row:", actor);

  // 3. Fan record
  const { data: fan } = await supabase.from("fans").select("*").eq("user_id", authUser.id).maybeSingle();
  console.log("fans row:", fan);

  // 4. Model record
  const { data: model } = await supabase.from("models").select("id, username, email, is_approved, user_id").eq("user_id", authUser.id).maybeSingle();
  console.log("models row:", model);

  if (!actor) { console.error("\nNo actor record — cannot proceed."); process.exit(1); }

  // 4b. Check for ghost model with same email but different user_id
  const { data: ghostModel } = await supabase.from("models").select("id, username, email, user_id, is_approved").eq("email", EMAIL).maybeSingle();
  console.log("ghost model by email:", ghostModel);

  console.log("\n=== Performing conversion ===\n");

  // Step 1: set actor type to model
  const { error: e1 } = await supabase.from("actors").update({ type: "model" }).eq("user_id", authUser.id);
  console.log("actor update:", e1 ?? "OK");

  // Step 1b: remap ghost model's email so the unique constraint doesn't block us
  if (ghostModel && ghostModel.user_id !== authUser.id) {
    const placeholder = `orphan+${ghostModel.id}@placeholder.invalid`;
    const { error: ghostErr } = await supabase.from("models").update({ email: placeholder }).eq("id", ghostModel.id);
    console.log("remap ghost model email (id=" + ghostModel.id + "):", ghostErr ?? "OK");
  }

  // Step 2: create or update model record
  if (model) {
    const { error: e2 } = await supabase.from("models")
      .update({ email: EMAIL, is_approved: true, coin_balance: fan?.coin_balance ?? 0 })
      .eq("user_id", authUser.id);
    console.log("model update:", e2 ?? "OK");
  } else {
    const username = "amicevallos" + Math.random().toString(36).slice(2, 6);
    const { error: e2 } = await supabase.from("models").insert({
      id: actor.id,
      user_id: authUser.id,
      email: EMAIL,
      username,
      first_name: fan?.display_name || "Ami",
      last_name: "Cevallos",
      is_approved: true,
      coin_balance: fan?.coin_balance ?? 0,
    });
    console.log("model insert (username=" + username + "):", e2 ?? "OK");
    if (e2) { console.error("DETAIL:", e2); }
  }

  // Step 3: delete fan record
  if (fan) {
    const { error: e3 } = await supabase.from("fans").delete().eq("user_id", authUser.id);
    console.log("fan delete:", e3 ?? "OK");
  } else {
    console.log("fan delete: no fan row to delete");
  }

  console.log("\nDone.");
}

main().catch(console.error);
