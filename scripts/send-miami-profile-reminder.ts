/**
 * Script to send Miami Swim Week profile completion reminder emails
 * to models who don't have profile photos.
 *
 * Sends in batches with configurable size and tracks progress.
 *
 * Run with: npx tsx scripts/send-miami-profile-reminder.ts
 *
 * Options:
 *   --batch-size=N     Number of emails per batch (default: 300)
 *   --start-at=N       Skip first N models (for resuming)
 *   --dry-run          Preview without sending emails
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
const DELAY_MS = 550; // 550ms between emails (Resend limit is 2/sec)

// Parse command line arguments
const args = process.argv.slice(2);
const BATCH_SIZE = parseInt(args.find(a => a.startsWith("--batch-size="))?.split("=")[1] || "300");
const START_AT = parseInt(args.find(a => a.startsWith("--start-at="))?.split("=")[1] || "0");
const DRY_RUN = args.includes("--dry-run");

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

          <!-- Header with Beach/Swim Vibes -->
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

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 500;">
                ${greeting}
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                <strong style="color: #ec4899;">Miami Swim Week 2026</strong> is right around the corner, and brands are actively searching for models on EXA right now!
                We noticed your profile could use some love - let's get you runway-ready!
              </p>

              <!-- Profile Checklist -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.2);">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600; text-align: center;">
                      Your Profile Checklist:
                    </p>

                    <!-- Item 1 - Profile Photo -->
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

                    <!-- Item 2 - Portfolio Photos -->
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

                    <!-- Item 3 - Measurements -->
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

              <!-- Stats Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #262626; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #06b6d4; font-size: 32px; font-weight: bold;">5x</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px;">more visibility with a complete profile</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
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

          <!-- Urgency Banner -->
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

          <!-- Footer -->
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
  console.log("MIAMI SWIM WEEK - PROFILE COMPLETION REMINDER");
  console.log("=".repeat(60));
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Start at: ${START_AT}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log("=".repeat(60));

  // Fetch all approved models without profile photos (paginate to bypass 1000 limit)
  console.log("\n1. Fetching models without profile photos...");

  const allModels: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: batchError } = await supabase
      .from("models")
      .select("id, username, email, first_name, profile_photo_url")
      .eq("is_approved", true)
      .not("email", "is", null)
      .is("profile_photo_url", null)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (batchError) {
      console.error("   Error fetching models:", batchError);
      process.exit(1);
    }

    if (batch && batch.length > 0) {
      allModels.push(...batch);
      console.log(`   Fetched batch ${page + 1}: ${batch.length} models (total: ${allModels.length})`);
      page++;
      hasMore = batch.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  // Filter to only those without profile photos (already filtered in query, but double-check)
  const modelsWithoutPhoto = allModels.filter(m => !m.profile_photo_url);

  console.log(`   Found ${modelsWithoutPhoto.length} models without profile photos`);

  if (modelsWithoutPhoto.length === 0) {
    console.log("\nNo models to email. Exiting.");
    process.exit(0);
  }

  // Apply start offset
  const modelsToEmail = modelsWithoutPhoto.slice(START_AT);
  console.log(`   Models to process (after offset): ${modelsToEmail.length}`);

  // Preview first 10
  console.log("\n2. Preview - First 10 models to email:");
  modelsToEmail.slice(0, 10).forEach((m, i) => {
    console.log(`   ${START_AT + i + 1}. ${m.username} (${m.email})`);
  });

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would send emails to:");
    console.log(`   - ${modelsToEmail.length} models`);
    console.log(`   - In batches of ${BATCH_SIZE}`);
    console.log("\nRun without --dry-run to send emails.");
    process.exit(0);
  }

  // Send emails in batches
  console.log("\n3. Starting email campaign...");

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const failedEmails: { email: string; error: string }[] = [];
  const totalBatches = Math.ceil(modelsToEmail.length / BATCH_SIZE);

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, modelsToEmail.length);
    const batch = modelsToEmail.slice(start, end);

    const globalStart = START_AT + start;
    const globalEnd = START_AT + end;

    console.log(`\n   --- BATCH ${batchNum + 1}/${totalBatches} (models ${globalStart + 1}-${globalEnd}) ---`);

    let batchSent = 0;
    let batchFailed = 0;

    for (const model of batch) {
      if (!model.email) {
        console.log(`   [SKIP] ${model.username} - no email`);
        totalSkipped++;
        continue;
      }

      const name = model.first_name || model.username;

      try {
        const { error } = await sendMiamiProfileReminderEmail(model.email, name, model.username);

        if (error) {
          console.log(`   [FAILED] ${model.username} (${model.email}): ${error.message}`);
          batchFailed++;
          failedEmails.push({ email: model.email, error: error.message });
        } else {
          console.log(`   [SENT] ${model.username} (${model.email})`);
          batchSent++;
        }
      } catch (err: any) {
        console.log(`   [ERROR] ${model.username} (${model.email}): ${err.message || err}`);
        batchFailed++;
        failedEmails.push({ email: model.email, error: err.message || String(err) });
      }

      await sleep(DELAY_MS);
    }

    totalSent += batchSent;
    totalFailed += batchFailed;

    console.log(`\n   Batch ${batchNum + 1} complete: ${batchSent} sent, ${batchFailed} failed`);
    console.log(`   Running total: ${totalSent} sent, ${totalFailed} failed`);

    // Pause between batches (except for the last one)
    if (batchNum < totalBatches - 1) {
      console.log("   Pausing 5 seconds before next batch...");
      await sleep(5000);
    }
  }

  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("CAMPAIGN COMPLETE");
  console.log("=".repeat(60));
  console.log(`   Total models without photo: ${modelsWithoutPhoto.length}`);
  console.log(`   Processed (from offset ${START_AT}): ${modelsToEmail.length}`);
  console.log(`   Emails sent: ${totalSent}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log(`   Skipped (no email): ${totalSkipped}`);
  console.log("=".repeat(60));

  // Save failed emails to file if any
  if (failedEmails.length > 0) {
    const fs = await import("fs");
    const failedPath = "scripts/failed-miami-profile-emails.txt";
    fs.writeFileSync(
      failedPath,
      failedEmails.map(f => `${f.email}: ${f.error}`).join("\n")
    );
    console.log(`\nFailed emails saved to: ${failedPath}`);
  }

  // Show resume command if not all sent
  if (totalFailed > 0 || totalSent < modelsToEmail.length) {
    const nextStart = START_AT + totalSent + totalFailed;
    console.log(`\nTo resume from where you left off, run:`);
    console.log(`   npx tsx scripts/send-miami-profile-reminder.ts --start-at=${nextStart}`);
  }
}

main().catch(console.error);
