import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUBJECT = "EXA Shows — Join Us at Miami Swim Week 2026";
const FROM_EMAIL = "nathan@examodels.com";
const FROM_NAME = "Nathan";
const CTA_URL = "https://examodels.com/sponsors/miami-swim-week";
const CTA_TEXT = "View Sponsorship Packages";

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildSponsorHtml(brandName: string, contactName: string | null) {
  const name = contactName || "there";
  const body = `Hi ${escapeHtml(name)},

Join us for Miami Swim Week May 26–31 2026. We are doing a full hotel takeover on Miami Beach with a 600+ Models Casting Call, Wellness Activations, and our 6 Days of our Premier Runway Shows (www.examodels.com/tv).

We have brand sponsorship openings for logo placement, red carpet promo wall, social media features, and brand activations — we'd love to find the right fit for ${escapeHtml(brandName)}.

Take a look at our sponsorship packages and let me know if you'd like to connect.`;

  const htmlBody = body
    .split("\n")
    .map((line) =>
      line.trim() === ""
        ? ""
        : `<p style="margin: 0 0 14px; color: #d4d4d4; font-size: 15px; line-height: 1.7;">${line}</p>`
    )
    .join("\n");

  return `<!DOCTYPE html>
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
          <tr>
            <td style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); height: 4px; border-radius: 4px 4px 0 0;"></td>
          </tr>
          <tr>
            <td style="background-color: #111111; border-radius: 0 0 16px 16px; padding: 40px 36px;">
              <p style="margin: 0 0 8px; color: #ec4899; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">EXA Models &middot; Exclusive Invitation</p>
              <h1 style="margin: 0 0 6px; color: #ffffff; font-size: 30px; font-weight: 800; line-height: 1.15;">Miami Swim Week 2026</h1>
              <p style="margin: 0 0 32px; color: #71717a; font-size: 15px;">May 26&ndash;31 &nbsp;&middot;&nbsp; Miami Beach, Florida</p>
              <div style="height: 1px; background: linear-gradient(90deg, #ec4899, #8b5cf6, transparent); margin-bottom: 28px;"></div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">80+</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Models</p>
                  </td>
                  <td style="width: 6px;"></td>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">25+</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Designers</p>
                  </td>
                  <td style="width: 6px;"></td>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">100+</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Media &amp; Influencers</p>
                  </td>
                  <td style="width: 6px;"></td>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">300+</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Guests</p>
                  </td>
                </tr>
              </table>
              ${htmlBody}
              <p style="margin: 24px 0 16px; color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.3px;">What Your Sponsorship Includes:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #ec4899;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">&#127919;</td>
                      <td><p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Logo on Red Carpet Promo Wall</p><p style="margin: 0; color: #71717a; font-size: 13px;">High-visibility placement photographed by every attendee &amp; media</p></td>
                    </tr></table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #8b5cf6;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">&#128248;</td>
                      <td><p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Brand Across All Event Materials</p><p style="margin: 0; color: #71717a; font-size: 13px;">Programs, signage, digital screens, and event backdrops</p></td>
                    </tr></table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #06b6d4;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">&#128241;</td>
                      <td><p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Social Media Coverage</p><p style="margin: 0; color: #71717a; font-size: 13px;">Featured across EXA Instagram before, during &amp; after the event</p></td>
                    </tr></table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #f59e0b;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">&#127909;</td>
                      <td><p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Live Streamed Globally</p><p style="margin: 0; color: #71717a; font-size: 13px;">All shows streamed live &mdash; your brand reaches audiences far beyond the venue</p></td>
                    </tr></table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #0d0d0d; border-radius: 12px; border: 1px solid #262626;">
                <tr>
                  <td style="padding: 20px 20px 16px;">
                    <p style="margin: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Sponsorship Packages</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$500</p><p style="margin: 0; color: #71717a; font-size: 11px;">Community</p></td>
                        <td style="width: 6px;"></td>
                        <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$1,500</p><p style="margin: 0; color: #71717a; font-size: 11px;">Gold</p></td>
                        <td style="width: 6px;"></td>
                        <td style="padding: 10px 8px; background-color: #1f0f2e; border-radius: 8px; text-align: center; border: 1px solid #8b5cf6; width: 25%;"><p style="margin: 0 0 2px; color: #a78bfa; font-size: 17px; font-weight: 800;">$5,000</p><p style="margin: 0; color: #71717a; font-size: 11px;">Title Runway</p></td>
                        <td style="width: 6px;"></td>
                        <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$20K</p><p style="margin: 0; color: #71717a; font-size: 11px;">Presenting</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 36px;">
                <tr>
                  <td align="center">
                    <a href="${CTA_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 44px; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
                      ${CTA_TEXT}
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #262626; padding-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 14px;">${FROM_NAME}</p>
                    <p style="margin: 0 0 10px; color: #71717a; font-size: 13px;">Reply to this email to connect with our team</p>
                    <p style="margin: 0; color: #71717a; font-size: 12px;">
                      <a href="https://examodels.com" style="color: #ec4899; text-decoration: none;">examodels.com</a>
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
}

async function main() {
  // Fetch MSW sponsor contacts (created before March 1, status = new)
  const { data: contacts, error: fetchError } = await supabase
    .from("brand_outreach_contacts")
    .select("id, brand_name, contact_name, email, created_at")
    .eq("status", "new")
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch contacts:", fetchError);
    process.exit(1);
  }

  console.log(`Found ${contacts.length} MSW sponsor contacts to email\n`);

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      const html = buildSponsorHtml(contact.brand_name, contact.contact_name);

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [contact.email],
        subject: SUBJECT,
        replyTo: FROM_EMAIL,
        html,
      });

      if (error) {
        console.error(`FAILED: ${contact.brand_name} (${contact.email}) - ${JSON.stringify(error)}`);
        failed++;
        continue;
      }

      // Update contact status
      await supabase
        .from("brand_outreach_contacts")
        .update({
          status: "contacted",
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      sent++;
      console.log(`SENT: ${contact.brand_name} (${contact.email}) - ${data?.id}`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (err) {
      console.error(`ERROR: ${contact.brand_name} (${contact.email}) - ${err}`);
      failed++;
    }
  }

  console.log(`\nDone! Sent: ${sent}, Failed: ${failed}, Total: ${contacts.length}`);
}

main();
