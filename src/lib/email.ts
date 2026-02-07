import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/service";

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

/**
 * Get or create an unsubscribe token for an email address
 */
async function getUnsubscribeToken(email: string): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await (supabase.rpc as any)("get_or_create_email_preferences", {
      p_email: email,
    });
    if (error || !data?.[0]?.unsubscribe_token) {
      console.error("Failed to get unsubscribe token:", error);
      return null;
    }
    return data[0].unsubscribe_token;
  } catch (error) {
    console.error("Error getting unsubscribe token:", error);
    return null;
  }
}

/**
 * Check if an email is unsubscribed
 */
async function isEmailUnsubscribed(email: string, emailType: "all" | "marketing" | "notification" = "all"): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await (supabase.rpc as any)("is_email_unsubscribed", {
      p_email: email,
      p_email_type: emailType,
    });
    if (error) {
      console.error("Failed to check unsubscribe status:", error);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error("Error checking unsubscribe status:", error);
    return false;
  }
}

/**
 * Generate the email footer with unsubscribe link
 */
function generateEmailFooter(unsubscribeToken: string | null): string {
  const unsubscribeUrl = unsubscribeToken
    ? `${BASE_URL}/unsubscribe?token=${unsubscribeToken}`
    : null;

  return `
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Reply to this email or DM us on Instagram
              </p>
              <p style="margin: 0 0 10px; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
              ${unsubscribeUrl ? `
              <p style="margin: 0; color: #52525b; font-size: 11px;">
                <a href="${unsubscribeUrl}" style="color: #52525b; text-decoration: underline;">Unsubscribe</a> from these emails
              </p>
              ` : ""}
            </td>
          </tr>`;
}

export async function sendModelApprovalEmail({
  to,
  modelName,
  username,
}: {
  to: string;
  modelName: string;
  username: string;
}) {
  try {
    // Check if unsubscribed
    if (await isEmailUnsubscribed(to, "notification")) {
      console.log(`Email ${to} is unsubscribed, skipping`);
      return { success: true, skipped: true };
    }

    const resend = getResendClient();
    const profileUrl = `${BASE_URL}/${username}`;
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const unsubscribeToken = await getUnsubscribeToken(to);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Welcome to EXA Models - Your Application is Approved!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Welcome to EXA Models
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Your application has been approved!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)},
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Great news! Your model application has been approved. You're now part of the EXA community and your profile is live!
              </p>

              <!-- Profile Link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Your Profile
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 600;">
                Next Steps to Get Started
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <!-- Step 1 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px; margin-bottom: 10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">1</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Complete Your Profile</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Add your bio, measurements, photos, and portfolio to stand out.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>

                <!-- Step 2 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">2</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Connect Your Social Media</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Link your Instagram, TikTok, and other accounts to grow your reach.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>

                <!-- Step 3 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">3</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Browse Gigs & Opportunities</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Find modeling gigs, brand collaborations, and paid opportunities.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>

                <!-- Step 4 -->
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: bold;">4</div>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 5px; color: #ffffff; font-weight: 600;">Earn Coins & Get Paid</p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">Receive tips from fans, sell premium content, and cash out your earnings.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Dashboard Link -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #262626; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 1px solid #404040;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendModelInviteEmail({
  to,
  modelName,
  claimUrl,
}: {
  to: string;
  modelName: string;
  claimUrl: string;
}) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${modelName}, your EXA Models profile is ready!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Your Profile is Ready!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Claim your EXA Models profile
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Great news - your profile has been created on EXA Models! We've imported your info and you're ready to start connecting with brands, getting booked for gigs, and growing your modeling career.
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Click the button below to set up your password and claim your profile:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                      Claim My Profile
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What you get -->
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                What you get with EXA:
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px; margin-bottom: 8px;">
                    <p style="margin: 0; color: #ffffff; font-size: 14px;">
                      ✨ Your own model profile page
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <p style="margin: 0; color: #ffffff; font-size: 14px;">
                      💼 Access to paid gigs and opportunities
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <p style="margin: 0; color: #ffffff; font-size: 14px;">
                      💰 Earn tips from fans and sell content
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <p style="margin: 0; color: #ffffff; font-size: 14px;">
                      🤝 Connect with brands and other models
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                This link is unique to you. If you have any questions, just reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                See you on EXA! 💜
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendModelRejectionEmail({
  to,
  modelName,
}: {
  to: string;
  modelName: string;
}) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "EXA Models - Application Update",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #262626; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                EXA Models
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in joining EXA Models. After reviewing your application, we're unable to approve it at this time.
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                This could be due to incomplete profile information, photo quality, or other factors. You're welcome to reapply in the future with an updated application.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                In the meantime, you can still enjoy EXA as a fan and connect with models on the platform.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// MODEL NOTIFICATION EMAILS
// ============================================

