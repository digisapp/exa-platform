/**
 * Sends a "make sure your MSW availability is up to date" reminder email
 * to EVERY model accepted into Miami Swim Week 2026 (regardless of whether
 * they've already submitted days).
 *
 * Usage:
 *   npx tsx scripts/send-msw-availability-reminder.ts          # dry run
 *   npx tsx scripts/send-msw-availability-reminder.ts --send   # live
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { sendMswAvailabilityReminderEmail } from "../src/lib/email";

const GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0"; // Miami Swim Week 2026
const SEND = process.argv.includes("--send");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title, slug")
    .eq("id", GIG_ID)
    .single();
  console.log("Gig:", gig);

  const { data: apps, error: appsErr } = await supabase
    .from("gig_applications")
    .select("model_id")
    .eq("gig_id", GIG_ID)
    .eq("status", "accepted");
  if (appsErr) {
    console.error("Failed to load accepted apps:", appsErr);
    process.exit(1);
  }
  const acceptedIds = (apps || []).map((a: any) => a.model_id);
  console.log(`Accepted MSW models: ${acceptedIds.length}`);

  const { data: avail } = await supabase
    .from("gig_availability")
    .select("model_id")
    .eq("gig_id", GIG_ID)
    .in("model_id", acceptedIds);
  const responded = new Set((avail || []).map((a: any) => a.model_id));
  console.log(`  already submitted availability:  ${responded.size}`);
  console.log(`  NOT yet submitted availability:  ${acceptedIds.length - responded.size}`);

  const { data: models, error: modelsErr } = await supabase
    .from("models")
    .select("id, email, first_name, last_name, username")
    .in("id", acceptedIds)
    .order("first_name", { ascending: true });
  if (modelsErr) {
    console.error("Failed to load models:", modelsErr);
    process.exit(1);
  }

  const isValid = (e: string | null) =>
    !!e && e.includes("@") && !e.endsWith("placeholder.invalid");
  const recipients = (models || []).filter((m: any) => isValid(m.email));
  const noEmail = (models || []).filter((m: any) => !isValid(m.email));

  console.log(`\nRecipients with valid email: ${recipients.length}`);
  if (noEmail.length) {
    console.log(`\nSkipping ${noEmail.length} models without a valid email:`);
    for (const m of noEmail) {
      console.log(`  - ${m.first_name} ${m.last_name} (@${m.username}) email=${m.email}`);
    }
  }

  console.log(`\nMode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);
  for (const m of recipients) {
    const name = m.first_name || m.username || "Model";
    const respondedTag = responded.has(m.id) ? "✓days" : "  --  ";
    console.log(`  ${respondedTag}  ${String(name).padEnd(20)} ${String(m.email).padEnd(40)} @${m.username || ""}`);
  }

  if (!SEND) {
    console.log(`\nDry run complete. Re-run with --send to email these ${recipients.length} models.`);
    return;
  }

  console.log(`\nSending to ${recipients.length} models…\n`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const m of recipients) {
    const name = m.first_name || m.username || "Model";
    try {
      const result = await sendMswAvailabilityReminderEmail({
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
