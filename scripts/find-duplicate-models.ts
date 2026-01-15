import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Model {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  instagram_handle?: string | null;
  instagram_name?: string | null;
  tiktok_handle?: string | null;
  tiktok_username?: string | null;
  phone: string | null;
  created_at: string;
  is_approved: boolean;
  [key: string]: any; // Allow any other columns
}

async function findDuplicates() {
  console.log("Scanning for duplicate models...\n");

  // Get total count first
  const { count: totalCount } = await supabase
    .from("models")
    .select("*", { count: "exact", head: true });

  console.log(`Total models in database: ${totalCount}`);

  // Fetch all models with pagination
  const allModels: Model[] = [];
  const pageSize = 1000;
  let page = 0;

  while (true) {
    const { data: pageData, error: pageError } = await supabase
      .from("models")
      .select("*")
      .order("created_at", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (pageError) {
      console.error("Error fetching page:", pageError);
      break;
    }

    if (!pageData || pageData.length === 0) break;

    allModels.push(...pageData);
    console.log(`Fetched ${allModels.length} models...`);

    if (pageData.length < pageSize) break;
    page++;
  }

  const models = allModels;
  const error = null;

  if (error) {
    console.error("Error fetching models:", error);
    return;
  }

  if (!models || models.length === 0) {
    console.log("No models found.");
    return;
  }

  console.log(`Total models: ${models.length}`);
  console.log(`Sample columns: ${Object.keys(models[0]).join(", ")}\n`);

  const duplicates: { type: string; models: Model[] }[] = [];

  // Check for duplicate emails
  const emailMap = new Map<string, Model[]>();
  for (const model of models) {
    if (model.email) {
      const key = model.email.toLowerCase().trim();
      if (!emailMap.has(key)) emailMap.set(key, []);
      emailMap.get(key)!.push(model);
    }
  }
  for (const [email, group] of emailMap) {
    if (group.length > 1) {
      duplicates.push({ type: `Email: ${email}`, models: group });
    }
  }

  // Check for duplicate names (first + last)
  const nameMap = new Map<string, Model[]>();
  for (const model of models) {
    if (model.first_name && model.last_name) {
      const key = `${model.first_name.toLowerCase().trim()} ${model.last_name.toLowerCase().trim()}`;
      if (key.length > 3) { // Skip very short names
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(model);
      }
    }
  }
  for (const [name, group] of nameMap) {
    if (group.length > 1) {
      duplicates.push({ type: `Name: ${name}`, models: group });
    }
  }

  // Check for duplicate Instagram usernames
  const igMap = new Map<string, Model[]>();
  for (const model of models) {
    const ig = model.instagram_handle || model.instagram_name || model.instagram;
    if (ig) {
      const key = ig.toLowerCase().trim().replace(/^@/, "");
      if (key.length > 0) {
        if (!igMap.has(key)) igMap.set(key, []);
        igMap.get(key)!.push(model);
      }
    }
  }
  for (const [ig, group] of igMap) {
    if (group.length > 1) {
      duplicates.push({ type: `Instagram: @${ig}`, models: group });
    }
  }

  // Check for duplicate TikTok usernames
  const ttMap = new Map<string, Model[]>();
  for (const model of models) {
    const tt = model.tiktok_handle || model.tiktok_username || model.tiktok;
    if (tt) {
      const key = tt.toLowerCase().trim().replace(/^@/, "");
      if (key.length > 0) {
        if (!ttMap.has(key)) ttMap.set(key, []);
        ttMap.get(key)!.push(model);
      }
    }
  }
  for (const [tt, group] of ttMap) {
    if (group.length > 1) {
      duplicates.push({ type: `TikTok: @${tt}`, models: group });
    }
  }

  // Check for duplicate phone numbers
  const phoneMap = new Map<string, Model[]>();
  for (const model of models) {
    if (model.phone) {
      const key = model.phone.replace(/\D/g, ""); // Remove non-digits
      if (key.length >= 10) {
        if (!phoneMap.has(key)) phoneMap.set(key, []);
        phoneMap.get(key)!.push(model);
      }
    }
  }
  for (const [phone, group] of phoneMap) {
    if (group.length > 1) {
      duplicates.push({ type: `Phone: ${phone}`, models: group });
    }
  }

  // Print results
  if (duplicates.length === 0) {
    console.log("✅ No duplicates found!");
  } else {
    console.log(`⚠️  Found ${duplicates.length} potential duplicate groups:\n`);
    console.log("=".repeat(80));

    for (const dup of duplicates) {
      console.log(`\n${dup.type}`);
      console.log("-".repeat(40));
      for (const model of dup.models) {
        const name = [model.first_name, model.last_name].filter(Boolean).join(" ") || "(no name)";
        const status = model.is_approved ? "✓ approved" : "✗ not approved";
        console.log(`  • ${name}`);
        console.log(`    ID: ${model.id}`);
        console.log(`    Email: ${model.email}`);
        const ig = model.instagram_handle || model.instagram_name || model.instagram || "-";
        const tt = model.tiktok_handle || model.tiktok_username || model.tiktok || "-";
        console.log(`    IG: ${ig} | TikTok: ${tt}`);
        console.log(`    Created: ${new Date(model.created_at).toLocaleDateString()} | ${status}`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("\nSummary:");
    console.log(`- Duplicate emails: ${[...emailMap.values()].filter(g => g.length > 1).length}`);
    console.log(`- Duplicate names: ${[...nameMap.values()].filter(g => g.length > 1).length}`);
    console.log(`- Duplicate Instagram: ${[...igMap.values()].filter(g => g.length > 1).length}`);
    console.log(`- Duplicate TikTok: ${[...ttMap.values()].filter(g => g.length > 1).length}`);
    console.log(`- Duplicate phones: ${[...phoneMap.values()].filter(g => g.length > 1).length}`);
  }
}

async function findApplicationDuplicates() {
  console.log("\n\n" + "=".repeat(80));
  console.log("Checking model applications against existing models...\n");

  // Get pending applications
  const { data: applications, error: appError } = await supabase
    .from("model_applications")
    .select("*")
    .eq("status", "pending");

  if (appError) {
    console.error("Error fetching applications:", appError);
    return;
  }

  if (!applications || applications.length === 0) {
    console.log("No pending applications.");
    return;
  }

  console.log(`Pending applications: ${applications.length}`);

  // Get all models
  const { data: models } = await supabase
    .from("models")
    .select("id, email, instagram_name, tiktok_username, first_name, last_name");

  if (!models) return;

  const modelEmails = new Set(models.map(m => m.email?.toLowerCase().trim()).filter(Boolean));
  const modelIGs = new Set(models.map(m => (m.instagram_name || "").toLowerCase().trim().replace(/^@/, "")).filter(Boolean));
  const modelTTs = new Set(models.map(m => (m.tiktok_username || "").toLowerCase().trim().replace(/^@/, "")).filter(Boolean));

  const duplicateApps: any[] = [];

  for (const app of applications) {
    const reasons: string[] = [];

    // Check email
    if (app.email && modelEmails.has(app.email.toLowerCase().trim())) {
      reasons.push(`Email: ${app.email}`);
    }

    // Check Instagram
    const appIG = (app.instagram_username || "").toLowerCase().trim().replace(/^@/, "");
    if (appIG && modelIGs.has(appIG)) {
      reasons.push(`Instagram: @${appIG}`);
    }

    // Check TikTok
    const appTT = (app.tiktok_username || "").toLowerCase().trim().replace(/^@/, "");
    if (appTT && modelTTs.has(appTT)) {
      reasons.push(`TikTok: @${appTT}`);
    }

    if (reasons.length > 0) {
      duplicateApps.push({ app, reasons });
    }
  }

  if (duplicateApps.length === 0) {
    console.log("✅ No pending applications match existing models.");
  } else {
    console.log(`\n⚠️  Found ${duplicateApps.length} applications that match existing models:\n`);
    for (const { app, reasons } of duplicateApps) {
      console.log(`  Application ID: ${app.id}`);
      console.log(`  User ID: ${app.user_id}`);
      console.log(`  IG: ${app.instagram_username || "-"} | TikTok: ${app.tiktok_username || "-"}`);
      console.log(`  Matches: ${reasons.join(", ")}`);
      console.log(`  Created: ${new Date(app.created_at).toLocaleDateString()}`);
      console.log();
    }
  }
}

findDuplicates()
  .then(() => findApplicationDuplicates())
  .catch(console.error);
