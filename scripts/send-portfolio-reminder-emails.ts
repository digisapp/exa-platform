// Send portfolio reminder emails to models with 0 portfolio images
// Run with: npx ts-node scripts/send-portfolio-reminder-emails.ts
// Dry run: npx ts-node scripts/send-portfolio-reminder-emails.ts --dry-run

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "hello@inbound.examodels.com";
const BASE_URL = "https://www.examodels.com";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 4; // Resend rate limit: 5 emails/second, stay under
const BATCH_DELAY_MS = 1200; // Just over 1 second between batches

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailHtml(modelName: string, username: string, unsubscribeToken: string | null): string {
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const profileUrl = `${BASE_URL}/${username}`;
  const safeName = escapeHtml(modelName || "Beautiful");
  const unsubscribeUrl = unsubscribeToken
    ? `${BASE_URL}/unsubscribe?token=${unsubscribeToken}`
    : null;

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

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Your Portfolio Is Waiting
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Let the world see your best shots
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${safeName},
              </p>
              <p style="margin: 0 0 15px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                We noticed your EXA profile doesn't have any photos yet &mdash; and we know you've got some amazing ones! Your portfolio is the first thing brands, fans, and other models see when they visit your page.
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Models with photos in their portfolio get <strong style="color: #ec4899;">up to 10x more profile views</strong> and are much more likely to be discovered for gigs and collaborations. Even just 3-5 photos can make a huge difference!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Upload Your Photos Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Tips -->
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Quick Tips for a Standout Portfolio
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">1</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Start with Your Best Shots</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Pick 3-5 photos that show off your style &mdash; headshots, full body, or creative shoots all work great.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">2</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Show Your Range</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Mix it up with different looks, outfits, and settings. Brands love seeing versatility!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">3</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Quality Over Quantity</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">A few stunning photos are better than many blurry ones. Use good lighting and high-res images.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 15px; line-height: 1.6; text-align: center;">
                It only takes a minute to upload and it makes your profile shine. We can't wait to see your photos!
              </p>

              <!-- Secondary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background-color: #262626; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid #404040;">
                      View Your Profile
                    </a>
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
              ${unsubscribeUrl ? `
              <p style="margin: 0; color: #52525b; font-size: 11px;">
                <a href="${unsubscribeUrl}" style="color: #52525b; text-decoration: underline;">Unsubscribe</a> from these emails
              </p>
              ` : ""}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!RESEND_API_KEY && !DRY_RUN) {
    console.error("Missing RESEND_API_KEY (use --dry-run to skip sending)");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const resend = DRY_RUN ? null : new Resend(RESEND_API_KEY);

  console.log(DRY_RUN ? "=== DRY RUN MODE ===" : "=== SENDING EMAILS ===");

  // Step 1: Get all approved models
  console.log("Fetching approved models...");
  const { data: models, error: modelsError } = await supabase
    .from("models")
    .select("id, first_name, last_name, email, username")
    .eq("is_approved", true)
    .not("email", "is", null);

  if (modelsError) {
    console.error("Error fetching models:", modelsError);
    process.exit(1);
  }

  console.log(`Found ${models.length} approved models with emails`);

  // Step 2: Get model IDs that have at least 1 portfolio image
  console.log("Checking portfolio images...");
  const { data: modelsWithPhotos, error: photosError } = await supabase
    .from("media_assets")
    .select("model_id")
    .eq("asset_type", "portfolio")
    .not("model_id", "is", null);

  if (photosError) {
    console.error("Error fetching media assets:", photosError);
    process.exit(1);
  }

  const modelIdsWithPhotos = new Set(modelsWithPhotos.map((m: any) => m.model_id));

  // Also check content_items for portfolio status
  const { data: modelsWithContent, error: contentError } = await supabase
    .from("content_items")
    .select("model_id")
    .eq("status", "portfolio")
    .not("model_id", "is", null);

  if (!contentError && modelsWithContent) {
    modelsWithContent.forEach((m: any) => modelIdsWithPhotos.add(m.model_id));
  }

  // Step 3: Filter to models with 0 portfolio images
  const modelsWithoutPhotos = models.filter((m: any) => !modelIdsWithPhotos.has(m.id));

  console.log(`${modelsWithoutPhotos.length} models have 0 portfolio images`);
  console.log(`${models.length - modelsWithoutPhotos.length} models already have portfolio images (skipping)\n`);

  if (modelsWithoutPhotos.length === 0) {
    console.log("No models to email. Done!");
    return;
  }

  // Step 4: Send emails in batches
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < modelsWithoutPhotos.length; i += BATCH_SIZE) {
    const batch = modelsWithoutPhotos.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (model: any) => {
      try {
        // Check unsubscribe status
        const { data: unsubData } = await (supabase.rpc as any)("is_email_unsubscribed", {
          p_email: model.email,
          p_email_type: "marketing",
        });

        if (unsubData === true) {
          console.log(`  SKIP (unsubscribed): ${model.email}`);
          skipped++;
          return;
        }

        // Get unsubscribe token
        let unsubscribeToken: string | null = null;
        const { data: prefData } = await (supabase.rpc as any)("get_or_create_email_preferences", {
          p_email: model.email,
        });
        if (prefData?.[0]?.unsubscribe_token) {
          unsubscribeToken = prefData[0].unsubscribe_token;
        }

        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would send to: ${model.first_name || ''} ${model.last_name || ''} <${model.email}> (@${model.username})`);
          sent++;
          return;
        }

        const displayName = model.first_name || model.username;
        const html = buildEmailHtml(displayName, model.username, unsubscribeToken);

        const { error: sendError } = await resend!.emails.send({
          from: FROM_EMAIL,
          replyTo: REPLY_TO_EMAIL,
          to: [model.email],
          subject: "Upload Photos to Your EXA Models Profile 💖",
          html,
        });

        if (sendError) {
          console.error(`  FAIL: ${model.email} - ${sendError.message}`);
          failed++;
        } else {
          console.log(`  SENT: ${model.first_name || model.username} <${model.email}>`);
          sent++;
        }
      } catch (err: any) {
        console.error(`  ERROR: ${model.email} - ${err.message}`);
        failed++;
      }
    });

    await Promise.all(promises);

    // Rate limit between batches
    if (i + BATCH_SIZE < modelsWithoutPhotos.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Sent: ${sent}`);
  console.log(`Skipped (unsubscribed): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total processed: ${sent + skipped + failed}`);
}

main().catch(console.error);
