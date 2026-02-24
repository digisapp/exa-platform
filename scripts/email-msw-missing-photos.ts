/**
 * Email models who applied to Miami Swim Week 2026 but are missing:
 *   - profile photo
 *   - portfolio pictures
 *   - measurements
 *
 * Run with: npx tsx scripts/email-msw-missing-photos.ts
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
const DELAY_MS = 550;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildEmail({
  modelName,
  settingsUrl,
  profileUrl,
  missingPhoto,
  missingPortfolio,
  missingMeasurements,
}: {
  modelName: string;
  settingsUrl: string;
  profileUrl: string;
  missingPhoto: boolean;
  missingPortfolio: boolean;
  missingMeasurements: boolean;
}) {
  const items: { icon: string; title: string; body: string }[] = [];

  if (missingPhoto) {
    items.push({
      icon: "📸",
      title: "Upload your profile photo",
      body: "Your profile photo is the first thing casting directors and brands see — make it count!",
    });
  }
  if (missingPortfolio) {
    items.push({
      icon: "🖼️",
      title: "Add portfolio photos",
      body: "Upload your best runway, editorial, and lifestyle shots to show your range.",
    });
  }
  if (missingMeasurements) {
    items.push({
      icon: "📏",
      title: "Enter your measurements",
      body: "Height, bust, waist & hips — designers need this to fit you into their looks for the show.",
    });
  }

  const checklist = items.map(item => `
    <tr>
      <td style="padding: 15px; background-color: #1f1f1f; border-radius: 12px; border-left: 3px solid #ec4899;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width: 48px; vertical-align: top; text-align: center; padding-top: 2px;">
              <span style="font-size: 26px;">${item.icon}</span>
            </td>
            <td style="vertical-align: top;">
              <p style="margin: 0 0 4px; color: #ffffff; font-weight: 700; font-size: 15px;">${item.title}</p>
              <p style="margin: 0; color: #a1a1aa; font-size: 13px; line-height: 1.6;">${item.body}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="height: 10px;"></td></tr>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 20px; overflow: hidden; border: 1px solid #1e1e1e;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 44px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Miami Swim Week 2026</p>
              <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 30px; font-weight: 800; line-height: 1.2;">
                Your application is in — let's get your profile ready! 🌊
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                May 26 – 31, 2026 · Miami, FL
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 24px;">

              <p style="margin: 0 0 18px; color: #ffffff; font-size: 19px; font-weight: 600;">
                Hi ${modelName}! 👋
              </p>
              <p style="margin: 0 0 16px; color: #d4d4d8; font-size: 15px; line-height: 1.75;">
                Thank you so much for applying to <strong style="color: #ffffff;">Miami Swim Week 2026</strong>! We are so excited to have you interested in walking with us.
              </p>
              <p style="margin: 0 0 28px; color: #d4d4d8; font-size: 15px; line-height: 1.75;">
                Our team reviews every application before designers and brands can reach out, and right now your profile is missing a few things that could hold you back. Designers and casting teams <em>really do</em> look at profiles before making decisions — so completing yours could make all the difference.
              </p>

              <!-- Urgency Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.12) 100%); border-radius: 12px; border: 1px solid rgba(236,72,153,0.25);">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #ec4899; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Action Required</p>
                    <p style="margin: 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                      Please complete the items below so your application can be fully reviewed. It only takes a few minutes!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Checklist -->
              <p style="margin: 0 0 16px; color: #ffffff; font-size: 16px; font-weight: 700;">
                Complete your profile:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                ${checklist}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <a href="${settingsUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 18px 52px; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 20px rgba(236,72,153,0.4); letter-spacing: 0.3px;">
                      Complete My Profile →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 32px; color: #71717a; font-size: 13px; text-align: center;">
                Sign in at <a href="https://www.examodels.com" style="color: #ec4899; text-decoration: none;">examodels.com</a> and go to Settings to update your profile.
              </p>

              <!-- Encouragement Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px; background-color: #1a1a1a; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #ffffff; font-size: 15px; font-weight: 600;">
                      🌟 We believe in you!
                    </p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.7;">
                      Miami Swim Week is one of the most exciting events of the year and we want to see you on that runway. The more complete your profile, the better your chances of being selected by a designer. Let's make it happen! 💕
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1e1e1e; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 13px;">
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none; font-weight: 500;">View your profile</a>
                &nbsp;·&nbsp;
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none; font-weight: 500;">@examodels</a>
              </p>
              <p style="margin: 0; color: #3f3f46; font-size: 12px;">
                EXA Models · Miami Swim Week 2026
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
  console.log("🏖️  Miami Swim Week 2026 — Missing Profile Data Email\n");

  // 1. Find the MSW 2026 gig
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title")
    .ilike("title", "%miami swim week%")
    .limit(5);

  if (!gigs?.length) {
    console.error("❌ No Miami Swim Week gig found");
    process.exit(1);
  }

  const gig = gigs[0];
  console.log(`✅ Gig found: "${gig.title}" (${gig.id})\n`);

  // 2. Fetch all applications (any status except withdrawn/rejected)
  const { data: applications, error: appsError } = await supabase
    .from("gig_applications")
    .select(`
      id, status, model_id,
      model:models (
        id, username, email, first_name, last_name,
        profile_photo_url, height, bust, waist, hips
      )
    `)
    .eq("gig_id", gig.id)
    .not("status", "in", '("withdrawn","rejected")') as { data: any[], error: any };

  if (appsError) {
    console.error("❌ Error fetching applications:", appsError);
    process.exit(1);
  }

  console.log(`Total applications: ${applications?.length || 0}`);

  // 3. Filter to models missing profile photo
  const targets = (applications || []).filter((app: any) => {
    const m = app.model;
    return m && m.email && !m.profile_photo_url;
  });

  console.log(`Models missing profile photo: ${targets.length}\n`);

  if (targets.length === 0) {
    console.log("✅ All applicants have profile photos! Nothing to send.");
    return;
  }

  // 4. Get portfolio photo counts for these model IDs
  const modelIds = targets.map((a: any) => a.model.id);
  const { data: portfolioData } = await supabase
    .from("media_assets")
    .select("model_id")
    .in("model_id", modelIds)
    .eq("asset_type", "portfolio");

  const portfolioCounts = new Map<string, number>();
  for (const asset of portfolioData || []) {
    portfolioCounts.set(asset.model_id, (portfolioCounts.get(asset.model_id) || 0) + 1);
  }

  // 5. Check unsubscribes
  const emails = targets.map((a: any) => a.model.email).filter(Boolean);
  const { data: unsubData } = await supabase
    .from("email_unsubscribes")
    .select("email")
    .in("email", emails);
  const unsubSet = new Set((unsubData || []).map((u: any) => u.email.toLowerCase()));

  console.log(`📋 Breakdown:`);
  console.log(`  Unsubscribed: ${unsubSet.size}`);
  console.log(`  Will receive email: ${targets.length - unsubSet.size}\n`);
  console.log("📧 Sending emails...\n");

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const app of targets) {
    const m = app.model;
    const email = m.email?.toLowerCase();
    const name = m.first_name || m.username;

    if (unsubSet.has(email)) {
      console.log(`  ⏭️  ${m.username} — unsubscribed`);
      skipped++;
      continue;
    }

    const hasMeasurements = !!(m.height || m.bust || m.waist || m.hips);
    const hasPortfolio = (portfolioCounts.get(m.id) || 0) > 0;

    const missingPhoto = !m.profile_photo_url;        // always true (filtered above)
    const missingPortfolio = !hasPortfolio;
    const missingMeasurements = !hasMeasurements;

    const settingsUrl = "https://www.examodels.com/settings";
    const profileUrl = `https://www.examodels.com/${m.username}`;

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `${name}, complete your Miami Swim Week profile! 🌊`,
        html: buildEmail({
          modelName: name,
          settingsUrl,
          profileUrl,
          missingPhoto,
          missingPortfolio,
          missingMeasurements,
        }),
      });

      if (error) {
        console.log(`  ❌ ${m.username} (${email}): ${(error as any).message}`);
        failed++;
      } else {
        const missing = [
          missingPhoto && "photo",
          missingPortfolio && "portfolio",
          missingMeasurements && "measurements",
        ].filter(Boolean).join(", ");
        console.log(`  ✅ ${m.username} (${email}) — missing: ${missing}`);
        sent++;
      }
    } catch (err) {
      console.log(`  ❌ ${m.username} (${email}): ${err}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log("\n" + "═".repeat(52));
  console.log("📊 SUMMARY");
  console.log("═".repeat(52));
  console.log(`  Total applicants:        ${applications?.length || 0}`);
  console.log(`  Missing profile photo:   ${targets.length}`);
  console.log(`  ✅ Emails sent:          ${sent}`);
  console.log(`  ⏭️  Skipped (unsub/etc): ${skipped}`);
  console.log(`  ❌ Failed:               ${failed}`);
  console.log("\n🎉 Done!");
}

main().catch(console.error);
