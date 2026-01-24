/**
 * Script to send Miami Swim Week 2026 invitation emails
 *
 * Usage:
 *   Send to a single email:
 *     npx tsx scripts/send-miami-swim-week-invite.ts single email@example.com "Model Name"
 *
 *   Send to a list of emails from a file (one email per line, optionally with name separated by comma):
 *     npx tsx scripts/send-miami-swim-week-invite.ts file emails.txt
 *
 *   Send to all approved models:
 *     npx tsx scripts/send-miami-swim-week-invite.ts all
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import * as fs from "fs";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMiamiSwimWeekEmail(to: string, name?: string) {
  const signupUrl = "https://www.examodels.com";
  const dashboardUrl = "https://www.examodels.com/dashboard";
  const greeting = name ? `Hey ${name}!` : "Hey Beautiful!";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: "Miami Swim Week 2026 - Create Your EXA Profile & Apply Today!",
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

          <!-- Header with Beach/Swim Vibes -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 50%, #f97316 100%); padding: 50px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 40px;">🌴🌊👙</p>
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                Miami Swim Week 2026
              </h1>
              <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500;">
                Your runway moment is calling!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 500;">
                ${greeting}
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                The sun, the sand, the runway... <strong style="color: #ec4899;">Miami Swim Week 2026</strong> is coming and we want YOU there!
                EXA Models is looking for fresh faces and seasoned pros to strut their stuff at one of the hottest fashion events of the year.
              </p>

              <!-- Event Highlights -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%); border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 15px; color: #ffffff; font-size: 16px; font-weight: 600; text-align: center;">
                      What's waiting for you:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #06b6d4; margin-right: 10px;">&#10003;</span> Walk for Global swimwear brands
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #ec4899; margin-right: 10px;">&#10003;</span> Gain massive Exposure
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #f97316; margin-right: 10px;">&#10003;</span> Build your portfolio with pro photos
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #06b6d4; margin-right: 10px;">&#10003;</span> Industry Events
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA for New Users -->
              <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Ready to make waves?
              </h2>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                Create your free EXA Models profile and apply for Miami Swim Week 2026. It only takes a few minutes!
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 35px;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Create My Profile
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="border-top: 1px solid #333; padding-top: 30px;">
                  </td>
                </tr>
              </table>

              <!-- Section for Existing Users -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 12px; padding: 25px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 15px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      Already have an account? You're one step ahead!
                    </p>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                      Make sure your profile is runway-ready! Brands are looking for models with complete profiles. Here's your checklist:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #ec4899; margin-right: 8px;">1.</span> <strong style="color: #fff;">Upload a stunning profile photo</strong> - First impressions matter!
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #ec4899; margin-right: 8px;">2.</span> <strong style="color: #fff;">Add your measurements</strong> - Brands need these for castings
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #ec4899; margin-right: 8px;">3.</span> <strong style="color: #fff;">Add Content</strong> - Show your Looks
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                      <tr>
                        <td align="center">
                          <a href="${dashboardUrl}" style="display: inline-block; background-color: transparent; color: #ec4899; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; font-size: 14px; border: 2px solid #ec4899;">
                            Update My Profile
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #f97316; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Spots are limited - Apply early!
                    </p>
                    <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 13px;">
                      Don't miss your chance to walk in Miami Swim Week 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 15px; color: #a1a1aa; font-size: 14px;">
                <a href="https://www.examodels.com" style="color: #ec4899; text-decoration: none;">Visit EXA Models</a> |
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                See you on the runway! &#x2728;
              </p>
              <p style="margin: 10px 0 0; color: #525252; font-size: 11px;">
                EXA Models - Top Models Worldwide
              </p>
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

  return { data, error };
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (!mode) {
    console.log("Usage:");
    console.log("  npx tsx scripts/send-miami-swim-week-invite.ts single email@example.com \"Model Name\"");
    console.log("  npx tsx scripts/send-miami-swim-week-invite.ts file emails.txt");
    console.log("  npx tsx scripts/send-miami-swim-week-invite.ts all");
    process.exit(1);
  }

  let recipients: { email: string; name?: string }[] = [];

  if (mode === "single") {
    const email = args[1];
    const name = args[2];
    if (!email) {
      console.error("Please provide an email address");
      process.exit(1);
    }
    recipients.push({ email, name });
  } else if (mode === "file") {
    const filename = args[1];
    if (!filename) {
      console.error("Please provide a filename");
      process.exit(1);
    }
    const content = fs.readFileSync(filename, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    for (const line of lines) {
      const [email, name] = line.split(",").map(s => s.trim());
      if (email) {
        recipients.push({ email, name });
      }
    }
  } else if (mode === "all") {
    console.log("Fetching all approved models...");
    const { data: models, error } = await supabase
      .from("models")
      .select("email, first_name")
      .eq("is_approved", true)
      .not("email", "is", null);

    if (error) {
      console.error("Error fetching models:", error);
      process.exit(1);
    }

    recipients = (models || []).map(m => ({ email: m.email, name: m.first_name }));
  } else {
    console.error("Unknown mode:", mode);
    process.exit(1);
  }

  console.log(`\nSending Miami Swim Week 2026 invites to ${recipients.length} recipients...\n`);

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const { error } = await sendMiamiSwimWeekEmail(recipient.email, recipient.name);
      if (error) {
        console.log(`[FAILED] ${recipient.email}: ${error.message}`);
        failed++;
      } else {
        console.log(`[SENT] ${recipient.email}`);
        sent++;
      }
    } catch (err) {
      console.log(`[ERROR] ${recipient.email}: ${err}`);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY:");
  console.log("=".repeat(50));
  console.log(`  Total: ${recipients.length}`);
  console.log(`  Sent: ${sent}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
