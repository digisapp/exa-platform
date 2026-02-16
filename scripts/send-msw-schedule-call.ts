/**
 * Send "Schedule a Call" email to all PENDING Miami Swim Week 2026 applicants
 * Uses the universal link (no token needed)
 *
 * Run with: npx tsx scripts/send-msw-schedule-call.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const BASE_URL = "https://www.examodels.com";
const DELAY_MS = 550; // Stay under Resend 2/sec rate limit

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function isUnsubscribed(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("email_unsubscribes")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("category", "marketing")
    .limit(1)
    .single();
  return !!data;
}

async function sendScheduleCallEmail(
  to: string,
  modelName: string,
  gigTitle: string
) {
  const scheduleUrl = `${BASE_URL}/schedule-call?gig=${encodeURIComponent(gigTitle)}`;
  const safeName = escapeHtml(modelName);
  const safeTitle = escapeHtml(gigTitle);

  // Generate unsubscribe token
  const { data: tokenData } = await supabase.rpc("generate_unsubscribe_token", {
    p_email: to.toLowerCase(),
  });
  const unsubToken = tokenData || "";
  const unsubUrl = `${BASE_URL}/unsubscribe?token=${unsubToken}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: "Schedule a Call \u2014 Updated Link | EXA Models",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Let's Chat!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Schedule a call with EXA Models
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${safeName},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                We'd love to discuss <strong style="color: #ffffff;">${safeTitle}</strong> with you! Let's hop on a quick call to go over the details and answer any questions you might have.
              </p>

              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Pick a time that works best for you and we'll give you a call:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${scheduleUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                      Schedule My Call
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 12px;">
                EXA Models &bull; Miami, FL
              </p>
              <a href="${unsubUrl}" style="color: #71717a; font-size: 12px; text-decoration: underline;">
                Unsubscribe from marketing emails
              </a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });

  if (error) {
    return { success: false, error };
  }
  return { success: true, data };
}

async function main() {
  console.log("Finding Miami Swim Week 2026 gig...");

  // Find the gig
  const { data: gigs, error: gigError } = await supabase
    .from("gigs")
    .select("id, title")
    .ilike("title", "%miami swim week%")
    .limit(5);

  if (gigError || !gigs?.length) {
    console.error("Could not find MSW gig:", gigError);
    process.exit(1);
  }

  const gig = gigs[0];
  console.log(`Found gig: "${gig.title}" (${gig.id})`);

  // Get pending applications with model emails
  const { data: applications, error: appsError } = await supabase
    .from("gig_applications")
    .select("id, status, model_id, model:models(id, email, first_name, last_name, username)")
    .eq("gig_id", gig.id)
    .eq("status", "pending");

  if (appsError) {
    console.error("Failed to fetch applications:", appsError);
    process.exit(1);
  }

  const recipients = (applications || [])
    .filter((app: any) => app.model?.email)
    .map((app: any) => ({
      email: app.model.email,
      name: app.model.first_name || app.model.username || "",
    }));

  console.log(`Found ${recipients.length} pending applicants with emails`);

  if (recipients.length === 0) {
    console.log("No recipients. Exiting.");
    process.exit(0);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { email: string; reason: string }[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];

    // Check unsubscribe
    try {
      if (await isUnsubscribed(r.email)) {
        skipped++;
        console.log(`  [${i + 1}/${recipients.length}] SKIP (unsubscribed): ${r.email}`);
        continue;
      }
    } catch {
      // If unsubscribe check fails, send anyway
    }

    try {
      const result = await sendScheduleCallEmail(r.email, r.name, gig.title);
      if (result.success) {
        sent++;
        console.log(`  [${i + 1}/${recipients.length}] SENT: ${r.email}`);
      } else {
        const errMsg = JSON.stringify(result.error);
        // Retry once if rate limited
        if (errMsg.toLowerCase().includes("rate") || errMsg.toLowerCase().includes("too many")) {
          console.log(`  [${i + 1}/${recipients.length}] Rate limited, retrying in 2s...`);
          await sleep(2000);
          const retry = await sendScheduleCallEmail(r.email, r.name, gig.title);
          if (retry.success) {
            sent++;
            console.log(`  [${i + 1}/${recipients.length}] SENT (retry): ${r.email}`);
          } else {
            failed++;
            failures.push({ email: r.email, reason: errMsg });
            console.error(`  [${i + 1}/${recipients.length}] FAIL: ${r.email} — ${errMsg}`);
          }
        } else {
          failed++;
          failures.push({ email: r.email, reason: errMsg });
          console.error(`  [${i + 1}/${recipients.length}] FAIL: ${r.email} — ${errMsg}`);
        }
      }
    } catch (err: any) {
      failed++;
      const reason = err?.message || String(err);
      failures.push({ email: r.email, reason });
      console.error(`  [${i + 1}/${recipients.length}] ERROR: ${r.email} — ${reason}`);
    }

    // Rate limit delay
    if (i < recipients.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n========== DONE ==========");
  console.log(`Total recipients: ${recipients.length}`);
  console.log(`Sent: ${sent}`);
  console.log(`Skipped (unsubscribed): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failures.length > 0) {
    console.log("\nFailed emails:");
    failures.forEach((f) => console.log(`  ${f.email}: ${f.reason}`));
  }
}

main().catch(console.error);
