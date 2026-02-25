import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";

const contactName = "Miriam";
const brandName = "EXA Team";
const ctaUrl = `${BASE_URL}/sponsors/miami-swim-week`;
const ctaText = "View Sponsorship Packages";

const bodyText = `Hi ${contactName},

We're producing EXA's Miami Swim Week 2026 — a multi-day runway show event in Miami Beach (May 26–31) featuring 50+ professional models, media, and industry professionals.

We'd love to have ${brandName} as a sponsor. Packages start at $500 and go up to $20,000.

Would you be open to a quick call this week?

Warm regards,
Nathan
EXA Models`;

const htmlBody = bodyText
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => `<p style="margin: 0 0 14px; color: #d4d4d4; font-size: 15px; line-height: 1.7;">${line}</p>`)
  .join("\n");

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050505; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- Accent bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); height: 4px; border-radius: 4px 4px 0 0;"></td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color: #111111; border-radius: 0 0 16px 16px; padding: 40px 36px;">

              <p style="margin: 0 0 8px; color: #ec4899; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">EXA Models · Exclusive Invitation</p>
              <h1 style="margin: 0 0 6px; color: #ffffff; font-size: 30px; font-weight: 800; line-height: 1.15;">Miami Swim Week 2026</h1>
              <p style="margin: 0 0 32px; color: #71717a; font-size: 15px;">May 26–31 &nbsp;·&nbsp; Miami Beach, Florida</p>

              <div style="height: 1px; background: linear-gradient(90deg, #ec4899, #8b5cf6, transparent); margin-bottom: 28px;"></div>

              ${htmlBody}

              <p style="margin: 24px 0 16px; color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.3px;">What Your Sponsorship Includes:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #ec4899;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">🎯</td>
                      <td>
                        <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Logo on Red Carpet Promo Wall</p>
                        <p style="margin: 0; color: #71717a; font-size: 13px;">High-visibility placement photographed by every attendee &amp; media</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #8b5cf6;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">📸</td>
                      <td>
                        <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Brand Across All Event Materials</p>
                        <p style="margin: 0; color: #71717a; font-size: 13px;">Programs, signage, digital screens, and event backdrops</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #06b6d4;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">📱</td>
                      <td>
                        <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Social Media Coverage</p>
                        <p style="margin: 0; color: #71717a; font-size: 13px;">Featured across EXA's Instagram before, during &amp; after the event</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <!-- Package tiers -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #0d0d0d; border-radius: 12px; border: 1px solid #262626;">
                <tr>
                  <td style="padding: 20px 20px 16px;">
                    <p style="margin: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Sponsorship Packages</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;">
                          <p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$500</p>
                          <p style="margin: 0; color: #71717a; font-size: 11px;">Community</p>
                        </td>
                        <td style="width: 6px;"></td>
                        <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;">
                          <p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$1,500</p>
                          <p style="margin: 0; color: #71717a; font-size: 11px;">Gold</p>
                        </td>
                        <td style="width: 6px;"></td>
                        <td style="padding: 10px 8px; background-color: #1f0f2e; border-radius: 8px; text-align: center; border: 1px solid #8b5cf6; width: 25%;">
                          <p style="margin: 0 0 2px; color: #a78bfa; font-size: 17px; font-weight: 800;">$5,000</p>
                          <p style="margin: 0; color: #71717a; font-size: 11px;">Title Runway</p>
                        </td>
                        <td style="width: 6px;"></td>
                        <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;">
                          <p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$20K</p>
                          <p style="margin: 0; color: #71717a; font-size: 11px;">Presenting</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 36px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 44px; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #262626; padding-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 14px;">Nathan &mdash; EXA Models</p>
                    <p style="margin: 0 0 10px; color: #71717a; font-size: 13px;">Reply to this email to connect with our team</p>
                    <p style="margin: 0; color: #71717a; font-size: 12px;">
                      <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">examodels.com</a>
                      &nbsp;&middot;&nbsp;
                      <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">@examodels</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const { data, error } = await resend.emails.send({
  from: "Nathan at EXA Models <nathan@examodels.com>",
  to: ["miriam@examodels.com"],
  subject: "Join Us for Miami Swim Week 2026 [TEST]",
  replyTo: "nathan@examodels.com",
  html,
});

if (error) {
  console.error("Failed:", error);
} else {
  console.log("Sent! Message ID:", data?.id);
}
