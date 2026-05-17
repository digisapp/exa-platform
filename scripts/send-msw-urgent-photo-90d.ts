/**
 * Sends an URGENT "upload your profile photo" email to every approved model
 * (claimed in the last 90 days) who does NOT have a profile photo on their
 * EXA model page — required to be considered for Miami Swim Week.
 *
 * Note: the `models` table has no `approved_at` column, so we use
 * `claimed_at` as the recency proxy (same as send-msw-casting-photo-reminder.ts).
 *
 * Usage:
 *   npx tsx scripts/send-msw-urgent-photo-90d.ts          # dry run
 *   npx tsx scripts/send-msw-urgent-photo-90d.ts --send   # live
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { sendMswUrgentProfilePhotoEmail } from "../src/lib/email";

const DAYS = 90;
const SEND = process.argv.includes("--send");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);

  const { data: models, error } = await supabase
    .from("models")
    .select("id, email, username, first_name, last_name, claimed_at, created_at, profile_photo_url")
    .eq("is_approved", true)
    .or("profile_photo_url.is.null,profile_photo_url.eq.")
    .gte("claimed_at", cutoff.toISOString())
    .is("deleted_at", null)
    .not("email", "is", null)
    .order("claimed_at", { ascending: false });

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  const recipients = (models || []).filter((m) => m.email && m.email.includes("@"));

  console.log(`\nFound ${recipients.length} approved models with no profile photo (claimed in last ${DAYS} days)\n`);
  console.log(`Mode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

  for (const m of recipients) {
    const name = m.first_name || m.username || "Model";
    console.log(`  ${String(name).padEnd(24)} ${String(m.email || "").padEnd(40)} @${m.username || ""}`);
  }

  if (!SEND) {
    console.log(`\nDry run complete. Re-run with --send to email these ${recipients.length} models.`);
    return;
  }

  console.log(`\nSending to ${recipients.length} models...\n`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of recipients) {
    const name = m.first_name || m.username || "Model";
    try {
      const result = await sendMswUrgentProfilePhotoEmail({
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
