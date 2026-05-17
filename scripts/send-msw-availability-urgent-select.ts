/**
 * Sends an URGENT "select your MSW days" email to every model who is
 * accepted into Miami Swim Week 2026 but has NOT yet submitted any days
 * in `gig_availability`.
 *
 * Usage:
 *   npx tsx scripts/send-msw-availability-urgent-select.ts          # dry run
 *   npx tsx scripts/send-msw-availability-urgent-select.ts --send   # live
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { sendMswAvailabilityUrgentSelectEmail } from "../src/lib/email";

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
  console.log(`Accepted: ${acceptedIds.length}`);

  const { data: avail, error: availErr } = await supabase
    .from("gig_availability")
    .select("model_id")
    .eq("gig_id", GIG_ID)
    .in("model_id", acceptedIds);
  if (availErr) {
    console.error("Failed to load availability:", availErr);
    process.exit(1);
  }
  const responded = new Set((avail || []).map((a: any) => a.model_id));
  console.log(`Responded:     ${responded.size}`);

  const notRespondedIds = acceptedIds.filter((id: string) => !responded.has(id));
  console.log(`Not responded: ${notRespondedIds.length}\n`);

  if (notRespondedIds.length === 0) return;

  const { data: models, error: modelsErr } = await supabase
    .from("models")
    .select("id, email, first_name, last_name, username")
    .in("id", notRespondedIds)
    .order("first_name", { ascending: true });
  if (modelsErr) {
    console.error("Failed to load models:", modelsErr);
    process.exit(1);
  }

  const recipients = (models || []).filter(
    (m: any) => m.email && m.email.includes("@")
  );
  const noEmail = (models || []).filter(
    (m: any) => !m.email || !m.email.includes("@")
  );

  console.log(`Recipients with valid email: ${recipients.length}`);
  if (noEmail.length) {
    console.log(`\nSkipping ${noEmail.length} models without a valid email:`);
    for (const m of noEmail) {
      console.log(`  - ${m.first_name} ${m.last_name} (@${m.username}) email=${m.email}`);
    }
  }

  console.log(`\nMode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);
  for (const m of recipients) {
    const name = m.first_name || m.username || "Model";
    console.log(`  ${String(name).padEnd(20)} ${String(m.email).padEnd(40)} @${m.username || ""}`);
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
      const result = await sendMswAvailabilityUrgentSelectEmail({
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
