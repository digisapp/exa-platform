/**
 * Script to send profile completion reminder emails to models
 * who have signed in but haven't uploaded a profile photo.
 *
 * Run with: npx tsx scripts/send-profile-reminder-emails.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Load environment variables from .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nanftzomzluetblqgrvo.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = new Resend(RESEND_API_KEY);

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";

// Delay between emails to avoid rate limiting
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendProfileCompletionReminderEmail({
  to,
  modelName,
  username,
}: {
  to: string;
  modelName: string;
  username: string;
}) {
  const dashboardUrl = "https://www.examodels.com/profile";
  const profileUrl = `https://www.examodels.com/${username}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `${modelName}, your profile is feeling a little lonely! 💕`,
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
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">
                Hey Gorgeous! ✨
              </h1>
              <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 18px;">
                We miss seeing your beautiful face!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 20px;">
                Hi ${modelName}! 👋
              </p>
              <p style="margin: 0 0 20px; color: #d4d4d8; font-size: 16px; line-height: 1.7;">
                Your EXA profile is looking a little empty and we know you're way too fabulous for that! 💅
              </p>
              <p style="margin: 0 0 25px; color: #d4d4d8; font-size: 16px; line-height: 1.7;">
                Brands are literally searching for models like you RIGHT NOW, but they can't find you without a profile photo! Let's fix that and get you booked! 🚀
              </p>

              <!-- Fun Stats Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.3);">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #ec4899; font-size: 36px; font-weight: bold;">5x</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px;">more profile views with a photo!</p>
                  </td>
                </tr>
              </table>

              <!-- Checklist Header -->
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Your Quick Glow-Up Checklist: 💫
              </p>

              <!-- Checklist Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <!-- Item 1 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 12px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 50px; vertical-align: top; text-align: center;">
                          <span style="font-size: 28px;">📸</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Drop that stunning profile pic!</p>
                          <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 13px;">Show off your best angle - you know which one 😉</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>

                <!-- Item 2 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 12px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 50px; vertical-align: top; text-align: center;">
                          <span style="font-size: 28px;">📏</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Add your measurements</p>
                          <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 13px;">Height, bust, waist, hips - brands need these to book you!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>

                <!-- Item 3 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 12px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 50px; vertical-align: top; text-align: center;">
                          <span style="font-size: 28px;">🖼️</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Upload some content</p>
                          <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 13px;">Portfolio pics, behind-the-scenes, anything that shows your vibe!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>

                <!-- Item 4 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 12px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 50px; vertical-align: top; text-align: center;">
                          <span style="font-size: 28px;">💰</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">Set your rates</p>
                          <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 13px;">Know your worth queen! Set rates for photoshoots & events</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 30px; font-weight: 700; font-size: 17px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Let's Glow Up! ✨
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                Takes less than 5 minutes - pinky promise! 🤙
              </p>
            </td>
          </tr>

          <!-- Motivation Section -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 12px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      🌟 Fun Fact 🌟
                    </p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                      Complete profiles get featured on our homepage carousel, seen by thousands of brands and fans daily! Your next big booking could be one photo away! 💕
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
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none; font-weight: 500;">View your profile</a>
                <span style="color: #525252; margin: 0 10px;">•</span>
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none; font-weight: 500;">Follow us @examodels</a>
              </p>
              <p style="margin: 0 0 10px; color: #71717a; font-size: 13px;">
                We're rooting for you! 💪
              </p>
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                EXA Models - Where Models Shine ✨
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
  console.log("🔍 Fetching models without profile photos...\n");

  // Get all approved models who have signed in but don't have a profile photo
  const { data: models, error } = await supabase
    .from("models")
    .select("id, username, first_name, email, profile_photo_url")
    .eq("is_approved", true)
    .not("user_id", "is", null)
    .or("profile_photo_url.is.null,profile_photo_url.eq.");

  if (error) {
    console.error("❌ Error fetching models:", error);
    process.exit(1);
  }

  // Filter to only those without photos (null or empty)
  const modelsWithoutPhoto = models?.filter(m => !m.profile_photo_url) || [];

  console.log(`Found ${modelsWithoutPhoto.length} models without profile photos\n`);

  if (modelsWithoutPhoto.length === 0) {
    console.log("✅ All models have profile photos! Nothing to do.");
    return;
  }

  console.log("📧 Starting to send emails...\n");

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { email: string; error: any }[] = [];

  for (const model of modelsWithoutPhoto) {
    if (!model.email) {
      console.log(`  ⏭️  Skipping ${model.username} - no email`);
      skipped++;
      continue;
    }

    const modelName = model.first_name || model.username;

    try {
      const { error } = await sendProfileCompletionReminderEmail({
        to: model.email,
        modelName,
        username: model.username,
      });

      if (error) {
        console.log(`  ❌ ${model.username} (${model.email}): ${error.message}`);
        failed++;
        errors.push({ email: model.email, error });
      } else {
        console.log(`  ✅ ${model.username} (${model.email})`);
        sent++;
      }
    } catch (err) {
      console.log(`  ❌ ${model.username} (${model.email}): ${err}`);
      failed++;
      errors.push({ email: model.email, error: err });
    }

    // Rate limiting delay
    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`  Total models without photo: ${modelsWithoutPhoto.length}`);
  console.log(`  ✅ Emails sent: ${sent}`);
  console.log(`  ⏭️  Skipped (no email): ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("\n❌ Failed emails:");
    errors.forEach(e => console.log(`  - ${e.email}: ${e.error}`));
  }

  console.log("\n🎉 Done!");
}

main().catch(console.error);
