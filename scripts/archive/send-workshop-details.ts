/**
 * One-off send: Miami Swim Week Runway Workshop details
 * to the 39 enrolled models (Sunday May 24, 2026 · 10AM–2PM · The Alexander Hotel).
 *
 * Usage:
 *   npx tsx scripts/send-workshop-details.ts                 # dry run
 *   npx tsx scripts/send-workshop-details.ts --send          # live, full list
 *   npx tsx scripts/send-workshop-details.ts --test --send   # live, single test email to miriam@examodels.com
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { Resend } from "resend";

const SEND = process.argv.includes("--send");
const TEST = process.argv.includes("--test");
const TEST_RECIPIENT = { name: "Miriam", email: "miriam@examodels.com" };

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "team@examodels.com";

const WORKSHOP_DATE = "Sunday, May 24, 2026";
const WORKSHOP_TIME = "10:00 AM – 2:00 PM";
const VENUE_NAME = "The Alexander Hotel";
const VENUE_ADDRESS = "5225 Collins Ave, Miami Beach, FL";

type Recipient = { name: string; email: string };

const RECIPIENTS: Recipient[] = [
  { name: "Desirae Elizabeth", email: "info.desiraeelizabeth@gmail.com" },
  { name: "Madelene Coccia", email: "maddiecoccia@gmail.com" },
  { name: "Ami Cevallos", email: "amicevallos@gmail.com" },
  { name: "Ava Kapurch", email: "akapurch@gmail.com" },
  { name: "Dj Jeannine", email: "dezirae162@gmail.com" },
  { name: "Norissa Valdez", email: "norissabusiness@gmail.com" },
  { name: "Sarah Henderson", email: "sarah.henderson48@outlook.com" },
  { name: "Sarah Lloyd", email: "sarah.lloyd8@hotmail.com" },
  { name: "Sharna Beckman", email: "sharnabeckman@ymail.com" },
  { name: "Sophia Snyder", email: "sophia243@icloud.com" },
  { name: "Taylor Young", email: "tkillian.college@gmail.com" },
  { name: "Giovanna Layman", email: "gianogueira1@gmail.com" },
  { name: "Alexandra Dry", email: "contact@alexdry.com" },
  { name: "Ashley Palomino", email: "ashleypalomino617@gmail.com" },
  { name: "Caroline Jaquish", email: "ccopin810@gmail.com" },
  { name: "Christina Alvarez", email: "christymd305@gmail.com" },
  { name: "Cristiana Molina", email: "cristianamolinaa@gmail.com" },
  { name: "Emily Chesler", email: "emily24chesler@gmail.com" },
  { name: "Faithlyn Derla", email: "faith.b.derla@gmail.com" },
  { name: "Gianna Loren", email: "giannathimons@gmail.com" },
  { name: "Inez Smedberg", email: "inez.smedberg@hotmail.com" },
  { name: "Isabella Rodriguez Candelo", email: "ktcandelo@gmail.com" },
  { name: "Jennifer Rubio", email: "jenniferrubio.m.l@gmail.com" },
  { name: "Jessica Woodall", email: "jessicacwoodall@gmail.com" },
  { name: "Lauren Matlo", email: "lgmatlo@hotmail.com" },
  { name: "Makayla Holden", email: "makaylamgmtt7@gmail.com" },
  { name: "Marilyn Harvey", email: "marilynhope@icloud.com" },
  { name: "Mia Bailey", email: "miabaileysocials@gmail.com" },
  { name: "Mia Malin", email: "malinmia5@gmail.com" },
  { name: "Michelle Adams", email: "michelle.adams@mac.com" },
  { name: "Millie Mcfarlane", email: "milliemcfarlanecreative@gmail.com" },
  { name: "Noelle Thomas", email: "noelle1110@comcast.net" },
  { name: "Samelis Sanz", email: "samelis@myyahoo.com" },
  { name: "Tati Shabazz", email: "tatiinailedit@gmail.com" },
  { name: "Tiffany Diaz", email: "tiffanydiaz@hotmail.co.uk" },
  { name: "Yanie Mabao", email: "connectwithyani.ee@gmail.com" },
  { name: "Alexis Barriere", email: "alexisbarriere@yahoo.com" },
  { name: "Katelyn Mizuki Berringer", email: "katelynmb2016@gmail.com" },
  { name: "Thomasin Eboko", email: "thomasineboko.wfg@gmail.com" },
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
                Workshop Details
              </p>
              <h1 style="margin: 0; color: white; font-size: 30px; font-weight: 800; letter-spacing: -0.5px;">
                Miami Swim Week Runway Workshop
              </h1>
              <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 15px;">
                ${WORKSHOP_DATE} · ${WORKSHOP_TIME}
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
                Here are the details for your <strong style="color: #ffffff;">Miami Swim Week Runway Workshop</strong>. Please save this email and arrive on time and ready to walk.
              </p>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: linear-gradient(180deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.05) 100%); border: 1px solid rgba(236, 72, 153, 0.25); border-radius: 12px;">
                <tr>
                  <td style="padding: 26px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                          Date
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${WORKSHOP_DATE}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid rgba(236,72,153,0.18);">
                          <div style="padding-top: 20px;">Time</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${WORKSHOP_TIME}
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
                Any questions, email us at
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

Here are the details for your Miami Swim Week Runway Workshop:

Date: ${WORKSHOP_DATE}
Time: ${WORKSHOP_TIME}
Location: ${VENUE_NAME}, ${VENUE_ADDRESS}

What to bring:
- Heels
- Sandals
- Bikini
- Water
- A snack

Any questions, email us at team@examodels.com.

See you on the runway.
— The EXA Team`;
}

async function main() {
  const recipients: Recipient[] = TEST ? [TEST_RECIPIENT] : RECIPIENTS;

  console.log(`Workshop details email`);
  console.log(`  ${WORKSHOP_DATE} · ${WORKSHOP_TIME}`);
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
        subject: "Miami Swim Week Runway Workshop — Details Inside",
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
