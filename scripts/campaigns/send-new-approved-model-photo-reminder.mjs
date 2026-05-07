/**
 * Send a Miami Swim Week photo upload reminder to models approved in the last 60 days
 * who haven't uploaded a profile picture yet.
 *
 * Usage:
 *   node scripts/campaigns/send-new-approved-model-photo-reminder.mjs           # dry run (default)
 *   node scripts/campaigns/send-new-approved-model-photo-reminder.mjs --send     # actually send emails
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFileSync } from "fs";

const DRY_RUN = !process.argv.includes("--send");

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(env.RESEND_API_KEY);
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const BASE_URL = "https://www.examodels.com";

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const since = new Date();
since.setDate(since.getDate() - 60);
const sinceIso = since.toISOString();

console.log(`Looking for approved models since: ${sinceIso}`);

const { data: models, error } = await sb
  .from("models")
  .select("id, username, first_name, last_name, email, profile_photo_url, created_at")
  .eq("is_approved", true)
  .or("profile_photo_url.is.null,profile_photo_url.eq.")
  .gte("created_at", sinceIso)
  .order("created_at", { ascending: false });

if (error) {
  console.error("DB error:", error);
  process.exit(1);
}

const targets = (models || []).filter((m) => m.email && m.email.trim());

console.log(`\nApproved in last 60 days, no profile photo: ${targets.length}`);

if (targets.length === 0) {
  console.log("Nothing to send — all recently approved models have profile photos.");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\n--- DRY RUN --- (pass --send to actually send emails)\n");
  for (const m of targets) {
    const name = m.first_name || m.username || "(no name)";
    console.log(`  ${name} | @${m.username} | ${m.email} | joined ${m.created_at.slice(0, 10)}`);
  }
  console.log(`\nTotal: ${targets.length} emails would be sent`);
  process.exit(0);
}

let sent = 0;
let skipped = 0;
let errors = 0;

for (const m of targets) {
  // Check unsubscribe preference
  const { data: unsubData } = await sb.rpc("is_email_unsubscribed", {
    p_email: m.email,
    p_email_type: "marketing",
  });
  if (unsubData === true) {
    console.log(`  SKIP (unsubscribed): @${m.username}`);
    skipped++;
    continue;
  }

  const modelName = m.first_name || m.username;
  const dashboardUrl = `${BASE_URL}/dashboard/settings`;
  const profileUrl = `${BASE_URL}/${m.username}`;

  let unsubLink = "";
  try {
    const { data: tokenData } = await sb.rpc("get_or_create_email_preferences", { p_email: m.email });
    if (tokenData?.[0]?.unsubscribe_token) {
      unsubLink = `${BASE_URL}/unsubscribe?token=${tokenData[0].unsubscribe_token}`;
    }
  } catch (_) {}

  const unsubFooter = unsubLink
    ? `<p style="margin: 10px 0 0; color: #52525b; font-size: 11px;"><a href="${unsubLink}" style="color: #52525b; text-decoration: underline;">Unsubscribe</a> from these emails</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 20px; overflow: hidden; border: 1px solid #262626;">

          <!-- Hero Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #ec4899 55%, #f97316 100%); padding: 52px 32px 44px; text-align: center;">
              <p style="margin: 0 0 10px; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">EXA Models</p>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 30px; font-weight: 800; line-height: 1.2; text-shadow: 0 2px 12px rgba(0,0,0,0.35);">
                Miami Swim Week<br>is calling your name ✨
              </h1>
              <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 16px; line-height: 1.5;">
                One small thing is standing between you<br>and getting noticed by designers.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px 32px;">

              <p style="margin: 0 0 22px; color: #f4f4f5; font-size: 18px; font-weight: 600;">
                Hey ${escapeHtml(modelName)}! 👋
              </p>

              <p style="margin: 0 0 18px; color: #a1a1aa; font-size: 16px; line-height: 1.75;">
                We're so excited to have you on EXA — and we want to make sure you don't miss out on one of the biggest opportunities of the year.
              </p>

              <p style="margin: 0 0 18px; color: #a1a1aa; font-size: 16px; line-height: 1.75;">
                <strong style="color: #ec4899;">Miami Swim Week 2026</strong> designers are actively browsing EXA profiles right now. But here's the thing — your profile is still missing a <strong style="color: #ffffff;">profile photo</strong>, which means you could be getting overlooked.
              </p>

              <!-- Highlight box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td style="padding: 22px 24px; background: linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(236,72,153,0.12) 100%); border-radius: 14px; border: 1px solid rgba(236,72,153,0.25);">
                    <p style="margin: 0 0 8px; color: #ec4899; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Why it matters</p>
                    <p style="margin: 0; color: #d4d4d8; font-size: 15px; line-height: 1.65;">
                      Your photo is the very first thing a designer sees. A great shot — clean lighting, face forward, confidence on — can be the reason you get a booking instead of someone else. It only takes a minute to upload!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Tips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 18px 20px; background-color: #1c1c1c; border-radius: 12px; border-left: 3px solid #0ea5e9;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-weight: 600; font-size: 15px;">Tips for a standout photo:</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.8;">
                      📸 &nbsp;Clear, well-lit face shot<br>
                      🌊 &nbsp;Swimwear or beachy vibes = bonus points for MSW<br>
                      ✨ &nbsp;Natural look, minimal heavy filters<br>
                      📐 &nbsp;High resolution — no blurry or cropped photos
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 16px 44px; border-radius: 50px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 20px rgba(236, 72, 153, 0.45);">
                      Upload My Photo →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #52525b; font-size: 13px; text-align: center;">Takes less than a minute — seriously!</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 28px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 14px;">
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none;">View your profile</a>
                &nbsp;·&nbsp;
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">@examodels</a>
              </p>
              <p style="margin: 0; color: #3f3f46; font-size: 12px;">EXA Models &nbsp;·&nbsp; examodels.com</p>
              ${unsubFooter}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [m.email],
      subject: `${escapeHtml(modelName)}, upload your photo to be considered for Miami Swim Week 🌊`,
    html,
    });

    if (sendError) {
      console.log(`  ERROR: @${m.username} — ${sendError.message}`);
      errors++;
    } else {
      console.log(`  SENT: @${m.username} | ${m.email}`);
      sent++;
    }
  } catch (e) {
    console.log(`  ERROR: @${m.username} — ${e.message}`);
    errors++;
  }

  // Rate limit: ~5/sec
  await new Promise((r) => setTimeout(r, 200));
}

console.log(`\nDone! Sent: ${sent} | Skipped: ${skipped} | Errors: ${errors}`);
