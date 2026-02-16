/**
 * Email unclaimed models to claim their account.
 *
 * Usage:
 *   npx tsx scripts/email-claim-account.ts --batch 1          # Send to models 1-500
 *   npx tsx scripts/email-claim-account.ts --batch 2          # Send to models 501-1000
 *   npx tsx scripts/email-claim-account.ts --batch 1 --dry-run  # Preview without sending
 *   npx tsx scripts/email-claim-account.ts --batch all        # Send to ALL (not recommended)
 *
 * Batches are 500 emails each. Run one batch per day.
 * Total unclaimed models: ~4,579 → 10 batches over 10 days.
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
const BATCH_SIZE = 500;
const DELAY_MS = 600; // ~1.6 emails/sec, within Resend 2/sec limit
const LOG_FILE = "/tmp/claim-email-log.txt";

// Parse CLI args
const args = process.argv.slice(2);
const batchArg = args[args.indexOf("--batch") + 1];
const DRY_RUN = args.includes("--dry-run");

if (!batchArg) {
  console.error("Usage: npx tsx scripts/email-claim-account.ts --batch <number|all> [--dry-run]");
  console.error("  --batch 1       Send first 500 models");
  console.error("  --batch 2       Send models 501-1000");
  console.error("  --batch all     Send to all (not recommended)");
  console.error("  --dry-run       Preview without sending");
  process.exit(1);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(firstName: string, claimUrl: string): string {
  const name = escapeHtml(firstName);

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
              <h1 style="margin: 0; color: white; font-size: 26px; font-weight: bold;">
                Claim Your EXA Profile
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">
                It only takes 2 minutes &#10024;
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px; color: #ffffff; font-size: 18px;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 15px; line-height: 1.7;">
                You have an EXA Models profile waiting for you &mdash; you just need to claim it.
              </p>

              <!-- MSW Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); border-radius: 12px; padding: 20px 24px;">
                    <h2 style="margin: 0 0 8px; color: white; font-size: 18px; font-weight: bold;">
                      Miami Swim Week 2026
                    </h2>
                    <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;">
                      We're currently casting models. Only claimed profiles with a photo are eligible &mdash; don't miss your chance.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 700; font-size: 16px;">
                      Claim Your Profile
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What You Get -->
              <p style="margin: 0 0 16px; color: #ffffff; font-size: 15px; font-weight: 600;">
                Once you're in, you can:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #262626; border-radius: 8px;">
                    <p style="margin: 0 0 10px; color: #d4d4d8; font-size: 14px; line-height: 1.7;">
                      &#8226;&nbsp; Upload your photo <span style="color: #71717a;">(profiles with photos get 10x more views)</span>
                    </p>
                    <p style="margin: 0 0 10px; color: #d4d4d8; font-size: 14px; line-height: 1.7;">
                      &#8226;&nbsp; Get discovered by brands booking campaigns &amp; events
                    </p>
                    <p style="margin: 0; color: #d4d4d8; font-size: 14px; line-height: 1.7;">
                      &#8226;&nbsp; Apply for runway shows, shoots, Swim Week &amp; travel trips
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6; text-align: center;">
                See you inside &#10024;<br/>
                <span style="color: #ec4899; font-weight: 600;">EXA Models</span>
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
                You're receiving this because you were added to EXA Models.
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

async function sendEmail(to: string, firstName: string, claimUrl: string): Promise<boolean> {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send to: ${to} (${firstName})`);
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
      subject: "Claim Your EXA Models Profile \u2014 Miami Swim Week + Travel",
      html: buildEmailHtml(firstName, claimUrl),
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
  console.log("=== EXA Models — Claim Account Email Campaign ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no emails sent)" : "LIVE"}`);
  console.log("");

  // Fetch all unclaimed models with email, paginated to bypass 1000 row default limit
  const PAGE_SIZE = 1000;
  const models: { id: string; email: string; first_name: string | null; last_name: string | null; username: string | null; invite_token: string }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("models")
      .select("id, email, first_name, last_name, username, invite_token")
      .is("user_id", null)
      .not("email", "is", null)
      .not("invite_token", "is", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching models:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    models.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Total unclaimed models with email: ${models.length}`);
  const totalBatches = Math.ceil(models.length / BATCH_SIZE);
  console.log(`Total batches needed: ${totalBatches} (${BATCH_SIZE} per batch)`);
  console.log("");

  // Determine which models to send to
  let modelsToSend: typeof models;

  if (batchArg === "all") {
    modelsToSend = models;
    console.log(`Sending to ALL ${models.length} models`);
  } else {
    const batchNum = parseInt(batchArg);
    if (isNaN(batchNum) || batchNum < 1 || batchNum > totalBatches) {
      console.error(`Invalid batch number. Must be 1-${totalBatches} or "all"`);
      process.exit(1);
    }
    const start = (batchNum - 1) * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, models.length);
    modelsToSend = models.slice(start, end);
    console.log(`Batch ${batchNum}/${totalBatches}: models ${start + 1} to ${end} (${modelsToSend.length} emails)`);
  }

  console.log("");

  // Load previously sent emails to avoid duplicates
  const sentEmails = new Set<string>();
  try {
    if (fs.existsSync(LOG_FILE)) {
      const log = fs.readFileSync(LOG_FILE, "utf-8");
      log.split("\n").filter(Boolean).forEach(line => sentEmails.add(line.trim()));
      console.log(`Loaded ${sentEmails.size} previously sent emails from log`);
    }
  } catch {
    // No log file yet, that's fine
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failedEmails: string[] = [];

  for (let i = 0; i < modelsToSend.length; i++) {
    const m = modelsToSend[i];
    const firstName = m.first_name || m.username || "Model";
    const claimUrl = `${BASE_URL}/claim/${m.invite_token}`;

    // Skip if already sent
    if (sentEmails.has(m.email)) {
      skipped++;
      continue;
    }

    const progress = `[${i + 1}/${modelsToSend.length}]`;
    console.log(`${progress} ${firstName} — ${m.email}`);

    const success = await sendEmail(m.email, firstName, claimUrl);

    if (success) {
      sent++;
      // Log sent email
      if (!DRY_RUN) {
        fs.appendFileSync(LOG_FILE, m.email + "\n");
      }
    } else {
      failed++;
      failedEmails.push(m.email);
    }

    // Rate limit
    if (!DRY_RUN && i < modelsToSend.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log("");
  console.log("=== RESULTS ===");
  console.log(`Sent: ${sent}`);
  console.log(`Skipped (already sent): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failedEmails.length > 0) {
    const failFile = "/tmp/claim-email-failed.txt";
    fs.writeFileSync(failFile, failedEmails.join("\n") + "\n");
    console.log(`Failed emails saved to: ${failFile}`);
  }

  if (batchArg !== "all") {
    const batchNum = parseInt(batchArg);
    if (batchNum < totalBatches) {
      console.log("");
      console.log(`Next: npx tsx scripts/email-claim-account.ts --batch ${batchNum + 1}`);
    } else {
      console.log("");
      console.log("All batches complete!");
    }
  }
}

main().catch(console.error);
