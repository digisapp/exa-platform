import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";

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
    console.error(`  Failed: ${to} - ${err}`);
    return false;
  }
}

async function main() {
  // Read failed emails list
  const failedEmails = fs.readFileSync("/tmp/failed-emails-clean.txt", "utf-8")
    .trim()
    .split("\n")
    .map(e => e.trim())
    .filter(Boolean);

  console.log(`Retrying ${failedEmails.length} failed emails (1s delay)...`);
  console.log("Waiting 60s for rate limit to reset...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  console.log("");

  // Look up usernames for these emails
  const { data: models } = await supabase
    .from("models")
    .select("email, username")
    .in("email", failedEmails);

  const emailToUsername = new Map<string, string>();
  for (const m of models || []) {
    emailToUsername.set(m.email, m.username);
  }

  let sent = 0;
  let failed = 0;

  for (const email of failedEmails) {
    const username = emailToUsername.get(email) || "model";
    console.log(`  Sending to: ${email} (@${username})`);

    const success = await sendEmail(email, username);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // 1s delay = 1 req/sec, well under the 2/sec limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("");
  console.log("=== RETRY DONE ===");
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total across both runs: ${256 + sent} sent`);
}

main().catch(console.error);
