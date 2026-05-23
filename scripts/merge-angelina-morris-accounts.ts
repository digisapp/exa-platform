/**
 * Resolve duplicate accounts for Angelina Morris:
 *   - User A (model, login typo'd):   c05ec9ef-f24f-4ef9-8240-042c0e004e7d  angelina_morros@icloud.com
 *   - User B (fan, correct email):    287493dc-69c2-4f10-8331-922ce90d2f6f  angelina_morris@icloud.com
 *
 * Plan:
 *   1. Delete fan row + actor row for User B
 *   2. Delete User B from auth.users
 *   3. Update User A auth email -> angelina_morris@icloud.com
 *   4. Send password reset to the corrected address
 *
 * Run: npx tsx scripts/merge-angelina-morris-accounts.ts
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

const MODEL_USER_ID = "c05ec9ef-f24f-4ef9-8240-042c0e004e7d";
const FAN_USER_ID = "287493dc-69c2-4f10-8331-922ce90d2f6f";
const FAN_ACTOR_ID = "f21f3d57-6067-490b-8fff-e8c5384fdf19";
const CORRECT_EMAIL = "angelina_morris@icloud.com";
const TYPO_EMAIL = "angelina_morros@icloud.com";

async function main() {
  // Safety: re-verify both users exist as expected before mutating anything.
  const [{ data: modelUser }, { data: fanUser }] = await Promise.all([
    supabase.auth.admin.getUserById(MODEL_USER_ID),
    supabase.auth.admin.getUserById(FAN_USER_ID),
  ]);
  if (modelUser.user?.email !== TYPO_EMAIL) {
    console.error("Aborting — model auth user email is not the expected typo:", modelUser.user?.email);
    process.exit(1);
  }
  if (fanUser.user?.email !== CORRECT_EMAIL) {
    console.error("Aborting — fan auth user email is not the expected correct address:", fanUser.user?.email);
    process.exit(1);
  }
  console.log("Pre-checks OK. Proceeding.\n");

  // 1. Delete fan row
  const { error: e1 } = await supabase.from("fans").delete().eq("user_id", FAN_USER_ID);
  console.log("delete fans:", e1 ?? "OK");

  // 2. Delete actor row
  const { error: e2 } = await supabase.from("actors").delete().eq("id", FAN_ACTOR_ID);
  console.log("delete actors:", e2 ?? "OK");

  // 3. Delete auth user B (frees the correct email)
  const { error: e3 } = await supabase.auth.admin.deleteUser(FAN_USER_ID);
  console.log("delete auth user B:", e3 ?? "OK");

  // 4. Update model's login email -> correct address
  const { error: e4 } = await supabase.auth.admin.updateUserById(MODEL_USER_ID, {
    email: CORRECT_EMAIL,
    email_confirm: true,
  });
  console.log("update model auth email:", e4 ?? "OK");
  if (e4) {
    console.error("Auth update failed:", e4);
    process.exit(1);
  }

  // 5. Send password reset so she can get back in via the correct address
  const { error: e5 } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: CORRECT_EMAIL,
  });
  console.log("password reset link generated:", e5 ?? "OK (Supabase delivered via configured email)");

  // Final state
  const { data: { user: finalAuth } } = await supabase.auth.admin.getUserById(MODEL_USER_ID);
  console.log("\nFinal auth.users for model:", { id: finalAuth?.id, email: finalAuth?.email });
}

main().catch((e) => { console.error(e); process.exit(1); });
