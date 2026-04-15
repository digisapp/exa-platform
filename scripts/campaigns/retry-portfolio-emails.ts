// Retry sending portfolio reminder emails to models that failed due to rate limiting
// Run with: npx ts-node scripts/retry-portfolio-emails.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import * as fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "hello@inbound.examodels.com";
const BASE_URL = "https://www.examodels.com";

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 1200;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  // Read failed emails list
  const failedEmails = fs.readFileSync("/tmp/failed-emails.txt", "utf-8")
    .split("\n")
    .map(e => e.trim())
    .filter(Boolean);

  console.log(`Retrying ${failedEmails.length} failed emails (batch size: ${BATCH_SIZE})\n`);

  // Get model info for failed emails
  const { data: models, error } = await supabase
    .from("models")
    .select("id, first_name, last_name, email, username")
    .eq("is_approved", true)
    .in("email", failedEmails);

  if (error) {
    console.error("Error fetching models:", error);
    process.exit(1);
  }

  console.log(`Found ${models.length} models to retry\n`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < models.length; i += BATCH_SIZE) {
    const batch = models.slice(i, i + BATCH_SIZE);

    for (const model of batch) {
      try {
        const { data: unsubData } = await (supabase.rpc as any)("is_email_unsubscribed", {
          p_email: model.email,
          p_email_type: "marketing",
        });

        if (unsubData === true) {
          console.log(`  SKIP (unsubscribed): ${model.email}`);
          skipped++;
          continue;
        }

        let unsubscribeToken: string | null = null;
        const { data: prefData } = await (supabase.rpc as any)("get_or_create_email_preferences", {
          p_email: model.email,
        });
        if (prefData?.[0]?.unsubscribe_token) {
          unsubscribeToken = prefData[0].unsubscribe_token;
        }

        const displayName = model.first_name || model.username;
        const html = buildEmailHtml(displayName, model.username, unsubscribeToken);

        const { error: sendError } = await resend.emails.send({
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

        // Wait between each individual email to stay under 5/sec
        await sleep(250);
      } catch (err: any) {
        console.error(`  ERROR: ${model.email} - ${err.message}`);
        failed++;
      }
    }

    // Extra pause between batches
    if (i + BATCH_SIZE < models.length) {
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
