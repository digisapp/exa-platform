/**
 * One-off: apply model Mekyla Li (@themekylali) to the Miami Swim Week gig.
 * Run: npx tsx scripts/apply-mekyla-to-msw.ts
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

async function main() {
  // 1. Find the model — try by username, then by instagram handle, then by name.
  const tries = [
    supabase.from("models").select("id, username, first_name, last_name, instagram_url, is_approved, user_id").eq("username", "themekylali").maybeSingle(),
    supabase.from("models").select("id, username, first_name, last_name, instagram_url, is_approved, user_id").ilike("instagram_url", "%themekylali%").maybeSingle(),
    supabase.from("models").select("id, username, first_name, last_name, instagram_url, is_approved, user_id").ilike("first_name", "Mekyla").maybeSingle(),
  ];

  let model: any = null;
  for (const p of tries) {
    const { data } = await p;
    if (data) { model = data; break; }
  }

  if (!model) {
    console.error("Could not find model Mekyla Li (@themekylali).");
    process.exit(1);
  }
  console.log("Model:", model);

  // 2. Find the Miami Swim Week gig (open status).
  const { data: gigs, error: gigErr } = await supabase
    .from("gigs")
    .select("id, title, slug, status, spots, spots_filled, created_at")
    .or("title.ilike.%miami swim%,slug.ilike.%miami-swim%,slug.ilike.%msw%")
    .order("created_at", { ascending: false });

  if (gigErr) { console.error("Gig fetch error:", gigErr); process.exit(1); }
  console.log("\nMatching gigs:", gigs);

  if (!gigs || gigs.length === 0) {
    console.error("No Miami Swim Week gig found.");
    process.exit(1);
  }

  // Prefer an open gig; fall back to most recent.
  const gig = gigs.find(g => g.status === "open") ?? gigs[0];
  console.log("\nUsing gig:", gig);

  // 3. Check for existing application.
  const { data: existing } = await supabase
    .from("gig_applications")
    .select("id, status, created_at")
    .eq("gig_id", gig.id)
    .eq("model_id", model.id)
    .maybeSingle();

  if (existing) {
    console.log("\nAlready applied:", existing);
    process.exit(0);
  }

  // 4. Insert application as pending. (Service role bypasses RLS; we are
  // intentionally not enforcing the "approved + complete profile" checks the
  // API does — admin doing this on behalf of the model.)
  const { data: app, error: insErr } = await supabase
    .from("gig_applications")
    .insert({ gig_id: gig.id, model_id: model.id, status: "pending" })
    .select()
    .single();

  if (insErr) { console.error("Insert error:", insErr); process.exit(1); }
  console.log("\nApplication created:", app);

  // 5. If the gig has a spot cap, bump spots_filled to match what the API would do.
  if (gig.spots) {
    const { data: fresh } = await supabase.from("gigs").select("spots_filled").eq("id", gig.id).single();
    const current = fresh?.spots_filled ?? 0;
    if (current < (gig.spots ?? Infinity)) {
      const { error: upErr } = await supabase.from("gigs").update({ spots_filled: current + 1 }).eq("id", gig.id);
      if (upErr) console.warn("spots_filled bump failed (non-fatal):", upErr);
      else console.log(`spots_filled: ${current} -> ${current + 1}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
