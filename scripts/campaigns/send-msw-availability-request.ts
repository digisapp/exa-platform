import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { sendMswAvailabilityRequestEmail } from "../../src/lib/email";

const SEND = process.argv.includes("--send");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: events, error: evtErr } = await supabase
    .from("events")
    .select("id, name, slug")
    .ilike("name", "%miami swim week%");

  if (evtErr || !events?.length) {
    console.error("Could not find Miami Swim Week event:", evtErr);
    process.exit(1);
  }

  const event = events[0];
  console.log(`Event: ${event.name} (${event.id})`);

  const { data: gigs, error: gigErr } = await supabase
    .from("gigs")
    .select("id, title")
    .eq("event_id", event.id);

  if (gigErr || !gigs?.length) {
    console.error("No gigs linked to event:", gigErr);
    process.exit(1);
  }
  console.log(`Linked gigs: ${gigs.length}`);

  const gigIds = gigs.map((g) => g.id);

  const { data: apps, error: appErr } = await supabase
    .from("gig_applications")
    .select("model_id")
    .in("gig_id", gigIds)
    .eq("status", "accepted");

  if (appErr) {
    console.error("Failed to fetch accepted apps:", appErr);
    process.exit(1);
  }

  const modelIds = Array.from(new Set((apps || []).map((a) => a.model_id)));
  console.log(`Confirmed model IDs: ${modelIds.length}`);

  if (modelIds.length === 0) {
    console.error("No confirmed models found.");
    process.exit(1);
  }

  const { data: models, error: modelErr } = await supabase
    .from("models")
    .select("id, email, username, first_name, last_name")
    .in("id", modelIds)
    .is("deleted_at", null)
    .not("email", "is", null)
    .order("first_name", { ascending: true });

  if (modelErr || !models) {
    console.error("Failed to fetch models:", modelErr);
    process.exit(1);
  }

  const recipients = models.filter((m) => m.email && m.email.includes("@"));
  console.log(`\nRecipients with valid email: ${recipients.length}\n`);

  console.log(`Mode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

  for (const m of recipients) {
    const name = m.first_name || m.username || "Model";
    console.log(`  ${name.padEnd(22)} ${(m.email || "").padEnd(40)} @${m.username || ""}`);
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
      const result = await sendMswAvailabilityRequestEmail({
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