export async function sendContentPurchaseEmail({
  to,
  modelName,
  buyerName,
  contentTitle,
  coinsEarned,
}: {
  to: string;
  modelName: string;
  buyerName: string;
  contentTitle: string;
  coinsEarned: number;
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/earnings`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `💰 ${buyerName} just unlocked your content!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">💰</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                Content Unlocked!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)}! 🎉
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${escapeHtml(buyerName)}</strong> just unlocked your exclusive content!
              </p>

              <!-- Content Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Content</p>
                    <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; font-weight: 500;">${escapeHtml(contentTitle)}</p>
                    <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">You Earned</p>
                    <p style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold;">${coinsEarned} coins</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Earnings
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendTipReceivedEmail({
  to,
  modelName,
  tipperName,
  amount,
  message,
}: {
  to: string;
  modelName: string;
  tipperName: string;
  amount: number;
  message?: string;
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/earnings`;

    const messageHtml = message
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px; border-left: 3px solid #ec4899;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 12px;">Message from ${escapeHtml(tipperName)}:</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px; font-style: italic;">"${escapeHtml(message)}"</p>
                  </td>
                </tr>
              </table>`
      : "";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🎁 ${tipperName} sent you ${amount} coins!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">🎁</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                You Got a Tip!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${escapeHtml(tipperName)}</strong> just sent you a tip!
              </p>

              <!-- Tip Amount -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 30px; background-color: #262626; border-radius: 12px;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 14px;">Tip Amount</p>
                    <p style="margin: 0; color: #ec4899; font-size: 42px; font-weight: bold;">${amount}</p>
                    <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 14px;">coins</p>
                  </td>
                </tr>
              </table>

              ${messageHtml}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Earnings
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models Worldwide
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// PPV MESSAGE UNLOCK EMAIL
// ============================================

export async function sendPPVUnlockedEmail({
  to,
  modelName,
  buyerName,
  amount,
}: {
  to: string;
  modelName: string;
  buyerName: string;
  amount: number;
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/earnings`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🔓 ${buyerName} unlocked your PPV message for ${amount} coins!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">🔓</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                PPV Content Unlocked!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${escapeHtml(buyerName)}</strong> just unlocked your pay-per-view message!
              </p>

              <!-- Amount -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 30px; background-color: #262626; border-radius: 12px;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 14px;">Amount Earned</p>
                    <p style="margin: 0; color: #ec4899; font-size: 42px; font-weight: bold;">${amount}</p>
                    <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 14px;">coins</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Earnings
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models Worldwide
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// BOOKING NOTIFICATION EMAILS
// ============================================

export async function sendBookingRequestEmail({
  to,
  modelName,
  clientName,
  clientType,
  serviceType,
  eventDate,
  totalAmount,
  bookingNumber,
}: {
  to: string;
  modelName: string;
  clientName: string;
  clientType: "fan" | "brand";
  serviceType: string;
  eventDate: string;
  totalAmount: number;
  bookingNumber: string;
}) {
  try {
    const resend = getResendClient();
    const bookingsUrl = `${BASE_URL}/bookings`;
    const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `New Booking Request from ${clientName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">📅</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                New Booking Request!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${escapeHtml(modelName)}!
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                You have a new booking request from <strong style="color: #ffffff;">${escapeHtml(clientName)}</strong>${clientType === "brand" ? " (Brand)" : ""}.
              </p>

              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 15px; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Booking #</p>
                          <p style="margin: 0; color: #ffffff; font-size: 14px;">${escapeHtml(bookingNumber)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Service</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 500;">${escapeHtml(serviceType)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Date</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">${formattedDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Amount</p>
                          <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: bold;">${totalAmount.toLocaleString()} coins</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Urgency Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #422006; border-radius: 8px; border-left: 3px solid #f59e0b;">
                    <p style="margin: 0; color: #fcd34d; font-size: 14px;">
                      ⏰ Respond quickly! The client's coins are soft-reserved until you accept or decline.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${bookingsUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Booking Request
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendBookingAcceptedEmail({
  to,
  clientName,
  modelName,
  modelUsername,
  serviceType,
  eventDate,
  totalAmount,
  bookingNumber,
}: {
  to: string;
  clientName: string;
  modelName: string;
  modelUsername: string;
  serviceType: string;
  eventDate: string;
  totalAmount: number;
  bookingNumber: string;
}) {
  try {
    const resend = getResendClient();
    const bookingsUrl = `${BASE_URL}/bookings`;
    const modelProfileUrl = `${BASE_URL}/${modelUsername}`;
    const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${modelName} accepted your booking request!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">✅</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                Booking Accepted!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Great news, ${clientName}!
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${modelName}</strong> has accepted your booking request! Your coins have been secured in escrow.
              </p>

              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 15px; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Booking #</p>
                          <p style="margin: 0; color: #ffffff; font-size: 14px;">${bookingNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Model</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 500;">${modelName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Service</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">${serviceType}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Date</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">${formattedDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Amount (In Escrow)</p>
                          <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: bold;">${totalAmount.toLocaleString()} coins</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #052e16; border-radius: 8px; border-left: 3px solid #10b981;">
                    <p style="margin: 0 0 8px; color: #4ade80; font-size: 14px; font-weight: 600;">What's Next?</p>
                    <p style="margin: 0; color: #86efac; font-size: 14px;">
                      Coordinate the details with ${modelName} and confirm the booking when ready. Coins will be released to the model upon completion.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTAs -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <a href="${bookingsUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Booking
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${modelProfileUrl}" style="display: inline-block; color: #a1a1aa; text-decoration: none; font-size: 14px;">
                      View ${modelName}'s Profile
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendBookingDeclinedEmail({
  to,
  clientName,
  modelName,
  serviceType,
  eventDate,
  bookingNumber,
  reason,
}: {
  to: string;
  clientName: string;
  modelName: string;
  serviceType: string;
  eventDate: string;
  bookingNumber: string;
  reason?: string;
}) {
  try {
    const resend = getResendClient();
    const modelsUrl = `${BASE_URL}/models`;
    const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const reasonHtml = reason
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px; border-left: 3px solid #71717a;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 12px;">Message from ${modelName}:</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px; font-style: italic;">"${reason}"</p>
                  </td>
                </tr>
              </table>`
      : "";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Booking update: ${modelName} couldn't accept your request`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #262626; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                Booking Update
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${clientName},
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Unfortunately, <strong style="color: #ffffff;">${modelName}</strong> wasn't able to accept your booking request. Don't worry - no coins were charged.
              </p>

              <!-- Booking Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 15px; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Booking #</p>
                          <p style="margin: 0; color: #ffffff; font-size: 14px;">${bookingNumber}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Service</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">${serviceType}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0; border-bottom: 1px solid #404040;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Requested Date</p>
                          <p style="margin: 0; color: #ffffff; font-size: 16px;">${formattedDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 15px;">
                          <p style="margin: 0 0 5px; color: #71717a; font-size: 12px; text-transform: uppercase;">Status</p>
                          <p style="margin: 0; color: #ef4444; font-size: 16px; font-weight: 500;">Declined</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${reasonHtml}

              <!-- Encouragement -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #1e1b4b; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0; color: #c4b5fd; font-size: 14px;">
                      💡 There are many other amazing models on EXA ready to work with you. Browse our talent pool to find your perfect match!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${modelsUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Browse Models
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendVideoCallRequestEmail({
  to,
  modelName,
  callerName,
  callRate,
  callType = "video",
}: {
  to: string;
  modelName: string;
  callerName: string;
  callRate: number;
  callType?: "video" | "voice";
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/chats`;
    const callTypeLabel = callType === "voice" ? "voice" : "video";
    const emoji = callType === "voice" ? "🎙️" : "📱";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${emoji} ${callerName} wants to ${callTypeLabel} call you!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">${emoji}</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                Incoming ${callTypeLabel.charAt(0).toUpperCase() + callTypeLabel.slice(1)} Call Request!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 📱
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${callerName}</strong> is trying to ${callTypeLabel} call you! Open your chats to accept the call.
              </p>

              <!-- Call Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 14px;">Your Rate</p>
                    <p style="margin: 0; color: #3b82f6; font-size: 28px; font-weight: bold;">${callRate} coins/min</p>
                  </td>
                </tr>
              </table>

              <!-- Urgency Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #422006; border-radius: 8px; border-left: 3px solid #f59e0b;">
                    <p style="margin: 0; color: #fcd34d; font-size: 14px;">
                      ⏰ Don't keep them waiting! Hop on the app to answer.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Open Chats
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// Send email when model receives a new offer
export async function sendOfferReceivedEmail({
  to,
  modelName,
  brandName,
  offerTitle,
  eventDate,
  eventTime,
  location,
  compensation,
  offerId,
}: {
  to: string;
  modelName: string;
  brandName: string;
  offerTitle: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  compensation?: string;
  offerId: string;
}) {
  try {
    const resend = getResendClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";
    const offerUrl = `${baseUrl}/models/offers/${offerId}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🎉 New Offer from ${brandName}: ${offerTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                New Offer! 🎁
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 👋
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${brandName}</strong> has sent you an exciting offer!
              </p>

              <!-- Offer Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 20px;">${offerTitle}</h2>

                    ${eventDate ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📅</td>
                        <td style="color: #ffffff; font-size: 14px;">${eventDate}${eventTime ? ` at ${eventTime}` : ""}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${location ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📍</td>
                        <td style="color: #ffffff; font-size: 14px;">${location}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${compensation ? `
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">💰</td>
                        <td style="color: #10b981; font-size: 14px; font-weight: 600;">${compensation}</td>
                      </tr>
                    </table>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- Urgency Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #1e1b4b; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0; color: #c4b5fd; font-size: 14px;">
                      ⚡ Respond quickly! Spots fill up fast.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${offerUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Offer Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// GIG APPLICATION NOTIFICATION EMAILS
// ============================================

export async function sendGigApplicationAcceptedEmail({
  to,
  modelName,
  gigTitle,
  gigDate,
  gigLocation,
  eventName,
}: {
  to: string;
  modelName: string;
  gigTitle: string;
  gigDate?: string;
  gigLocation?: string;
  eventName?: string;
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/dashboard`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You're in! Accepted for ${gigTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">🎉</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 28px; font-weight: bold;">
                Congratulations!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                You've been accepted!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 🎊
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Great news! Your application has been <strong style="color: #10b981;">accepted</strong> for:
              </p>

              <!-- Gig Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 20px;">${gigTitle}</h2>

                    ${eventName ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">🏆</td>
                        <td style="color: #ec4899; font-size: 14px; font-weight: 600;">${eventName}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${gigDate ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📅</td>
                        <td style="color: #ffffff; font-size: 14px;">${gigDate}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${gigLocation ? `
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📍</td>
                        <td style="color: #ffffff; font-size: 14px;">${gigLocation}</td>
                      </tr>
                    </table>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #052e16; border-radius: 8px; border-left: 3px solid #10b981;">
                    <p style="margin: 0 0 8px; color: #4ade80; font-size: 14px; font-weight: 600;">What's Next?</p>
                    <p style="margin: 0; color: #86efac; font-size: 14px;">
                      We'll be in touch with more details soon. Check your dashboard and messages for updates!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// Creator House acceptance email with payment options
export async function sendCreatorHouseAcceptedEmail({
  to,
  modelName,
  gigTitle,
  gigDate,
  gigLocation,
  applicationId,
  gigSlug,
}: {
  to: string;
  modelName: string;
  gigTitle: string;
  gigDate?: string;
  gigLocation?: string;
  applicationId: string;
  gigId?: string;
  modelId?: string;
  gigSlug: string;
}) {
  try {
    const resend = getResendClient();
    const paymentUrl = `${BASE_URL}/gigs/${gigSlug}?pay=true&application=${applicationId}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You're in! EXA Models Creator House - Complete Your Payment`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">📸🏝️✨</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 28px; font-weight: bold;">
                You're Accepted!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                EXA Models Creator House
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 🎉
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Congratulations! You've been <strong style="color: #ec4899;">accepted</strong> to the EXA Models Creator House! We're excited to have you join us.
              </p>

              <!-- Gig Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 20px;">${gigTitle}</h2>

                    ${gigDate ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📅</td>
                        <td style="color: #ffffff; font-size: 14px;">${gigDate}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${gigLocation ? `
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📍</td>
                        <td style="color: #ffffff; font-size: 14px;">${gigLocation}</td>
                      </tr>
                    </table>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- Payment Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; background: linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(139,92,246,0.1) 100%); border: 1px solid rgba(236,72,153,0.3); border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 15px; color: #ec4899; font-size: 18px; font-weight: bold;">💳 Complete Your Payment - $1,400</h3>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                      To secure your spot, please complete payment using one of the options below:
                    </p>

                    <!-- Stripe Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <tr>
                        <td align="center">
                          <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Pay $1,400 with Card
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 15px; color: #71717a; font-size: 14px; text-align: center;">— OR —</p>

                    <!-- Alternative Payment Options -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px;">
                          <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px; font-weight: 600;">
                            💵 Zelle
                          </p>
                          <p style="margin: 0 0 15px; color: #a1a1aa; font-size: 14px;">
                            Send to: <strong style="color: #10b981;">EXA LLC</strong><br>
                            Phone: <strong style="color: #10b981;">561-573-7510</strong>
                          </p>

                          <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px; font-weight: 600;">
                            💸 CashApp
                          </p>
                          <p style="margin: 0; color: #a1a1aa; font-size: 14px;">
                            Send to: <strong style="color: #10b981;">$EXAMODELS</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Flight Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #422006; border-radius: 8px; border-left: 3px solid #f59e0b;">
                    <p style="margin: 0 0 8px; color: #fbbf24; font-size: 14px; font-weight: 600;">✈️ Important: Flights not included, before Booking Flights</p>
                    <p style="margin: 0; color: #fcd34d; font-size: 14px;">
                      Please DM us on Instagram <a href="https://instagram.com/examodels" style="color: #ec4899; font-weight: bold;">@examodels</a> to confirm your flights before booking!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Questions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #052e16; border-radius: 8px; border-left: 3px solid #10b981;">
                    <p style="margin: 0 0 8px; color: #4ade80; font-size: 14px; font-weight: 600;">Questions?</p>
                    <p style="margin: 0; color: #86efac; font-size: 14px;">
                      DM us on Instagram <a href="https://instagram.com/examodels" style="color: #ec4899; font-weight: bold;">@examodels</a> or reply to this email!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${BASE_URL}/dashboard" style="display: inline-block; background-color: #262626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #404040;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendGigApplicationRejectedEmail({
  to,
  modelName,
  gigTitle,
}: {
  to: string;
  modelName: string;
  gigTitle: string;
}) {
  try {
    const resend = getResendClient();
    const gigsUrl = `${BASE_URL}/gigs`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Application Update: ${gigTitle}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #262626; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                Application Update
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in <strong style="color: #ffffff;">${gigTitle}</strong>. Unfortunately, we weren't able to accept your application at this time.
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Don't be discouraged! There are plenty of other opportunities on EXA. Keep applying and building your profile - your next booking could be right around the corner.
              </p>

              <!-- Encouragement -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #1e1b4b; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0; color: #c4b5fd; font-size: 14px;">
                      💡 Tip: Keep your profile updated with fresh photos and complete all your measurements to increase your chances!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${gigsUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Browse More Gigs
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// Send reminder email before event
export async function sendOfferReminderEmail({
  to,
  modelName,
  offerTitle,
  eventDate,
  eventTime,
  location,
  brandName,
  brandContact,
}: {
  to: string;
  modelName: string;
  offerTitle: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  brandName: string;
  brandContact?: string;
}) {
  try {
    const resend = getResendClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";
    const dashboardUrl = `${baseUrl}/models/offers`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `⏰ Reminder: ${offerTitle} is coming up!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                Event Reminder ⏰
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 👋
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Just a friendly reminder that your confirmed event with <strong style="color: #ffffff;">${brandName}</strong> is coming up soon!
              </p>

              <!-- Event Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 20px;">${offerTitle}</h2>

                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📅</td>
                        <td style="color: #fbbf24; font-size: 16px; font-weight: 600;">${eventDate}${eventTime ? ` at ${eventTime}` : ""}</td>
                      </tr>
                    </table>

                    ${location ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📍</td>
                        <td style="color: #ffffff; font-size: 14px;">${location}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${brandContact ? `
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📞</td>
                        <td style="color: #ffffff; font-size: 14px;">${brandContact}</td>
                      </tr>
                    </table>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- Tips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px; background-color: #1e1b4b; border-radius: 8px;">
                    <p style="margin: 0 0 10px; color: #c4b5fd; font-size: 14px; font-weight: 600;">Quick Tips:</p>
                    <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">✓ Arrive 10-15 minutes early</p>
                    <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 13px;">✓ Bring your ID and any required items</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 13px;">✓ Message the brand if you have any questions</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View My Offers
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// COIN BALANCE REMINDER EMAIL
// ============================================

// ============================================
// EMAIL CONFIRMATION EMAIL
// ============================================

export async function sendEmailConfirmationEmail({
  to,
  confirmUrl,
  displayName,
  signupType = "fan",
}: {
  to: string;
  confirmUrl: string;
  displayName?: string;
  signupType?: "fan" | "model" | "brand";
}) {
  try {
    const resend = getResendClient();
    const greeting = displayName ? `Hey ${displayName}!` : "Hey there!";
    const typeLabel = signupType === "model" ? "model" : signupType === "brand" ? "brand" : "fan";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Confirm Your EXA Models Email",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Welcome to EXA Models!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Just one more step to get started
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                ${greeting} 👋
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Thanks for signing up as a ${typeLabel} on EXA Models! Click the button below to confirm your email and activate your account:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                      Confirm Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0 0 8px; color: #c4b5fd; font-size: 14px; font-weight: 600;">What's next?</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                      ${signupType === "model"
                        ? "After confirming, our team will review your application. You'll get an email once you're approved!"
                        : "After confirming, you can start browsing models, sending messages, and supporting your favorites!"
                      }
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiry Notice -->
              <p style="margin: 0 0 20px; color: #71717a; font-size: 13px; line-height: 1.5;">
                This link will expire in 24 hours. If you didn't create an account on EXA Models, you can safely ignore this email.
              </p>

              <!-- Fallback Link -->
              <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; color: #a1a1aa; font-size: 12px; word-break: break-all;">
                ${confirmUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Reply to this email or DM us on Instagram
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// PASSWORD RESET EMAIL
// ============================================

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Reset Your EXA Models Password",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Reset Your Password
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Let's get you back in
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey there! 👋
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px; border-left: 3px solid #f59e0b;">
                    <p style="margin: 0 0 8px; color: #fcd34d; font-size: 14px; font-weight: 600;">Security Notice</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; color: #a1a1aa; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Need help? Reply to this email or DM us on Instagram
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendCoinBalanceReminderEmail({
  to,
  modelName,
  coinBalance,
}: {
  to: string;
  modelName: string;
  coinBalance: number;
}) {
  try {
    const resend = getResendClient();
    const walletUrl = `${BASE_URL}/wallet`;
    const usdValue = (coinBalance * 0.10).toFixed(2);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You've earned $${usdValue}! Your coins are ready to cash out`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">💰</div>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Your Coins Are Piling Up!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Cash out or spread the love
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 👋
              </p>

              <!-- Balance Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 25px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #a1a1aa; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Your Balance
                    </p>
                    <p style="margin: 0 0 5px; color: #ffffff; font-size: 42px; font-weight: bold;">
                      ${coinBalance.toLocaleString()} <span style="font-size: 24px;">coins</span>
                    </p>
                    <p style="margin: 0; color: #22c55e; font-size: 20px; font-weight: 600;">
                      = $${usdValue} USD
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                You've hit the $50 minimum! Withdraw your earnings or tip a model who inspires you.
              </p>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right: 10px;">
                          <a href="${walletUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            💵 Withdraw
                          </a>
                        </td>
                        <td style="padding-left: 10px;">
                          <a href="${BASE_URL}/messages" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            💕 Tip a Model
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; text-align: center;">
                      💡 <strong style="color: #ffffff;">Tip:</strong> Supporting other models helps build our community and keeps the good vibes flowing!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendProfileCompletionReminderEmail({
  to,
  modelName,
  username,
  hasPhoto,
}: {
  to: string;
  modelName: string;
  username: string;
  hasPhoto: boolean;
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const profileUrl = `${BASE_URL}/${username}`;

    const photoMessage = hasPhoto
      ? "We noticed your profile photo could use an upgrade! A high-quality photo helps you stand out to brands and get more bookings."
      : "We noticed you haven't uploaded a profile photo yet! Adding one is the #1 way to get noticed by brands and fans.";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${modelName}, let's make your EXA profile shine!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Complete Your Profile
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                A few quick updates to get more bookings!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                ${photoMessage}
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Models with complete profiles get <strong style="color: #ec4899;">5x more views</strong> and are more likely to be featured on our homepage and get booked for gigs!
              </p>

              <!-- Checklist -->
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Quick Profile Checklist:
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <!-- Item 1 -->
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 30px; vertical-align: middle;">
                          <span style="color: #ec4899; font-size: 18px; font-weight: bold;">1.</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 500;">Upload a stunning profile photo</p>
                          <p style="margin: 5px 0 0; color: #71717a; font-size: 13px;">High-quality headshot or professional photo</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>

                <!-- Item 2 -->
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 30px; vertical-align: middle;">
                          <span style="color: #ec4899; font-size: 18px; font-weight: bold;">2.</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 500;">Add your measurements</p>
                          <p style="margin: 5px 0 0; color: #71717a; font-size: 13px;">Height, bust, waist, hips - brands need these!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>

                <!-- Item 3 -->
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 30px; vertical-align: middle;">
                          <span style="color: #ec4899; font-size: 18px; font-weight: bold;">3.</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 500;">Write a bio</p>
                          <p style="margin: 5px 0 0; color: #71717a; font-size: 13px;">Tell brands about yourself and your experience</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>

                <!-- Item 4 -->
                <tr>
                  <td style="padding: 12px 15px; background-color: #262626; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 30px; vertical-align: middle;">
                          <span style="color: #ec4899; font-size: 18px; font-weight: bold;">4.</span>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; color: #ffffff; font-weight: 500;">Set your booking rates</p>
                          <p style="margin: 5px 0 0; color: #71717a; font-size: 13px;">Let brands know your rates for photoshoots, events & more</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px;">
                      Complete My Profile
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                It only takes 5 minutes!
              </p>
            </td>
          </tr>

          <!-- Motivation -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      Did you know?
                    </p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                      Complete profiles are featured on our homepage carousel, seen by thousands of brands and fans every day!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none;">View your profile</a> |
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models - Where Models Shine
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendMiamiSwimWeekInviteEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  try {
    const resend = getResendClient();
    const signupUrl = BASE_URL;
    const dashboardUrl = `${BASE_URL}/dashboard`;

    const greeting = name ? `Hey ${name}!` : "Hey Beautiful!";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Miami Swim Week 2026 - Create Your EXA Profile & Apply Today!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header with Beach/Swim Vibes -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 50%, #f97316 100%); padding: 50px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 40px;">🌴🌊👙</p>
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                Miami Swim Week 2026
              </h1>
              <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 18px; font-weight: 500;">
                Your runway moment is calling!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 500;">
                ${greeting}
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                The sun, the sand, the runway... <strong style="color: #ec4899;">Miami Swim Week 2026</strong> is coming and we want YOU there! 
                EXA Models is looking for fresh faces and seasoned pros to strut their stuff at one of the hottest fashion events of the year.
              </p>

              <!-- Event Highlights -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%); border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 15px; color: #ffffff; font-size: 16px; font-weight: 600; text-align: center;">
                      What's waiting for you:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #06b6d4; margin-right: 10px;">&#10003;</span> Walk for top swimwear brands
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #ec4899; margin-right: 10px;">&#10003;</span> Network with industry professionals
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #f97316; margin-right: 10px;">&#10003;</span> Get paid to do what you love
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #06b6d4; margin-right: 10px;">&#10003;</span> Build your portfolio with pro photos
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA for New Users -->
              <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Ready to make waves?
              </h2>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                Create your free EXA Models profile and apply for Miami Swim Week 2026. It only takes a few minutes!
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 35px;">
                <tr>
                  <td align="center">
                    <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Create My Profile
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="border-top: 1px solid #333; padding-top: 30px;">
                  </td>
                </tr>
              </table>

              <!-- Section for Existing Users -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 12px; padding: 25px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 15px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      Already have an account? You're one step ahead!
                    </p>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                      Make sure your profile is runway-ready! Brands are looking for models with complete profiles. Here's your checklist:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #ec4899; margin-right: 8px;">1.</span> <strong style="color: #fff;">Upload a stunning profile photo</strong> - First impressions matter!
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #ec4899; margin-right: 8px;">2.</span> <strong style="color: #fff;">Add your measurements</strong> - Brands need these for castings
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">
                          <span style="color: #ec4899; margin-right: 8px;">3.</span> <strong style="color: #fff;">Complete your bio</strong> - Let your personality shine
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                      <tr>
                        <td align="center">
                          <a href="${dashboardUrl}" style="display: inline-block; background-color: transparent; color: #ec4899; text-decoration: none; padding: 12px 30px; border-radius: 30px; font-weight: 600; font-size: 14px; border: 2px solid #ec4899;">
                            Update My Profile
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; color: #f97316; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      Spots are limited - Apply early!
                    </p>
                    <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 13px;">
                      Don't miss your chance to walk in Miami Swim Week 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 15px; color: #a1a1aa; font-size: 14px;">
                <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">Visit EXA Models</a> |
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">Follow us on Instagram</a>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                See you on the runway! &#x2728;
              </p>
              <p style="margin: 10px 0 0; color: #525252; font-size: 11px;">
                EXA Models - Top Models Worldwide
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendMiamiSwimWeekProfileReminderEmail({
  to,
  modelName,
}: {
  to: string;
  modelName: string;
}) {
  try {
    // Check if unsubscribed
    if (await isEmailUnsubscribed(to, "marketing")) {
      console.log(`Email ${to} is unsubscribed, skipping`);
      return { success: true, skipped: true };
    }

    const resend = getResendClient();
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const unsubscribeToken = await getUnsubscribeToken(to);

    const greeting = modelName ? `Hey ${modelName}!` : "Hey!";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: "Miami Swim Week 2026 - Complete Your Profile for Designers!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header with Beach/Swim Vibes -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 50%, #f97316 100%); padding: 50px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 40px;">🌴👙✨</p>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                Miami Swim Week 2026
              </h1>
              <p style="margin: 15px 0 0; color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500;">
                Designers need your complete profile!
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 500;">
                ${greeting}
              </p>
              <p style="margin: 0 0 25px; color: #a1a1aa; font-size: 16px; line-height: 1.7;">
                <strong style="color: #ec4899;">Miami Swim Week 2026</strong> is approaching and designers are reviewing model profiles for their shows.
                We noticed your profile is missing some key information that brands need for casting decisions.
              </p>

              <!-- What's Missing -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(236, 72, 153, 0.3);">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px; color: #f97316; font-size: 16px; font-weight: 600;">
                      Action Required
                    </p>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                      Login to your <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">examodels.com</a> account to update your profile settings.
                    </p>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                      To be considered for Miami Swim Week shows, designers need:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #ec4899; margin-right: 10px;">1.</span>
                          <strong style="color: #fff;">Profile Photo</strong> - A clear, professional headshot or full body shot
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; color: #a1a1aa; font-size: 15px;">
                          <span style="color: #06b6d4; margin-right: 10px;">2.</span>
                          <strong style="color: #fff;">Measurements</strong> - Height, bust, waist, hips for swimwear fittings (input measurements in profile settings)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);">
                      Complete My Profile Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendNewGigAnnouncementEmail({
  to,
  modelName,
  gigTitle,
  gigType,
  gigDate,
  gigLocation,
  gigSlug,
  coverImageUrl,
}: {
  to: string;
  modelName: string;
  gigTitle: string;
  gigType: string;
  gigDate?: string;
  gigLocation?: string;
  gigSlug: string;
  coverImageUrl?: string;
}) {
  try {
    // Check if unsubscribed
    if (await isEmailUnsubscribed(to, "marketing")) {
      console.log(`Email ${to} is unsubscribed, skipping`);
      return { success: true, skipped: true };
    }

    const resend = getResendClient();
    const gigUrl = `${BASE_URL}/gigs/${gigSlug}`;
    const unsubscribeToken = await getUnsubscribeToken(to);

    const greeting = modelName ? `Hey ${modelName}!` : "Hey!";
    const typeLabel = gigType === "show" ? "Show" : gigType === "travel" ? "Travel Trip" : gigType === "photoshoot" ? "Photoshoot" : "Gig";
    const typeEmoji = gigType === "show" ? "🎭" : gigType === "travel" ? "✈️" : gigType === "photoshoot" ? "📸" : "✨";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `New ${typeLabel}: ${gigTitle} - Apply Now!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">${typeEmoji}</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 28px; font-weight: bold;">
                New ${typeLabel} Posted!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                A new opportunity is waiting for you
              </p>
            </td>
          </tr>

          ${coverImageUrl ? `
          <!-- Cover Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${coverImageUrl}" alt="${gigTitle}" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          ` : ""}

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                ${greeting}
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                We just posted a new opportunity that might be perfect for you!
              </p>

              <!-- Gig Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 5px; color: #ec4899; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      ${typeLabel}
                    </p>
                    <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 22px;">${gigTitle}</h2>

                    ${gigDate ? `
                    <table cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📅</td>
                        <td style="color: #ffffff; font-size: 14px;">${gigDate}</td>
                      </tr>
                    </table>
                    ` : ""}

                    ${gigLocation ? `
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-right: 10px;">📍</td>
                        <td style="color: #ffffff; font-size: 14px;">${gigLocation}</td>
                      </tr>
                    </table>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${gigUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Details & Apply
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; text-align: center;">
                Spots are limited - apply early for the best chance!
              </p>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ============================================
// CONTENT PROGRAM EMAILS
// ============================================

export async function sendContentProgramOutreachEmail({
  to,
  brandName,
  contactName,
}: {
  to: string;
  brandName: string;
  contactName: string;
}) {
  try {
    if (await isEmailUnsubscribed(to, "marketing")) {
      console.log(`Email ${to} is unsubscribed, skipping`);
      return { success: true, skipped: true };
    }

    const resend = getResendClient();
    const unsubscribeToken = await getUnsubscribeToken(to);
    const applyUrl = `${BASE_URL}/swimwear-content/apply`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `${brandName} - Exclusive Swimwear Content Program Invitation`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 50%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Swimwear Content Program
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Miami Swim Week 2026
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${contactName},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                EXA Models is launching an exclusive content program for swimwear brands like ${brandName}.
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Get months of professional content and exposure leading up to Miami Swim Week.
              </p>

              <!-- Benefits Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; color: #ffffff; font-weight: 600;">Monthly Deliverables:</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">🎬 10 professional video clips</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">📸 50 high-quality photos</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">🏖️ Studio + beach locations</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">📱 Instagram story exposure</p>
                    <p style="margin: 0; color: #10b981; font-weight: 600;">$500/month with 3-month commitment</p>
                  </td>
                </tr>
              </table>

              <!-- Swim Week Credit -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #052e16; border-radius: 12px; border: 1px solid #10b981;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #4ade80; font-weight: 600;">🌴 Miami Swim Week Bonus</p>
                    <p style="margin: 0; color: #86efac; font-size: 14px;">
                      Every $500 payment credits toward our $3,000 Miami Swim Week package. Build content AND reduce your Swim Week investment!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${applyUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Apply Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; text-align: center;">
                Limited spots available for the 2026 program
              </p>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendContentProgramApplicationEmail({
  to,
  brandName,
  contactName,
}: {
  to: string;
  brandName: string;
  contactName: string;
}) {
  try {
    const resend = getResendClient();
    const unsubscribeToken = await getUnsubscribeToken(to);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Application Received - ${brandName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 48px;">📬</p>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Application Received!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${contactName},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Thank you for applying to the EXA Models Swimwear Content Program with <strong style="color: #ffffff;">${brandName}</strong>.
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Our team will review your application and get back to you within 48 hours.
              </p>

              <!-- What's Next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; color: #ffffff; font-weight: 600;">What happens next?</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">1️⃣ We review your brand and collection details</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">2️⃣ A team member will reach out to discuss</p>
                    <p style="margin: 0; color: #a1a1aa;">3️⃣ We'll coordinate shipping and scheduling</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                Questions? Reply to this email anytime.
              </p>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendContentProgramApprovedEmail({
  to,
  brandName,
  contactName,
}: {
  to: string;
  brandName: string;
  contactName: string;
}) {
  try {
    const resend = getResendClient();
    const unsubscribeToken = await getUnsubscribeToken(to);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Welcome to the Program - ${brandName} Approved!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 48px;">🎉</p>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                You're In!
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Welcome to the Content Program
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${contactName},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Great news! <strong style="color: #ffffff;">${brandName}</strong> has been approved for the EXA Models Swimwear Content Program.
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                We're excited to create amazing content for your collection leading up to Miami Swim Week 2026!
              </p>

              <!-- Next Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; color: #ffffff; font-weight: 600;">Next Steps:</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">📦 Ship your collection to our Miami studio</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">💳 Complete your first month's payment ($500)</p>
                    <p style="margin: 0 0 10px; color: #a1a1aa;">📅 We'll schedule your first shoot</p>
                    <p style="margin: 0; color: #a1a1aa;">🎬 Receive your content within 2 weeks</p>
                  </td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #1e3a5f; border-radius: 12px; border: 1px solid #3b82f6;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px; color: #60a5fa; font-weight: 600;">📍 Shipping Address</p>
                    <p style="margin: 0; color: #93c5fd; font-size: 14px;">
                      A team member will reach out with shipping details shortly.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                Looking forward to creating together!
              </p>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export async function sendContentProgramPaymentReminderEmail({
  to,
  brandName,
  contactName,
  paymentMonth,
  amount,
  dueDate,
  swimWeekCredits,
}: {
  to: string;
  brandName: string;
  contactName: string;
  paymentMonth: number;
  amount: number;
  dueDate: string;
  swimWeekCredits: number;
}) {
  try {
    const resend = getResendClient();
    const unsubscribeToken = await getUnsubscribeToken(to);
    const remainingBalance = 3000 - swimWeekCredits;
    const progressPercent = Math.round((swimWeekCredits / 3000) * 100);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Month ${paymentMonth} Payment Due - ${brandName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 48px;">📅</p>
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Month ${paymentMonth} Payment Due
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${contactName},
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Your Month ${paymentMonth} payment for <strong style="color: #ffffff;">${brandName}</strong> is due.
              </p>

              <!-- Payment Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #a1a1aa; padding: 8px 0;">Amount Due:</td>
                        <td style="color: #ffffff; font-weight: bold; text-align: right; padding: 8px 0;">$${amount}</td>
                      </tr>
                      <tr>
                        <td style="color: #a1a1aa; padding: 8px 0;">Due Date:</td>
                        <td style="color: #ffffff; text-align: right; padding: 8px 0;">${dueDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #a1a1aa; padding: 8px 0;">Payment Month:</td>
                        <td style="color: #ffffff; text-align: right; padding: 8px 0;">${paymentMonth} of 3</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Swim Week Progress -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #052e16; border-radius: 12px; border: 1px solid #10b981;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; color: #4ade80; font-weight: 600;">🌴 Swim Week Progress</p>

                    <!-- Progress Bar -->
                    <div style="background-color: #1a1a1a; border-radius: 8px; height: 24px; margin-bottom: 15px; overflow: hidden;">
                      <div style="background: linear-gradient(90deg, #06b6d4 0%, #ec4899 100%); height: 100%; width: ${progressPercent}%; border-radius: 8px;"></div>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #86efac; font-size: 14px;">Total Credited:</td>
                        <td style="color: #4ade80; font-weight: bold; text-align: right; font-size: 14px;">$${swimWeekCredits}</td>
                      </tr>
                      <tr>
                        <td style="color: #86efac; font-size: 14px;">Remaining Balance:</td>
                        <td style="color: #ffffff; text-align: right; font-size: 14px;">$${remainingBalance}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                Reply to this email for payment instructions.
              </p>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

/**
 * Send brand outreach email for Swim Week partnerships
 */
export async function sendBrandOutreachEmail({
  to,
  brandName,
  contactName,
  subject,
  bodyText,
}: {
  to: string;
  brandName: string;
  contactName: string | null;
  subject: string;
  bodyText: string;
}) {
  try {
    const resend = getResendClient();

    // Replace template variables
    const personalizedBody = bodyText
      .replace(/\{\{brand_name\}\}/g, brandName)
      .replace(/\{\{contact_name\}\}/g, contactName || "there");

    // Convert line breaks to HTML
    const htmlBody = personalizedBody
      .split("\n")
      .map((line) => (line.trim() === "" ? "<br/>" : `<p style="margin: 0 0 16px; color: #e5e5e5; font-size: 16px; line-height: 1.6;">${line}</p>`))
      .join("\n");

    const { data, error } = await resend.emails.send({
      from: "EXA Models Partnerships <partnerships@examodels.com>",
      to: [to],
      subject: subject,
      replyTo: "partnerships@examodels.com",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">
                EXA Models
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Miami Swim Week 2026 Partnerships
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              ${htmlBody}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${BASE_URL}/models" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Our Models
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Reply directly to this email to connect with our team
              </p>
              <p style="margin: 0 0 10px; color: #71717a; font-size: 12px;">
                EXA Models - Miami Swim Week 2026
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">examodels.com</a> |
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">@examodels</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error, messageId: null };
    }
    return { success: true, data, messageId: data?.id || null };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error, messageId: null };
  }
}

// ============================================
// AUCTION NOTIFICATION EMAILS
// ============================================

/**
 * Send email to model when their auction sells
 */
export async function sendAuctionSoldEmail({
  to,
  modelName,
  auctionTitle,
  amount,
  auctionId,
}: {
  to: string;
  modelName: string;
  auctionTitle: string;
  amount: number;
  auctionId: string;
}) {
  try {
    // Check unsubscribe
    const unsubscribed = await isEmailUnsubscribed(to, "notification");
    if (unsubscribed) return { success: true, data: null };

    const resend = getResendClient();
    const unsubscribeToken = await getUnsubscribeToken(to);
    const auctionUrl = `${BASE_URL}/bids/${auctionId}`;
    const earningsUrl = `${BASE_URL}/earnings`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Your auction sold for ${amount} coins!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">&#127881;</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                Your Auction Sold!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Great news! Your auction <strong style="color: #ffffff;">"${auctionTitle}"</strong> has been sold.
              </p>

              <!-- Amount -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 30px; background-color: #262626; border-radius: 12px;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 14px;">You earned</p>
                    <p style="margin: 0; color: #ec4899; font-size: 42px; font-weight: bold;">${amount}</p>
                    <p style="margin: 5px 0 0; color: #a1a1aa; font-size: 14px;">coins</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                The coins have been added to your balance. Connect with the winner to deliver the experience!
              </p>

              <!-- CTAs -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${auctionUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Auction
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${earningsUrl}" style="display: inline-block; color: #a1a1aa; text-decoration: none; padding: 10px 24px; font-size: 14px;">
                      View Earnings &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

/**
 * Send email to winner when they win an auction
 */
export async function sendAuctionWonEmail({
  to,
  winnerName,
  modelName,
  auctionTitle,
  amount,
  auctionId,
}: {
  to: string;
  winnerName: string;
  modelName: string;
  auctionTitle: string;
  amount: number;
  auctionId: string;
}) {
  try {
    const unsubscribed = await isEmailUnsubscribed(to, "notification");
    if (unsubscribed) return { success: true, data: null };

    const resend = getResendClient();
    const unsubscribeToken = await getUnsubscribeToken(to);
    const auctionUrl = `${BASE_URL}/bids/${auctionId}`;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `You won "${auctionTitle}"!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; font-size: 48px;">&#127942;</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                You Won!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Congratulations ${winnerName}!
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                You won <strong style="color: #ffffff;">"${auctionTitle}"</strong> by <strong style="color: #ffffff;">${modelName}</strong> with a winning bid of <strong style="color: #ec4899;">${amount} coins</strong>.
              </p>

              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                The model will be in touch to deliver your experience. You can also message them directly from the auction page.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${auctionUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Auction
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${generateEmailFooter(unsubscribeToken)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}
