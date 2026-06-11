import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { sendMswPendingPhotoRequiredEmail } from "../src/lib/email";

const GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0";
const SEND = process.argv.includes("--send");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: apps, error } = await supabase
    .from("gig_applications")
    .select("id, model_id, models!inner(id, email, first_name, last_name, username, profile_photo_url, deleted_at)")
    .eq("gig_id", GIG_ID)
    .eq("status", "pending");

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  const recipients = (apps ?? [])
    .map((a: any) => a.models)
    .filter((m: any) => {
      if (!m) return false;
      if (m.deleted_at) return false;
      if (!m.email || !m.email.includes("@")) return false;
      const url = m.profile_photo_url;
      return !url || url.trim() === "";
    });

  // De-dupe by email
  const seen = new Set<string>();
  const unique = recipients.filter((m: any) => {
    const key = m.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\nFound ${unique.length} pending MSW applicants without profile_photo_url\n`);
  console.log(`Mode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

  for (const m of unique) {
    const name = m.first_name || m.username || "Model";
    console.log(`  ${name.padEnd(28)} ${m.email}`);
  }

  if (!SEND) {
    console.log(`\nDry run complete. Re-run with --send to email these ${unique.length} models.`);
    return;
  }

  console.log(`\nSending to ${unique.length} models...\n`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of unique) {
    const name = m.first_name || m.username || "Model";
    try {
      const result = await sendMswPendingPhotoRequiredEmail({
        to: m.email!,
        modelName: name,
      });
      if (result.success && !result.skipped) {
        sent++;
        console.log(`  ✓ ${m.email}`);
      } else if (result.skipped) {
        skipped++;
        console.log(`  - ${m.email} (unsubscribed)`);
      } else {
        failed++;
        console.error(`  ✗ ${m.email}:`, result.error);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${m.email}:`, err);
    }

    // Resend rate limit: 2 req/s
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\nDone. Sent: ${sent}, Skipped (unsubscribed): ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
