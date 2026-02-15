import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";

// Set to true to actually send emails, false for dry run
const DRY_RUN = false;

async function sendEmail(to: string, username: string) {
  const settingsUrl = `${BASE_URL}/dashboard/settings`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="${BASE_URL}/exa-logo-white.png" alt="EXA Models" height="32" style="height: 32px;" />
    </div>

    <div style="background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 32px;">
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px;">Complete Your Profile</h2>

      <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 16px 0;">
        Hey @${username},
      </p>

      <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 16px 0;">
        We noticed your EXA Models profile is missing some key details. To be eligible for gigs, castings, and brand collaborations, please update your profile with:
      </p>

      <ul style="color: #a3a3a3; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
        <li><strong style="color: #ffffff;">Full Name</strong> (first and last)</li>
        <li><strong style="color: #ffffff;">Profile Photo</strong></li>
        <li><strong style="color: #ffffff;">Instagram</strong></li>
      </ul>

      <p style="color: #a3a3a3; line-height: 1.6; margin: 0 0 24px 0;">
        Models with complete profiles are prioritized for opportunities. It only takes a minute!
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${settingsUrl}" style="background: linear-gradient(to right, #ec4899, #8b5cf6); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          Complete Your Profile
        </a>
      </div>
    </div>

    <div style="text-align: center; margin-top: 32px;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">EXA Models</a> — Global Model Community
      </p>
    </div>
  </div>
</body>
</html>`;

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send to: ${to}`);
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: "Complete Your EXA Models Profile",
      html,
    }),
  });

  if (res.ok) {
    return true;
  } else {
    const err = await res.text();
    console.error(`  Failed to send to ${to}: ${err}`);
    return false;
  }
}

async function main() {
  // Get all claimed models that are completely empty (no name, no photo, no IG)
  const { data: models, error } = await supabase
    .from("models")
    .select("id, email, username, first_name, last_name, instagram_url, profile_photo_url, user_id")
    .not("user_id", "is", null) // Only claimed models
    .order("created_at", { ascending: false });

  if (error || !models) {
    console.error("Error:", error);
    return;
  }

  // Filter to models missing name OR photo OR instagram
  const incomplete = models.filter(
    m => !m.first_name || !m.last_name || !m.profile_photo_url || !m.instagram_url
  );

  console.log(`Total claimed models: ${models.length}`);
  console.log(`Incomplete profiles: ${incomplete.length}`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log("");

  let sent = 0;
  let failed = 0;

  for (const m of incomplete) {
    const missing: string[] = [];
    if (!m.first_name || !m.last_name) missing.push("name");
    if (!m.profile_photo_url) missing.push("photo");
    if (!m.instagram_url) missing.push("instagram");

    console.log(`@${m.username} | ${m.email} | missing: ${missing.join(", ")}`);

    const success = await sendEmail(m.email, m.username);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limit: Resend allows 10 emails/second on pro plan
    if (!DRY_RUN) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  console.log("");
  console.log("=== DONE ===");
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
