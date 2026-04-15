import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("=== Instagram Dot Audit ===\n");

  // 1. Find all model_applications with a dot in instagram_username
  const { data: appsWithDot, error: appsError } = await supabase
    .from("model_applications")
    .select("id, user_id, display_name, email, instagram_username, status, created_at")
    .like("instagram_username", "%.%")
    .order("created_at", { ascending: false });

  if (appsError) {
    console.error("Error fetching applications:", appsError);
    return;
  }

  console.log(`Applications with a dot in instagram_username: ${appsWithDot?.length || 0}`);
  console.log("──────────────────────────────────────────────────────────────\n");

  const mismatchedModels: any[] = [];
  const correctModels: any[] = [];
  const unapprovedApps: any[] = [];

  for (const app of appsWithDot || []) {
    if (app.status !== "approved") {
      unapprovedApps.push(app);
      continue;
    }

    if (!app.user_id) continue;

    // Find the approved model for this application
    const { data: model } = await supabase
      .from("models")
      .select("id, username, instagram_name, instagram_url, first_name, last_name, email")
      .eq("user_id", app.user_id)
      .single();

    if (!model) continue;

    const appIG = app.instagram_username; // e.g. "kimmy.valentine"
    const modelIG = model.instagram_name; // e.g. "kimmyvalentine" (wrong) or "kimmy.valentine" (right)
    const strippedIG = appIG?.replace(/\./g, ""); // e.g. "kimmyvalentine"

    const isDotStripped = modelIG && modelIG.toLowerCase() === strippedIG?.toLowerCase();
    const isMissing = !modelIG;
    const isCorrect = modelIG?.toLowerCase() === appIG?.toLowerCase();

    if (isDotStripped || isMissing) {
      mismatchedModels.push({
        username: model.username,
        name: `${model.first_name || ""} ${model.last_name || ""}`.trim() || app.display_name,
        email: model.email,
        appIG,
        modelIG: modelIG || "(null)",
        strippedIG,
        instagram_url: model.instagram_url,
        modelId: model.id,
      });
    } else if (isCorrect) {
      correctModels.push({
        username: model.username,
        name: `${model.first_name || ""} ${model.last_name || ""}`.trim() || app.display_name,
        appIG,
        modelIG,
      });
    }
  }

  // 2. Also check ALL approved models: find any where instagram_name has no dot
  //    but instagram_url has a dot in the path (a sign the URL was set correctly earlier)
  const { data: allModels, error: modelsError } = await supabase
    .from("models")
    .select("id, username, instagram_name, instagram_url, first_name, last_name, email")
    .not("instagram_url", "is", null)
    .eq("is_approved", true);

  if (modelsError) {
    console.error("Error fetching models:", modelsError);
  }

  const urlMismatch: any[] = [];
  for (const m of allModels || []) {
    if (!m.instagram_name || !m.instagram_url) continue;
    // Extract path from instagram_url
    const urlHandle = m.instagram_url
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .split("/")[0]
      .split("?")[0]
      .toLowerCase();
    const nameHandle = m.instagram_name.replace(/^@/, "").toLowerCase();

    if (urlHandle !== nameHandle && urlHandle.includes(".")) {
      // instagram_url has a dot but instagram_name doesn't match
      urlMismatch.push({
        username: m.username,
        name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
        instagram_name: m.instagram_name,
        instagram_url: m.instagram_url,
        urlHandle,
        nameHandle,
      });
    }
  }

  // ─── PRINT RESULTS ───────────────────────────────────────────────────────

  console.log(`\n✅ CORRECT (dot preserved in instagram_name): ${correctModels.length}`);
  for (const m of correctModels) {
    console.log(`  @${m.username} → instagram_name: ${m.modelIG}`);
  }

  console.log(`\n❌ BROKEN (dot stripped from instagram_name): ${mismatchedModels.length}`);
  if (mismatchedModels.length === 0) {
    console.log("  None found.");
  }
  for (const m of mismatchedModels) {
    console.log(`  @${m.username} | ${m.name} | ${m.email}`);
    console.log(`    Application IG : ${m.appIG}`);
    console.log(`    Stored IG name : ${m.modelIG}`);
    console.log(`    instagram_url  : ${m.instagram_url || "(null)"}`);
    console.log(`    Correct link   : https://instagram.com/${m.appIG}`);
    console.log(`    Broken link    : https://instagram.com/${m.modelIG}`);
    console.log();
  }

  console.log(`\n⚠️  PENDING/REJECTED applications with dot (not yet approved): ${unapprovedApps.length}`);
  for (const a of unapprovedApps) {
    console.log(`  ${a.display_name} | ${a.email} | IG: ${a.instagram_username} | status: ${a.status}`);
  }

  console.log(`\n🔍 instagram_url has dot but instagram_name doesn't match: ${urlMismatch.length}`);
  for (const m of urlMismatch) {
    console.log(`  @${m.username} | instagram_name: "${m.nameHandle}" | url handle: "${m.urlHandle}"`);
    console.log(`    Stored URL: ${m.instagram_url}`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total applications with dotted Instagram: ${appsWithDot?.length || 0}`);
  console.log(`  Approved & correct (dot preserved): ${correctModels.length}`);
  console.log(`  Approved & broken (dot stripped):   ${mismatchedModels.length}`);
  console.log(`  Not yet approved:                   ${unapprovedApps.length}`);
  console.log(`  URL vs name mismatch (possible fix): ${urlMismatch.length}`);
}

main().catch(console.error);
