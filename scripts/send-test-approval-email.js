require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  const to = 'miriam@examodels.com';
  const modelName = 'Test Model';
  const username = 'testmodel';
  const profileUrl = `https://www.examodels.com/${username}`;
  const dashboardUrl = 'https://www.examodels.com/dashboard';

  console.log('Sending test approval email to:', to);

  const { data, error } = await resend.emails.send({
    from: 'EXA Models <noreply@examodels.com>',
    to: [to],
    subject: '[TEST] Welcome to EXA Models - Your Application is Approved!',
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
    console.error('Error:', error);
  } else {
    console.log('Email sent successfully!');
    console.log('Email ID:', data.id);
  }
}

sendTestEmail();
