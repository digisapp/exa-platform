/**
 * Retry failed Miami Swim Week profile reminder emails
 * Run with: npx tsx scripts/retry-miami-failed.ts
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
const DELAY_MS = 550; // 550ms between emails (Resend limit is 2/sec)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMiamiProfileReminderEmail(to: string, name: string, username: string) {
  const signinUrl = "https://www.examodels.com/signin";
  const profileUrl = `https://www.examodels.com/${username}`;
  const greeting = name ? `Hey ${name}!` : "Hey Beautiful!";

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: "Miami Swim Week is Coming - Is Your Profile Ready?",
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
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 50%, #f97316 100%); padding: 50px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 40px;">🌴🌊👙</p>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                Miami Swim Week is Approaching!
              </h1>
              <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500;">
                Make sure your profile is ready!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 500;">
                ${greeting}
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                <strong style="color: #ec4899;">Miami Swim Week 2026</strong> is right around the corner, and brands are actively searching for models on EXA right now!
                We noticed your profile could use some love - let's get you runway-ready!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.2);">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600; text-align: center;">
                      Your Profile Checklist:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="padding: 15px; background-color: #262626; border-radius: 10px;">
                          <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="width: 45px; vertical-align: middle; text-align: center;">
                                <span style="font-size: 24px;">📸</span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Add your profile photo</p>
                                <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">First impressions matter - show brands your best angle!</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="padding: 15px; background-color: #262626; border-radius: 10px;">
                          <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="width: 45px; vertical-align: middle; text-align: center;">
                                <span style="font-size: 24px;">🖼️</span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Upload portfolio photos</p>
                                <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">Showcase your versatility and style</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 15px; background-color: #262626; border-radius: 10px;">
                          <table cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="width: 45px; vertical-align: middle; text-align: center;">
                                <span style="font-size: 24px;">📏</span>
                              </td>
                              <td style="vertical-align: middle;">
                                <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Add your measurements</p>
                                <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">Height, bust, waist, hips - brands need these for castings!</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #262626; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #06b6d4; font-size: 32px; font-weight: bold;">5x</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px;">more visibility with a complete profile</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="${signinUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 30px; font-weight: 700; font-size: 17px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Complete My Profile
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                Takes less than 5 minutes to get runway-ready!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #f97316; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Don't miss out!
                    </p>
                    <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 13px;">
                      Brands are booking models now for Miami Swim Week 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 15px; color: #a1a1aa; font-size: 14px;">
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none;">View Your Profile</a>
                <span style="color: #525252; margin: 0 10px;">|</span>
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">Follow @examodels</a>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                See you on the runway!
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
  console.log("=".repeat(60));
  console.log("RETRY FAILED MIAMI SWIM WEEK EMAILS");
  console.log("=".repeat(60));

  // Read failed emails
  const failedFile = fs.readFileSync("scripts/failed-miami-profile-emails.txt", "utf-8");
  const failedEmails = failedFile
    .split("\n")
    .filter(line => line.trim())
    .map(line => line.split(":")[0].trim());

  console.log(`Found ${failedEmails.length} failed emails to retry\n`);

  // Get model info for these emails
  const { data: models, error } = await supabase
    .from("models")
    .select("username, email, first_name")
    .in("email", failedEmails);

  if (error) {
    console.error("Error fetching models:", error);
    process.exit(1);
  }

  const modelMap = new Map(models?.map(m => [m.email, m]) || []);
  console.log(`Found ${modelMap.size} models in database\n`);

  let sent = 0;
  let failed = 0;
  const stillFailed: string[] = [];

  for (const email of failedEmails) {
    const model = modelMap.get(email);
    const name = model?.first_name || model?.username || "Beautiful";
    const username = model?.username || "model";

    try {
      const { error } = await sendMiamiProfileReminderEmail(email, name, username);

      if (error) {
        console.log(`[FAILED] ${email}: ${error.message}`);
        failed++;
        stillFailed.push(email);
      } else {
        console.log(`[SENT] ${email}`);
        sent++;
      }
    } catch (err: any) {
      console.log(`[ERROR] ${email}: ${err.message || err}`);
      failed++;
      stillFailed.push(email);
    }

    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(60));
  console.log("RETRY COMPLETE");
  console.log("=".repeat(60));
  console.log(`   Retried: ${failedEmails.length}`);
  console.log(`   Sent: ${sent}`);
  console.log(`   Still failed: ${failed}`);
  console.log("=".repeat(60));

  if (stillFailed.length > 0) {
    fs.writeFileSync(
      "scripts/failed-miami-profile-emails-v2.txt",
      stillFailed.join("\n")
    );
    console.log(`\nStill failed emails saved to: scripts/failed-miami-profile-emails-v2.txt`);
  }
}

main().catch(console.error);
