/**
 * Email pending model applicants about Miami Swim Week 2026.
 *
 * Usage:
 *   npx tsx scripts/email-swimweek-model-applications.ts --test        # Send test to miriam@examodels.com
 *   npx tsx scripts/email-swimweek-model-applications.ts --dry-run     # Preview without sending
 *   npx tsx scripts/email-swimweek-model-applications.ts --send        # Send to all pending applicants
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = "https://www.examodels.com";
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const DELAY_MS = 600; // ~1.6 emails/sec, within Resend 2/sec limit
const LOG_FILE = "/tmp/swimweek-model-apps-email-log.txt";
const WORKSHOP_URL = "https://www.examodels.com/workshops/runway-workshop";

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const TEST_MODE = args.includes("--test");
const SEND_MODE = args.includes("--send");
const TEST_EMAIL = "miriam@examodels.com";

if (!DRY_RUN && !TEST_MODE && !SEND_MODE) {
  console.error("Usage:");
  console.error("  npx tsx scripts/email-swimweek-model-applications.ts --test      # Send test to miriam@examodels.com");
  console.error("  npx tsx scripts/email-swimweek-model-applications.ts --dry-run   # Preview all recipients");
  console.error("  npx tsx scripts/email-swimweek-model-applications.ts --send      # Send to all applicants");
  process.exit(1);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(displayName: string): string {
  const name = escapeHtml(displayName);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 32px 30px; text-align: center;">
              <p style="margin: 0 0 6px; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                Miami Swim Week 2026
              </p>
              <h1 style="margin: 0; color: white; font-size: 26px; font-weight: bold;">
                Casting Update
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 17px;">
                Hi ${name},
              </p>

              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 15px; line-height: 1.75;">
                We&rsquo;ve selected <strong style="color: #ffffff;">50 models</strong> so far to walk in Miami Swim Week 2026 (May 26&ndash;31). We&rsquo;re still building our roster and wanted to reach out to you directly.
              </p>

              <!-- Open Casting Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e3a5f 0%, #1a1a2e 100%); border: 1px solid rgba(99,179,237,0.25); border-radius: 12px; padding: 22px 24px;">
                    <p style="margin: 0 0 6px; color: #63b3ed; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Open Casting Call
                    </p>
                    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 20px; font-weight: bold;">
                      Monday, May 25 &mdash; Miami Beach
                    </h2>
                    <p style="margin: 0; color: #a0aec0; font-size: 14px; line-height: 1.6;">
                      Join us for a full day of castings &mdash; meet the designers, connect with hundreds of models, and audition to be part of EXA Shows during Miami Swim Week.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Runway Workshop Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%); border: 1px solid rgba(167,139,250,0.3); border-radius: 12px; padding: 22px 24px;">
                    <p style="margin: 0 0 6px; color: #c4b5fd; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      Guaranteed Placement
                    </p>
                    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 20px; font-weight: bold;">
                      Runway Workshop &mdash; May 24th
                    </h2>
                    <p style="margin: 0 0 16px; color: #a0aec0; font-size: 14px; line-height: 1.6;">
                      Can&rsquo;t make the open casting? If you take our <strong style="color: #ffffff;">Runway Workshop on May 24th</strong>, you&rsquo;re <strong style="color: #c4b5fd;">guaranteed to walk in one or more shows</strong> during Miami Swim Week.
                    </p>
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${WORKSHOP_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 15px;">
                            Sign Up for the Runway Workshop
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 6px; color: #a1a1aa; font-size: 14px; line-height: 1.6; text-align: center;">
                Questions? Reply to this email and we&rsquo;ll get back to you.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6; text-align: center;">
                &mdash; <span style="color: #ec4899; font-weight: 600;">EXA Models Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #525252; font-size: 12px;">
                <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">EXA Models</a> &mdash; Global Model Community
              </p>
              <p style="margin: 8px 0 0; color: #3f3f46; font-size: 11px;">
                You're receiving this because you applied to EXA Models.
                <a href="${BASE_URL}/unsubscribe" style="color: #71717a; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, displayName: string): Promise<boolean> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send to: ${to} (${displayName})`);
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: "Miami Swim Week 2026 — Casting Update & Runway Workshop",
      html: buildEmailHtml(displayName),
    }),
  });

  if (res.ok) {
    return true;
  } else {
    const err = await res.text();
    console.error(`  FAILED: ${to} — ${err}`);
    return false;
  }
}

async function main() {
  console.log("=== EXA Models — Miami Swim Week Casting Email ===");

  if (TEST_MODE) {
    console.log(`Mode: TEST — sending to ${TEST_EMAIL} only`);
    console.log("");
    const ok = await sendEmail(TEST_EMAIL, "Miriam");
    if (ok) {
      console.log(`✓ Test email sent to ${TEST_EMAIL}`);
      console.log("");
      console.log("Check your inbox, then run with --send to email all applicants:");
      console.log("  npx tsx scripts/email-swimweek-model-applications.ts --send");
    }
    return;
  }

  if (DRY_RUN) {
    console.log("Mode: DRY RUN (no emails sent)");
  } else {
    console.log("Mode: LIVE — sending to all pending applicants");
  }
  console.log("");

  // Fetch all pending model applications with email
  const PAGE_SIZE = 1000;
  const applicants: { id: string; email: string; display_name: string }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await (supabase.from("model_applications") as any)
      .select("id, email, display_name")
      .eq("status", "pending")
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching applicants:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    applicants.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Total pending applicants with email: ${applicants.length}`);
  console.log(`Estimated time: ~${Math.ceil((applicants.length * DELAY_MS) / 60000)} minutes`);
  console.log("");

  // Load previously sent emails to avoid duplicates
  const sentEmails = new Set<string>();
  try {
    if (fs.existsSync(LOG_FILE)) {
      const log = fs.readFileSync(LOG_FILE, "utf-8");
      log.split("\n").filter(Boolean).forEach(line => sentEmails.add(line.trim()));
      console.log(`Loaded ${sentEmails.size} previously sent emails from log (will skip duplicates)`);
      console.log("");
    }
  } catch {
    // No log file yet
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failedEmails: string[] = [];

  for (let i = 0; i < applicants.length; i++) {
    const a = applicants[i];
    const displayName = a.display_name || "Model";

    if (sentEmails.has(a.email)) {
      skipped++;
      continue;
    }

    const progress = `[${i + 1}/${applicants.length}]`;
    console.log(`${progress} ${displayName} — ${a.email}`);

    const success = await sendEmail(a.email, displayName);

    if (success) {
      sent++;
      if (!DRY_RUN) {
        fs.appendFileSync(LOG_FILE, a.email + "\n");
      }
    } else {
      failed++;
      failedEmails.push(a.email);
    }

    if (!DRY_RUN && i < applicants.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("");
  console.log("=== RESULTS ===");
  console.log(`Sent:    ${sent}`);
  console.log(`Skipped: ${skipped} (already sent)`);
  console.log(`Failed:  ${failed}`);

  if (failedEmails.length > 0) {
    const failFile = "/tmp/swimweek-model-apps-failed.txt";
    fs.writeFileSync(failFile, failedEmails.join("\n") + "\n");
    console.log(`Failed emails saved to: ${failFile}`);
  }
}

main().catch(console.error);
