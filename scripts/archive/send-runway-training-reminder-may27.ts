/**
 * Same-day reminder: Runway training Wednesday May 27, 2026 at 10:00 AM
 * at The Alexander Hotel Miami Beach.
 *
 * Usage:
 *   npx tsx scripts/send-runway-training-reminder-may27.ts                 # dry run
 *   npx tsx scripts/send-runway-training-reminder-may27.ts --send          # live, full list
 *   npx tsx scripts/send-runway-training-reminder-may27.ts --test --send   # live, single test email
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { Resend } from "resend";

const SEND = process.argv.includes("--send");
const TEST = process.argv.includes("--test");
const TEST_RECIPIENT = { name: "Nathan", email: "nathan@examodels.com" };

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "team@examodels.com";

const TRAINING_TIME = "10:00 AM";
const VENUE_NAME = "The Alexander Hotel Miami Beach";
const VENUE_ADDRESS = "5225 Collins Ave, Miami Beach, FL 33140";

type Recipient = { name: string; email: string };

const RECIPIENTS: Recipient[] = [
  { name: "Chelsea Jenks", email: "chelseajenks@hotmail.co.uk" },
  { name: "Emelye Ender", email: "enderemelye0@gmail.com" },
  { name: "Gabriela Contos", email: "gabrielacontos@gmail.com" },
  // NOTE: original list had "jenica.stenzel6@gmail.clm" — corrected ".clm" → ".com"
  { name: "Jenica", email: "jenica.stenzel6@gmail.com" },
  { name: "Kendall Pounders", email: "kendallp127@icloud.com" },
  { name: "Nya Kameko Burnett", email: "n.burnett2002@gmail.com" },
  { name: "Rebecca", email: "becca@knightvision.co" },
  { name: "Sally Mae", email: "sallymaecollabs@gmail.com" },
];

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || "Model";
}

function buildHtml(modelName: string) {
  const greetingName = escapeHtml(firstName(modelName));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${VENUE_NAME} ${VENUE_ADDRESS}`
  )}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; overflow: hidden; border: 1px solid rgba(236, 72, 153, 0.25);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 60%, #06b6d4 100%); padding: 44px 30px; text-align: center;">
              <p style="margin: 0 0 12px; color: rgba(255,255,255,0.95); font-size: 11px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase;">
                Reminder · Today
              </p>
              <h1 style="margin: 0; color: white; font-size: 30px; font-weight: 800; letter-spacing: -0.5px;">
                Runway Training This Morning
              </h1>
              <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 15px;">
                Today · ${TRAINING_TIME}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 18px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Hey ${greetingName},
              </p>
              <p style="margin: 0 0 28px; color: #a1a1aa; font-size: 16px; line-height: 1.65;">
                Quick reminder that your <strong style="color: #ffffff;">runway training</strong> is <strong style="color: #ffffff;">this morning at ${TRAINING_TIME}</strong>. Please arrive on time and ready to walk.
              </p>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: linear-gradient(180deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.05) 100%); border: 1px solid rgba(236, 72, 153, 0.25); border-radius: 12px;">
                <tr>
                  <td style="padding: 26px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                          Time
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${TRAINING_TIME} (this morning)
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid rgba(236,72,153,0.18);">
                          <div style="padding-top: 20px;">Location</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 6px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${VENUE_NAME}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #a1a1aa; font-size: 15px;">
                          ${VENUE_ADDRESS}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <a href="${mapsUrl}" style="display: inline-block; color: #f9a8d4; font-size: 13px; font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(249,168,212,0.5); padding-bottom: 2px;">
                            Open in Google Maps →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What to bring -->
              <p style="margin: 0 0 14px; color: #ec4899; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                What to bring
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                <tr>
                  <td style="padding: 22px 26px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 10px; color: #ffffff; font-size: 15px; line-height: 1.55;">
                          <strong style="color: #ec4899;">•</strong> &nbsp;Heels
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; color: #ffffff; font-size: 15px; line-height: 1.55;">
                          <strong style="color: #ec4899;">•</strong> &nbsp;Sandals
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; color: #ffffff; font-size: 15px; line-height: 1.55;">
                          <strong style="color: #ec4899;">•</strong> &nbsp;Bikini
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 10px; color: #ffffff; font-size: 15px; line-height: 1.55;">
                          <strong style="color: #ec4899;">•</strong> &nbsp;Water
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0; color: #ffffff; font-size: 15px; line-height: 1.55;">
                          <strong style="color: #ec4899;">•</strong> &nbsp;A snack
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 15px; line-height: 1.65;">
                Running late or any issues, email
                <a href="mailto:team@examodels.com" style="color: #f9a8d4; text-decoration: none; font-weight: 600;">team@examodels.com</a>.
              </p>

              <p style="margin: 28px 0 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                See you on the runway.<br/>
                <span style="color: #ec4899; font-weight: 600;">— The EXA Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Reply to this email or contact team@examodels.com
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models · Where Models Shine
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

function buildText(modelName: string) {
  return `Hey ${firstName(modelName)},

Quick reminder that your runway training is this morning at ${TRAINING_TIME}.

Time: ${TRAINING_TIME} (this morning)
Location: ${VENUE_NAME}, ${VENUE_ADDRESS}

What to bring:
- Heels
- Sandals
- Bikini
- Water
- A snack

Running late or any issues, email team@examodels.com.

See you on the runway.
— The EXA Team`;
}

async function main() {
  const recipients: Recipient[] = TEST ? [TEST_RECIPIENT] : RECIPIENTS;

  console.log(`Runway training reminder email`);
  console.log(`  Today · ${TRAINING_TIME}`);
  console.log(`  ${VENUE_NAME}, ${VENUE_ADDRESS}`);
  console.log(`  Recipients: ${recipients.length}${TEST ? "  (TEST MODE — single recipient)" : ""}`);
  console.log(`  Mode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

  for (const r of recipients) {
    console.log(`  ${r.name.padEnd(30)} ${r.email}`);
  }

  if (!SEND) {
    console.log(`\nDry run complete. Re-run with --send to email these ${recipients.length} models.`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("\nRESEND_API_KEY is not set. Aborting.");
    process.exit(1);
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log(`\nSending to ${recipients.length} ${recipients.length === 1 ? "recipient" : "models"}...\n`);

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: [r.email],
        subject: "Reminder: Runway training today at 10 AM — The Alexander Hotel",
        html: buildHtml(r.name),
        text: buildText(r.name),
      });

      if (error) {
        failed++;
        console.error(`  ✗ ${r.email}:`, error);
      } else {
        sent++;
        console.log(`  ✓ ${r.email}  (id: ${data?.id || "?"})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${r.email}:`, err);
    }

    // Resend rate limit: 2 req/s
    await new Promise((res) => setTimeout(res, 600));
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
