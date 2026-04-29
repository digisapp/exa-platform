/**
 * MSW Portrait Card Announcement — notify all Miami Swim Week 2026 gig
 * applicants about the new profile picture / portrait card redesign and
 * encourage them to log in and make sure their card looks fire.
 *
 * Audience: all approved models who applied to the MSW gig (any status
 *           except rejected), have an email, and have not unsubscribed.
 *
 * Dry run (no emails sent, just shows who would receive):
 *   npx tsx scripts/campaigns/send-msw-portrait-card-emails.ts --dry-run
 *
 * Send for real:
 *   npx tsx scripts/campaigns/send-msw-portrait-card-emails.ts
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

const DRY_RUN = process.argv.includes("--dry-run");
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
  unsubscribeToken: string | null,
): string {
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const profileUrl = `${BASE_URL}/${username}`;
  const safeName = escapeHtml(modelName || "Beautiful");
  const unsubscribeUrl = unsubscribeToken
    ? `${BASE_URL}/unsubscribe?token=${unsubscribeToken}`
    : null;

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
            <td style="background: linear-gradient(135deg, #ff006e 0%, #8338ec 45%, #06b6d4 100%); padding: 52px 30px 44px; text-align: center; position: relative;">
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
                Hey ${safeName} 💖
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
              <p style="margin: 0 0 14px; color: #64748b; font-size: 12px;">
                EXA Models — Where Models Shine
              </p>
              ${unsubscribeUrl ? `
              <p style="margin: 0; color: #475569; font-size: 11px;">
                <a href="${unsubscribeUrl}" style="color: #475569; text-decoration: underline;">Unsubscribe</a> from marketing emails
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
  console.log("Audience: all MSW gig applicants (accepted + pending), approved, with email");
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

  // Step 2: Dedupe by model_id, keep most-recent application status
  const appByModel = new Map<string, any>();
  for (const a of apps.sort((a, b) => b.applied_at.localeCompare(a.applied_at))) {
    if (!appByModel.has(a.model_id)) appByModel.set(a.model_id, a);
  }
  const modelIds = [...appByModel.keys()];
  console.log(`Unique applicants: ${modelIds.length}`);

  // Step 3: Fetch model records in batches of 200 (URL-length safe)
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

  // Step 4: Exclude rejected applicants — sending a design update to someone
  // who was rejected reads wrong.
  const targetModels = models.filter((m) => {
    const app = appByModel.get(m.id);
    return app && app.status !== "rejected";
  });
  console.log(`Target audience (accepted + pending, not rejected): ${targetModels.length}`);
  console.log("");

  if (targetModels.length === 0) {
    console.log("No models to email. Done!");
    return;
  }

  // Step 5: Send (or dry-run)
  let sent = 0;
  let skippedUnsub = 0;
  let failed = 0;

  for (let i = 0; i < targetModels.length; i += BATCH_SIZE) {
    const batch = targetModels.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (m) => {
        try {
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

          // Get/create unsubscribe token
          let unsubscribeToken: string | null = null;
          const { data: prefData } = await (supabase.rpc as any)(
            "get_or_create_email_preferences",
            { p_email: m.email },
          );
          if (prefData?.[0]?.unsubscribe_token) {
            unsubscribeToken = prefData[0].unsubscribe_token;
          }

          const displayName = m.first_name || m.username;
          const appStatus = appByModel.get(m.id)?.status || "pending";

          if (DRY_RUN) {
            console.log(
              `  [DRY] ${displayName} <${m.email}> @${m.username} | status=${appStatus}`,
            );
            sent++;
            return;
          }

          const html = buildEmailHtml(displayName, m.username, unsubscribeToken);

          const { error } = await resend!.emails.send({
            from: FROM_EMAIL,
            replyTo: REPLY_TO_EMAIL,
            to: [m.email],
            subject: `${displayName}, your portrait card just got a glow-up ✨`,
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
  console.log(`Sent:              ${sent}`);
  console.log(`Skipped (unsub):   ${skippedUnsub}`);
  console.log(`Failed:            ${failed}`);
}

main().catch(console.error);
