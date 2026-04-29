/**
 * One-shot test — sends the portrait card email to a single address.
 * Usage: npx tsx scripts/campaigns/test-portrait-card-email.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "hello@inbound.examodels.com";
const BASE_URL = "https://www.examodels.com";

const TEST_EMAIL = "miriam@examodels.com";
const TEST_NAME = "Miriam";
const TEST_USERNAME = "miriam";

function buildEmailHtml(modelName: string, username: string): string {
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const profileUrl = `${BASE_URL}/${username}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0014; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0014; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #110820; border-radius: 20px; overflow: hidden; border: 1px solid rgba(236,72,153,0.2);">

          <!-- Hero Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ff006e 0%, #8338ec 45%, #06b6d4 100%); padding: 52px 30px 44px; text-align: center;">
              <p style="margin: 0 0 10px; color: rgba(255,255,255,0.9); font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 700;">
                🌴 Miami Swim Week 2026 🌴
              </p>
              <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 32px; font-weight: 800; line-height: 1.15; text-shadow: 0 0 30px rgba(255,0,110,0.5);">
                Your EXA Profile<br>Just Got a Glow-Up ✨
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.92); font-size: 16px; line-height: 1.5;">
                We redesigned your profile picture card.<br>Log in and make sure you look <em>absolutely fire.</em>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 44px 32px 36px;">

              <p style="margin: 0 0 20px; color: #ffffff; font-size: 19px; font-weight: 600;">
                Hey ${modelName} 💖
              </p>

              <p style="margin: 0 0 18px; color: #cbd5e1; font-size: 16px; line-height: 1.65;">
                We have a new version of the EXA profile portrait card designed to feel like an editorial moment.
              </p>

              <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 16px; line-height: 1.65;">
                I'd take a minute to update your portrait profile picture so it's aligned with how you want to be seen for Miami Swim Week!
              </p>

              <!-- Primary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 40px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff006e 0%, #8338ec 100%); color: white; text-decoration: none; padding: 18px 44px; border-radius: 12px; font-weight: 800; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 28px rgba(255,0,110,0.4);">
                      Check My Portrait Card →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Pro tip -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 36px;">
                <tr>
                  <td style="padding: 20px 24px; background-color: #1e0a38; border-radius: 12px; border-left: 4px solid #ff006e;">
                    <p style="margin: 0 0 6px; color: #f9a8d4; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Pro Tip</p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
                      The portrait card crops to a tall 3:4 ratio. For the hottest result, log in and update your profile photo with a <strong style="color: #ffffff;">high-res portrait shot</strong> — clean background, great lighting, face front and center. That's the one designers are going to see first.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Secondary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background-color: transparent; color: #f9a8d4; text-decoration: none; padding: 13px 30px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid rgba(249,168,212,0.4);">
                      Preview My Public Profile
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255,0,110,0.4) 30%, rgba(131,56,236,0.4) 70%, transparent 100%);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px 32px 36px; text-align: center;">
              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                Questions? Just reply to this email — we're here. 💌
              </p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                EXA Models — Where Models Shine
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

async function main() {
  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);
  const html = buildEmailHtml(TEST_NAME, TEST_USERNAME);

  console.log(`Sending test to ${TEST_EMAIL}...`);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    to: [TEST_EMAIL],
    subject: `${TEST_NAME}, your portrait card just got a glow-up ✨`,
    html,
  });

  if (error) {
    console.error("FAIL:", error.message);
    process.exit(1);
  }

  console.log("SENT! ID:", data?.id);
}

main().catch(console.error);
