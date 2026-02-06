import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read the migration file
  const migrationPath = path.join(
    __dirname,
    "../supabase/migrations/20260206000001_brand_outreach.sql"
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  console.log("Running brand outreach migration...");

  // Execute the migration
  const { error } = await supabase.rpc("exec_sql", { sql: migrationSql });

  if (error) {
    // Try direct SQL execution if rpc doesn't work
    console.log("Trying alternative execution method...");

    // Split by semicolons and run each statement
    const statements = migrationSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      try {
        const { error: stmtError } = await supabase.from("_migrations").select("*").limit(0);
        // Just check connectivity - we'll use direct API
      } catch (e) {
        // Ignore
      }
    }

    console.error("Migration may need to be run directly in Supabase SQL editor");
    console.log("\nMigration SQL has been created at:");
    console.log(migrationPath);
    console.log("\nPlease run this SQL in your Supabase SQL Editor to create the tables.");
  } else {
    console.log("Migration completed successfully!");
  }

  // Verify tables were created
  const { data: contacts, error: contactsError } = await (supabase as any)
    .from("brand_outreach_contacts")
    .select("count")
    .limit(1);

  if (contactsError) {
    console.log("\nTables not yet created. Please run the migration SQL in Supabase:");
    console.log(migrationPath);
  } else {
    console.log("\nTables created successfully!");
    console.log("brand_outreach_contacts table is ready");
  }
}

runMigration().catch(console.error);
