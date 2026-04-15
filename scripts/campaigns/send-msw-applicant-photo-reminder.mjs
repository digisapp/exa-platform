/**
 * Send profile photo reminder to models who applied to Miami Swim Week gigs
 * but don't have a profile picture uploaded.
 *
 * Usage:
 *   node scripts/send-msw-applicant-photo-reminder.mjs           # dry run (default)
 *   node scripts/send-msw-applicant-photo-reminder.mjs --send     # actually send emails
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

// 1. Find Miami Swim Week event
const { data: event } = await sb
  .from("events")
  .select("id, name")
  .or("slug.eq.miami-swim-week-2026,name.ilike.%Miami Swim Week%")
  .limit(1)
  .single();

if (!event) {
  console.error("Could not find Miami Swim Week event");
  process.exit(1);
}

console.log(`Found event: ${event.name} (${event.id})`);

// 2. Find all gigs for this event
const { data: gigs } = await sb
  .from("gigs")
  .select("id, title")
  .eq("event_id", event.id);

if (!gigs || gigs.length === 0) {
  console.error("No gigs found for Miami Swim Week");
  process.exit(1);
}

console.log(`Found ${gigs.length} MSW gigs:`);
for (const g of gigs) console.log(`  - ${g.title} (${g.id})`);

const gigIds = gigs.map((g) => g.id);

// 3. Get all model IDs who applied to these gigs (not withdrawn)
const { data: applications } = await sb
  .from("gig_applications")
  .select("model_id")
  .in("gig_id", gigIds)
  .not("status", "eq", "withdrawn");

if (!applications || applications.length === 0) {
  console.log("No applications found for MSW gigs");
  process.exit(0);
}

const uniqueModelIds = [...new Set(applications.map((a) => a.model_id))];
console.log(`\nTotal applicants (unique): ${uniqueModelIds.length}`);

// 4. Get model details for those without profile photos
const modelsWithoutPhoto = [];
const batchSize = 50;

for (let i = 0; i < uniqueModelIds.length; i += batchSize) {
  const batch = uniqueModelIds.slice(i, i + batchSize);
  const { data: models } = await sb
    .from("models")
    .select("id, username, first_name, last_name, email, profile_photo_url")
    .in("id", batch);

  for (const m of models || []) {
    if (!m.profile_photo_url || !m.profile_photo_url.trim()) {
      modelsWithoutPhoto.push(m);
    }
  }
}

console.log(`Applicants missing profile photo: ${modelsWithoutPhoto.length}`);

if (modelsWithoutPhoto.length === 0) {
  console.log("\nAll MSW applicants have profile photos!");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\n--- DRY RUN MODE --- (use --send to actually send emails)\n");
  console.log("Would email these models:");
  for (const m of modelsWithoutPhoto) {
    const name = m.first_name || m.username || "(no name)";
    console.log(`  ${name} | ${m.username} | ${m.email}`);
  }
  console.log(`\nTotal: ${modelsWithoutPhoto.length} emails would be sent`);
  process.exit(0);
}

// 5. Send emails
let sent = 0;
let skipped = 0;
let errors = 0;

for (const m of modelsWithoutPhoto) {
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

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [m.email],
      subject: `${escapeHtml(modelName)}, upload your photo to be considered for Miami Swim Week!`,
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
                Miami Swim Week 2026
              </h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.95); font-size: 16px;">
                We need your profile photo!
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
                Thanks for applying to <strong style="color: #06b6d4;">Miami Swim Week 2026</strong> — we're excited to see your interest!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                We noticed your profile is <strong style="color: #ec4899;">missing a profile photo</strong>. Designers and casting directors are actively reviewing applications right now, and profiles without a photo are easy to overlook.
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                To make sure you're considered for the shows, please upload a profile picture as soon as possible. A clean headshot or professional photo works best!
              </p>

              <!-- Tip Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 18px 20px; background-color: #262626; border-radius: 10px; border-left: 4px solid #06b6d4;">
                    <p style="margin: 0 0 6px; color: #ffffff; font-weight: 600; font-size: 15px;">Quick tips for a great profile photo:</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                      • Good lighting, clean background<br>
                      • Face clearly visible (no heavy filters)<br>
                      • Professional headshot or full body shot<br>
                      • High resolution — this is your first impression!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Upload My Photo Now
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
                Takes less than a minute!
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
      console.log(`  SENT: ${m.username} | ${m.email}`);
      sent++;
    }
  } catch (e) {
    console.log(`  ERROR: ${m.username} ${m.email} — ${e.message}`);
    errors++;
  }

  // Rate limit: 5/sec
  await new Promise((r) => setTimeout(r, 200));
}

console.log(`\nDone! Sent: ${sent} | Skipped: ${skipped} | Errors: ${errors}`);
