import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";

async function main() {
  const to = "miriam@examodels.com";
  const username = "testmodel";
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

  console.log("Sending test email to:", to);

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
    const data = await res.json();
    console.log("Sent! ID:", data.id);
  } else {
    const err = await res.text();
    console.error("Failed:", err);
  }
}

main().catch(console.error);
