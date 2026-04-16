/**
 * MSW Portfolio Reminder — send to Miami Swim Week 2026 gig applicants
 * who haven't uploaded any portfolio photos yet.
 *
 * Audience: models with gig_applications.gig_id = <MSW_GIG_ID>, approved,
 *          not deleted, have an email, and have 0 content_items (portfolio, image).
 *
 * Run dry-run first (no emails sent, just prints who would receive):
 *   npx tsx scripts/campaigns/send-msw-portfolio-emails.ts --dry-run
 *
 * Send for real (after you've reviewed the dry-run):
 *   npx tsx scripts/campaigns/send-msw-portfolio-emails.ts
 *
 * Optional: also email applicants with only 1-2 photos (adds 53 more):
 *   npx tsx scripts/campaigns/send-msw-portfolio-emails.ts --include-sparse
 */
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

const MSW_GIG_ID = "c693fc9c-b6b4-4659-a323-0256ef3181c0";
const MSW_GIG_TITLE = "Miami Swim Week 2026";

const DRY_RUN = process.argv.includes("--dry-run");
const INCLUDE_SPARSE = process.argv.includes("--include-sparse");
// --sparse-only: email ONLY models with 1-2 photos (skip 0-photo models because
// they were already emailed in the initial push). Use this for the follow-up.
const SPARSE_ONLY = process.argv.includes("--sparse-only");
const BATCH_SIZE = 4; // Resend limit is 5/sec; stay under
const BATCH_DELAY_MS = 1200;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEmailHtml(
  modelName: string,
  username: string,
  applicationStatus: string,
  unsubscribeToken: string | null,
  photoCount: number = 0,
): string {
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const profileUrl = `${BASE_URL}/${username}`;
  const safeName = escapeHtml(modelName || "Beautiful");
  const unsubscribeUrl = unsubscribeToken
    ? `${BASE_URL}/unsubscribe?token=${unsubscribeToken}`
    : null;

  const statusLine =
    applicationStatus === "accepted"
      ? "You've been accepted for Miami Swim Week 2026! 🎉"
      : applicationStatus === "pending"
      ? "Your Miami Swim Week 2026 application is under review."
      : "Thanks for applying to Miami Swim Week 2026.";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0014; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0014; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #190a2d; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%); padding: 44px 30px; text-align: center;">
              <p style="margin: 0 0 8px; color: rgba(255,255,255,0.85); font-size: 12px; letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">
                Miami Swim Week 2026
              </p>
              <h1 style="margin: 0; color: white; font-size: 30px; font-weight: bold; line-height: 1.2;">
                Stand out to MSW designers
              </h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">
                Upload your portfolio to get noticed
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 16px; color: #ffffff; font-size: 18px;">
                Hey ${safeName},
              </p>

              <p style="margin: 0 0 18px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                ${statusLine}
              </p>

              ${photoCount === 0 ? `
              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                There's one thing slowing your application down: <strong style="color: #ec4899;">you haven't uploaded any portfolio photos yet.</strong>
              </p>

              <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Designers and the MSW selection team review portfolios when making decisions. Models with a full portfolio are <strong style="color: #ec4899;">selected up to 10x more often</strong> than ones without.
              </p>
              ` : `
              <p style="margin: 0 0 20px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                You've uploaded ${photoCount === 1 ? "<strong style=\"color: #ec4899;\">1 portfolio photo</strong>" : `<strong style=\"color: #ec4899;\">${photoCount} portfolio photos</strong>`} — nice start. Designers typically want to see at least <strong style="color: #ec4899;">3–5 photos</strong> before making selection decisions.
              </p>

              <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Adding a couple more shots (swimwear, full-body, high-res portraits) gives designers a fuller picture of your range and dramatically boosts your selection odds.
              </p>
              `}

              <!-- Primary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 36px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 18px 40px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 24px rgba(236,72,153,0.35);">
                      Upload Portfolio Photos
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What looks great -->
              <h2 style="margin: 0 0 18px; color: #ffffff; font-size: 18px; font-weight: 600;">
                What designers want to see
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px; background-color: #23103a; border-radius: 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 15px;">1</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600;">Swimwear or bikini shots</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">MSW is a swim-focused show — lead with your best swim content.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #23103a; border-radius: 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 15px;">2</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600;">Full-body portrait shots</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Show your runway presence. Tall portrait photos (3:4 or 4:5) look best on your EXA profile.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #23103a; border-radius: 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 44px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 15px;">3</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600;">High-res, well-lit</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Professional shots or sharp phone photos (1500px+) look sharp everywhere on EXA.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 22px; color: #a1a1aa; font-size: 14px; line-height: 1.6; text-align: center; font-style: italic;">
                3–5 great photos is all it takes.
              </p>

              <!-- Secondary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background-color: #2d1b4e; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid #4c2d78;">
                      View Your Profile
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #2d1b4e; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Reply to this email.
              </p>
              <p style="margin: 0 0 10px; color: #71717a; font-size: 12px;">
                EXA Models — Where Models Shine
              </p>
              ${unsubscribeUrl ? `
              <p style="margin: 0; color: #52525b; font-size: 11px;">
                <a href="${unsubscribeUrl}" style="color: #52525b; text-decoration: underline;">Unsubscribe</a> from marketing emails
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
  console.log("Audience: MSW gig applicants with 0 portfolio photos" + (INCLUDE_SPARSE ? " (or 1-2 photos)" : ""));
  console.log("");

  // Step 1: All MSW gig applications (paginated)
  let apps: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await (supabase as any)
      .from("gig_applications")
      .select("model_id, status, applied_at")
      .eq("gig_id", MSW_GIG_ID)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    apps.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`MSW applications: ${apps.length}`);

  // Step 2: Dedupe by model_id, keep most-recent status
  const appByModel = new Map<string, any>();
  for (const a of apps.sort((a, b) => b.applied_at.localeCompare(a.applied_at))) {
    if (!appByModel.has(a.model_id)) appByModel.set(a.model_id, a);
  }
  const modelIds = [...appByModel.keys()];
  console.log(`Unique applicants: ${modelIds.length}`);

  // Step 3: Fetch model records in small batches (URL length safety)
  const models: any[] = [];
  for (let i = 0; i < modelIds.length; i += 200) {
    const { data } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, email")
      .in("id", modelIds.slice(i, i + 200))
      .eq("is_approved", true)
      .is("deleted_at", null)
      .not("email", "is", null);
    if (data) models.push(...data);
  }
  console.log(`Approved + has email: ${models.length}`);

  // Step 4: Get portfolio photo counts per model
  const photoCount = new Map<string, number>();
  for (let i = 0; i < models.length; i += 200) {
    const batchIds = models.slice(i, i + 200).map((m) => m.id);
    const { data } = await (supabase as any)
      .from("content_items")
      .select("model_id")
      .eq("media_type", "image")
      .eq("status", "portfolio")
      .in("model_id", batchIds);
    for (const p of data || []) {
      photoCount.set(p.model_id, (photoCount.get(p.model_id) || 0) + 1);
    }
  }

  // Step 5: Filter to the target audience.
  // Exclude rejected applicants — pushing them to upload after rejection
  // reads wrong. Keep accepted + pending.
  const targetModels = models.filter((m) => {
    const app = appByModel.get(m.id);
    if (!app) return false;
    if (app.status === "rejected") return false;

    const count = photoCount.get(m.id) || 0;
    if (SPARSE_ONLY) {
      // Only email models with 1 or 2 photos (follow-up to zero-photo push)
      return count >= 1 && count < 3;
    }
    if (INCLUDE_SPARSE) {
      // Email anyone with < 3 photos (zero and sparse combined)
      return count < 3;
    }
    // Default: only zero-photo models (initial push)
    return count === 0;
  });
  const audienceDesc = SPARSE_ONLY ? "1-2 photos only" : INCLUDE_SPARSE ? "< 3 photos" : "0 photos";
  console.log(`Target audience (${audienceDesc}, accepted+pending only): ${targetModels.length}`);
  console.log("");

  if (targetModels.length === 0) {
    console.log("No models to email. Done!");
    return;
  }

  // Step 6: Send (or dry-run)
  let sent = 0;
  let skippedUnsub = 0;
  let failed = 0;

  for (let i = 0; i < targetModels.length; i += BATCH_SIZE) {
    const batch = targetModels.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (m) => {
        try {
          const app = appByModel.get(m.id);
          const appStatus = app?.status || "pending";

          // Unsubscribe check
          const { data: unsubData } = await (supabase.rpc as any)("is_email_unsubscribed", {
            p_email: m.email,
            p_email_type: "marketing",
          });
          if (unsubData === true) {
            console.log(`  SKIP (unsub): ${m.email}`);
            skippedUnsub++;
            return;
          }

          let unsubscribeToken: string | null = null;
          const { data: prefData } = await (supabase.rpc as any)(
            "get_or_create_email_preferences",
            { p_email: m.email },
          );
          if (prefData?.[0]?.unsubscribe_token) {
            unsubscribeToken = prefData[0].unsubscribe_token;
          }

          const displayName = m.first_name || m.username;
          const photoCountForModel = photoCount.get(m.id) || 0;

          if (DRY_RUN) {
            console.log(
              `  [DRY] ${displayName} <${m.email}> @${m.username} | status=${appStatus} | photos=${photoCountForModel}`,
            );
            sent++;
            return;
          }

          const html = buildEmailHtml(displayName, m.username, appStatus, unsubscribeToken, photoCountForModel);

          const subject =
            photoCountForModel === 0
              ? `${displayName}, strengthen your Miami Swim Week application 💖`
              : `${displayName}, your MSW application needs a couple more photos 💖`;

          const { error } = await resend!.emails.send({
            from: FROM_EMAIL,
            replyTo: REPLY_TO_EMAIL,
            to: [m.email],
            subject,
            html,
          });

          if (error) {
            console.error(`  FAIL: ${m.email} — ${error.message}`);
            failed++;
          } else {
            console.log(`  SENT: ${displayName} <${m.email}>`);
            sent++;
          }
        } catch (err: any) {
          console.error(`  ERROR: ${m.email} — ${err.message}`);
          failed++;
        }
      }),
    );

    if (i + BATCH_SIZE < targetModels.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log("");
  console.log("=== DONE ===");
  console.log(`Sent:   ${sent}`);
  console.log(`Skipped (unsubscribed): ${skippedUnsub}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
