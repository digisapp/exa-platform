/**
 * Script to send Miami Swim Week profile reminder emails to models
 * without profile photos.
 *
 * Usage:
 *   npx tsx scripts/send-miami-swim-week-reminder.ts          # Dry run (default)
 *   npx tsx scripts/send-miami-swim-week-reminder.ts --send   # Actually send emails
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const BASE_URL = "https://www.examodels.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error("Missing required environment variables:");
  if (!SUPABASE_URL) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_KEY) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  if (!RESEND_API_KEY) console.error("  - RESEND_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const resend = new Resend(RESEND_API_KEY);

function generateEmailHtml(modelName: string): string {
  const greeting = modelName ? `Hey ${modelName}!` : "Hey!";
  const dashboardUrl = `${BASE_URL}/dashboard`;

  return `
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
              <p style="margin: 0 0 10px; font-size: 40px;">🌴👙✨</p>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                Miami Swim Week 2026
              </h1>
              <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500;">
                Designers need your complete profile!
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
                <strong style="color: #ec4899;">Miami Swim Week 2026</strong> is approaching and designers are reviewing model profiles for their shows.
                We noticed your profile is missing some key information that brands need for casting decisions.
              </p>

              <!-- What's Missing -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.3);">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px; color: #f97316; font-size: 16px; font-weight: 600;">
                      Action Required
                    </p>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                      To be considered for Miami Swim Week shows, designers need:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #ec4899; margin-right: 10px;">1.</span>
                          <strong style="color: #fff;">Profile Photo</strong> - A clear, professional headshot or full body shot
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #06b6d4; margin-right: 10px;">2.</span>
                          <strong style="color: #fff;">Measurements</strong> - Height, bust, waist, hips for swimwear fittings
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Why It Matters -->
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 15px; line-height: 1.7;">
                Swimwear brands specifically need accurate measurements to select models for their runway shows.
                Without a profile photo and measurements, your profile won't appear in designer searches for Miami Swim Week castings.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Complete My Profile Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Quick Tips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 15px; color: #ffffff; font-size: 15px; font-weight: 600;">
                      Quick tips for your profile:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Use a well-lit photo with a clean background
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Take measurements in form-fitting clothes or swimwear
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #10b981; margin-right: 8px;">&#10003;</span> Double-check your measurements for accuracy
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
                      Designers are selecting models now!
                    </p>
                    <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 13px;">
                      Complete your profile today to be considered for Miami Swim Week 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Reply to this email or DM us on Instagram
              </p>
              <p style="margin: 0 0 10px; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldSend = args.includes("--send");
  const dryRun = !shouldSend;

  console.log("\n========================================");
  console.log("Miami Swim Week Profile Reminder Emails");
  console.log("========================================\n");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No emails will be sent");
    console.log("   Use --send flag to actually send emails\n");
  } else {
    console.log("📧 SEND MODE - Emails will be sent!\n");
  }

  // Find models without profile photos who have claimed their profile
  console.log("Fetching models without profile photos...\n");

  const { data: models, error } = await supabase
    .from("models")
    .select("id, first_name, last_name, username, user_id")
    .is("profile_photo_url", null)
    .eq("is_approved", true)
    .not("user_id", "is", null)
    .not("claimed_at", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching models:", error);
    process.exit(1);
  }

  if (!models || models.length === 0) {
    console.log("No models without profile photos found.\n");
    process.exit(0);
  }

  console.log(`Found ${models.length} models without profile photos.\n`);

  // Get user emails from auth
  const userIds = models.map((m) => m.user_id).filter(Boolean);
  const { data: users } = await supabase.auth.admin.listUsers();
  const userEmails = new Map(
    users?.users
      ?.filter((u: any) => userIds.includes(u.id))
      .map((u: any) => [u.id, u.email]) || []
  );

  // Build list of emails to send
  const emailsToSend: { email: string; modelName: string }[] = [];
  let skippedCount = 0;

  for (const model of models) {
    const email = model.user_id ? userEmails.get(model.user_id) : null;
    const modelName = model.first_name || model.username || "Model";

    if (!email) {
      skippedCount++;
      continue;
    }

    emailsToSend.push({ email, modelName });
  }

  console.log(`Models with emails: ${emailsToSend.length}`);
  console.log(`Skipped (no email): ${skippedCount}\n`);

  if (emailsToSend.length === 0) {
    console.log("No emails to send.\n");
    process.exit(0);
  }

  if (dryRun) {
    console.log("Would send to:\n");
    emailsToSend.forEach((m) => console.log(`  📋 ${m.modelName} <${m.email}>`));
    console.log(`\nTotal: ${emailsToSend.length} emails`);
    process.exit(0);
  }

  // Batch send (100 emails per batch)
  const BATCH_SIZE = 100;
  let sentCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
    const batch = emailsToSend.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(emailsToSend.length / BATCH_SIZE);

    console.log(`Sending batch ${batchNum}/${totalBatches} (${batch.length} emails)...`);

    try {
      const { data, error } = await resend.batch.send(
        batch.map((m) => ({
          from: FROM_EMAIL,
          to: [m.email],
          subject: "Miami Swim Week 2026 - Complete Your Profile for Designers!",
          html: generateEmailHtml(m.modelName),
        }))
      );

      if (error) {
        console.log(`  ❌ Batch failed: ${error.message}`);
        errors.push(`Batch ${batchNum}: ${error.message}`);
      } else {
        sentCount += batch.length;
        console.log(`  ✅ Batch sent successfully`);
      }
    } catch (err: any) {
      console.log(`  ❌ Batch error: ${err.message}`);
      errors.push(`Batch ${batchNum}: ${err.message}`);
    }
  }

  console.log("\n========================================");
  console.log("Summary");
  console.log("========================================");
  console.log(`Total models: ${models.length}`);
  console.log(`${dryRun ? "Would send" : "Sent"}: ${sentCount}`);
  console.log(`Skipped (no email): ${skippedCount}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  console.log("");
}

main().catch(console.error);
