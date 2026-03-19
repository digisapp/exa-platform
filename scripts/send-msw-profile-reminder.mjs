/**
 * Send "Get Miami Swim Week Ready" email to claimed models with incomplete profiles.
 * Targets models missing: profile photo, portfolio content, measurements, or bio.
 * Respects unsubscribe preferences. Rate limited at 5/sec.
 *
 * Usage:
 *   node scripts/send-msw-profile-reminder.mjs           # dry run (default)
 *   node scripts/send-msw-profile-reminder.mjs --send     # actually send emails
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
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Get all claimed models with profile completeness info
const { data: models } = await sb
  .from("models")
  .select("id, username, first_name, last_name, email, profile_photo_url, bio, height, bust, waist, hips")
  .not("user_id", "is", null);

// Check media counts in batches
const modelIds = models.map((m) => m.id);
const mediaCountMap = new Map();
const batchSize = 50;
for (let i = 0; i < modelIds.length; i += batchSize) {
  const batch = modelIds.slice(i, i + batchSize);
  const { data: mediaCounts } = await sb
    .from("media_assets")
    .select("model_id")
    .in("model_id", batch)
    .eq("asset_type", "portfolio");

  for (const mc of mediaCounts || []) {
    mediaCountMap.set(mc.model_id, (mediaCountMap.get(mc.model_id) || 0) + 1);
  }
}

// Identify models with incomplete profiles
const incomplete = [];
for (const m of models) {
  const hasPhoto = !!(m.profile_photo_url && m.profile_photo_url.trim());
  const hasPortfolio = (mediaCountMap.get(m.id) || 0) > 0;
  const hasMeasurements = !!(m.height || m.bust || m.waist || m.hips);
  const hasBio = !!(m.bio && m.bio.trim().length > 10);

  const missing = [];
  if (!hasPhoto) missing.push("profile_photo");
  if (!hasPortfolio) missing.push("portfolio");
  if (!hasMeasurements) missing.push("measurements");
  if (!hasBio) missing.push("bio");

  if (missing.length > 0) {
    incomplete.push({ ...m, missing, hasPhoto, hasPortfolio, hasMeasurements, hasBio });
  }
}

console.log(`Total claimed models: ${models.length}`);
console.log(`Models with incomplete profiles: ${incomplete.length}`);
console.log(`  Missing profile photo: ${incomplete.filter((m) => m.missing.includes("profile_photo")).length}`);
console.log(`  Missing portfolio: ${incomplete.filter((m) => m.missing.includes("portfolio")).length}`);
console.log(`  Missing measurements: ${incomplete.filter((m) => m.missing.includes("measurements")).length}`);
console.log(`  Missing bio: ${incomplete.filter((m) => m.missing.includes("bio")).length}`);

if (DRY_RUN) {
  console.log("\n--- DRY RUN MODE --- (use --send to actually send emails)\n");
  console.log("Would email these models:");
  for (const m of incomplete) {
    console.log(`  ${m.username} | ${m.email} | missing: ${m.missing.join(", ")}`);
  }
  console.log(`\nTotal: ${incomplete.length} emails would be sent`);
  process.exit(0);
}

let sent = 0;
let skipped = 0;
let errors = 0;

for (const m of incomplete) {
  if (!m.email || m.email.trim() === "") {
    skipped++;
    continue;
  }

  // Check unsubscribe
  const { data: unsubData } = await sb.rpc("is_email_unsubscribed", {
    p_email: m.email,
    p_email_type: "marketing",
  });
  if (unsubData === true) {
    console.log(`  SKIP (unsubscribed): ${m.username}`);
    skipped++;
    continue;
  }

  const modelName = m.first_name || m.username;
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const profileUrl = `${BASE_URL}/${m.username}`;

  // Get unsubscribe token
  let unsubLink = "";
  try {
    const { data: tokenData } = await sb.rpc("get_or_create_email_preferences", { p_email: m.email });
    if (tokenData?.[0]?.unsubscribe_token) {
      unsubLink = `${BASE_URL}/unsubscribe?token=${tokenData[0].unsubscribe_token}`;
    }
  } catch (e) {}

  const unsubFooter = unsubLink
    ? `<p style="margin: 10px 0 0; color: #52525b; font-size: 11px;"><a href="${unsubLink}" style="color: #52525b; text-decoration: underline;">Unsubscribe</a> from these emails</p>`
    : "";

  // Build personalized checklist based on what's missing
  const checklistItems = [];
  if (!m.hasPhoto) {
    checklistItems.push({
      icon: "📸",
      title: "Upload a Profile Photo",
      desc: "A great headshot or professional photo is the first thing designers see",
    });
  }
  if (!m.hasPortfolio) {
    checklistItems.push({
      icon: "🖼️",
      title: "Add Portfolio Photos & Videos",
      desc: "Show off your best looks — runway, editorial, swimwear, lifestyle",
    });
  }
  if (!m.hasMeasurements) {
    checklistItems.push({
      icon: "📏",
      title: "Add Your Measurements",
      desc: "Height, bust, waist, hips — designers need these to book you",
    });
  }
  if (!m.hasBio) {
    checklistItems.push({
      icon: "✍️",
      title: "Write Your Bio",
      desc: "Tell brands about your experience, style, and what makes you unique",
    });
  }

  const checklistHtml = checklistItems
    .map(
      (item, i) => `
    <tr>
      <td style="padding: 14px 18px; background-color: #262626; border-radius: 10px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width: 40px; vertical-align: top; font-size: 22px; padding-top: 2px;">${item.icon}</td>
            <td>
              <p style="margin: 0; color: #ffffff; font-weight: 600; font-size: 15px;">${item.title}</p>
              <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">${item.desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>`
    )
    .join("");

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [m.email],
      subject: `${escapeHtml(modelName)}, get your profile Miami Swim Week ready!`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 50%, #f97316 100%); padding: 50px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 26px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                Get Miami Swim Week Ready
              </h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">
                Designers are browsing profiles now!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                <strong style="color: #06b6d4;">Miami Swim Week 2026</strong> is coming up and designers are actively looking at EXA profiles to find models for their shows and campaigns.
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                We want to make sure your profile is <strong style="color: #ec4899;">fully built out</strong> so you don't miss any opportunities. Here's what would help you stand out:
              </p>

              <!-- Personalized Checklist -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                ${checklistHtml}
              </table>

              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                Models with complete profiles are <strong style="color: #ec4899;">5x more likely</strong> to get booked. It only takes a few minutes to finish yours!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Complete My Profile
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
                Takes less than 5 minutes!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none;">View your profile</a> |
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">EXA Models</p>
              ${unsubFooter}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });

    if (error) {
      console.log(`  ERROR: ${m.username} ${m.email} — ${error.message}`);
      errors++;
    } else {
      console.log(`  SENT: ${m.username} | missing: ${m.missing.join(", ")}`);
      sent++;
    }
  } catch (e) {
    console.log(`  ERROR: ${m.username} ${m.email} — ${e.message}`);
    errors++;
  }

  await new Promise((r) => setTimeout(r, 200));
}

console.log(`\nDone! Sent: ${sent} | Skipped: ${skipped} | Errors: ${errors}`);
