import { Resend } from "resend";

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
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
    const resend = getResendClient();
    const profileUrl = `https://www.examodels.com/${username}`;
    const dashboardUrl = "https://www.examodels.com/dashboard";

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
                Hey ${modelName},
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
                Hey ${modelName}!
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
                Hey ${modelName},
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
    const dashboardUrl = "https://www.examodels.com/earnings";

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
                Hey ${modelName}! 🎉
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${buyerName}</strong> just unlocked your exclusive content!
              </p>

              <!-- Content Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px; background-color: #262626; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Content</p>
                    <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; font-weight: 500;">${contentTitle}</p>
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
    const dashboardUrl = "https://www.examodels.com/earnings";

    const messageHtml = message
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px; background-color: #262626; border-radius: 8px; border-left: 3px solid #ec4899;">
                    <p style="margin: 0 0 5px; color: #71717a; font-size: 12px;">Message from ${tipperName}:</p>
                    <p style="margin: 0; color: #ffffff; font-size: 14px; font-style: italic;">"${message}"</p>
                  </td>
                </tr>
              </table>`
      : "";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `💜 ${tipperName} sent you ${amount} coins!`,
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
              <p style="margin: 0; font-size: 48px;">💜</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                You Got a Tip!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                Hey ${modelName}! 🎉
              </p>
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${tipperName}</strong> just sent you a tip!
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
    const bookingsUrl = "https://www.examodels.com/bookings";
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
                Hey ${modelName}!
              </p>
              <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                You have a new booking request from <strong style="color: #ffffff;">${clientName}</strong>${clientType === "brand" ? " (Brand)" : ""}.
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
                          <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 500;">${serviceType}</p>
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
    const bookingsUrl = "https://www.examodels.com/bookings";
    const modelProfileUrl = `https://www.examodels.com/${modelUsername}`;
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
    const modelsUrl = "https://www.examodels.com/models";
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
}: {
  to: string;
  modelName: string;
  callerName: string;
  callRate: number;
}) {
  try {
    const resend = getResendClient();
    const dashboardUrl = "https://www.examodels.com/chats";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `📞 ${callerName} wants to video call you!`,
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
              <p style="margin: 0; font-size: 48px;">📞</p>
              <h1 style="margin: 10px 0 0; color: white; font-size: 24px; font-weight: bold;">
                Incoming Call Request!
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
                <strong style="color: #ffffff;">${callerName}</strong> is trying to video call you! Open your chats to accept the call.
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
