/**
 * Bulk MSW brand outreach email — sends to all brand_outreach_contacts with status "new"
 * Sends 100 at a time with 300ms between emails and 10s pause between batches
 *
 * Run with: npx ts-node scripts/send-msw-brand-bulk.ts
 * Dry run:  DRY_RUN=true npx ts-node scripts/send-msw-brand-bulk.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

const BASE_URL = "https://www.examodels.com";
const BATCH_SIZE = 100;
const DELAY_MS = 300; // between individual emails
const BATCH_PAUSE_MS = 10000; // 10s between batches
const DRY_RUN = process.env.DRY_RUN === "true";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEmailHtml(contactName: string, brandName: string): string {
  return `
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; overflow: hidden; border: 1px solid #222222;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 60%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <p style="margin: 0 0 10px; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;">EXA Models Presents</p>
              <h1 style="margin: 0 0 8px; color: white; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">Miami Swim Week 2026</h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">May 26–31 &nbsp;·&nbsp; The National Hotel Miami Beach</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 36px 32px 0;">
              <p style="margin: 0 0 16px; color: #ffffff; font-size: 17px; font-weight: 600;">Hi ${contactName},</p>
              <p style="margin: 0 0 16px; color: #a1a1aa; font-size: 15px; line-height: 1.7;">
                I'm reaching out from <strong style="color: #ffffff;">EXA Models</strong> — we're producing Miami Swim Week 2026 at The National Hotel Miami Beach, May 26–31, and we're inviting select brands to be part of it.
              </p>
              <p style="margin: 0 0 28px; color: #a1a1aa; font-size: 15px; line-height: 1.7;">
                We work with professional runway models and handle everything — casting, fittings, show production, and content. All you need to bring is your collection. Here's what we're offering <strong style="color: #ffffff;">${brandName}</strong>:
              </p>
            </td>
          </tr>

          <!-- Packages -->
          <tr>
            <td style="padding: 0 32px;">

              <!-- Runway Show -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; background-color: #1a1a1a; border-radius: 10px; border: 1px solid #2a2a2a; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; color: #ffffff; font-size: 15px; font-weight: 700;">🎽 &nbsp;Runway Show</p>
                          <p style="margin: 0; color: #71717a; font-size: 13px;">15 professional models · Full production · Tue May 26 – Sun May 31</p>
                        </td>
                        <td style="text-align: right; white-space: nowrap; padding-left: 16px;">
                          <p style="margin: 0; color: #ec4899; font-size: 15px; font-weight: 700;">from $1,000</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Private Showroom -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; background-color: #1a1a1a; border-radius: 10px; border: 1px solid #2a2a2a; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; color: #ffffff; font-size: 15px; font-weight: 700;">🏨 &nbsp;Private Showroom</p>
                          <p style="margin: 0; color: #71717a; font-size: 13px;">Hotel ballroom · Invite your buyers, press &amp; VIPs · 2 models included</p>
                        </td>
                        <td style="text-align: right; white-space: nowrap; padding-left: 16px;">
                          <p style="margin: 0; color: #f59e0b; font-size: 15px; font-weight: 700;">$1,600</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Beach Shoot -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; background-color: #1a1a1a; border-radius: 10px; border: 1px solid #2a2a2a; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; color: #ffffff; font-size: 15px; font-weight: 700;">📸 &nbsp;Miami Beach Shoot Day</p>
                          <p style="margin: 0; color: #71717a; font-size: 13px;">Half day · 3 professional models · All content is yours to keep</p>
                        </td>
                        <td style="text-align: right; white-space: nowrap; padding-left: 16px;">
                          <p style="margin: 0; color: #38bdf8; font-size: 15px; font-weight: 700;">$1,500</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Swim Shop -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background-color: #1a1a1a; border-radius: 10px; border: 1px solid #2a2a2a; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; color: #ffffff; font-size: 15px; font-weight: 700;">🛍️ &nbsp;EXA Swim Shop</p>
                          <p style="margin: 0; color: #71717a; font-size: 13px;">Sell your collection directly to attendees all week · May 26–31</p>
                        </td>
                        <td style="text-align: right; white-space: nowrap; padding-left: 16px;">
                          <p style="margin: 0; color: #2dd4bf; font-size: 15px; font-weight: 700;">$500</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Closing copy -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="margin: 0 0 16px; color: #a1a1aa; font-size: 15px; line-height: 1.7;">
                Our models have walked for brands like <strong style="color: #ffffff;">Sports Illustrated, Maaji, and Beach Bunny</strong>. We handle everything on the ground — you show up with your pieces and we take care of the rest.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 15px; line-height: 1.7;">
                Spots are limited. View all packages and pricing at the link below — or just reply to this email and we'll set up a quick call.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 36px; text-align: center;">
              <a href="${BASE_URL}/designers/miami-swim-week" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 15px 36px; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.2px;">
                View All Packages &amp; Book Your Spot →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #1f1f1f; text-align: center;">
              <p style="margin: 0 0 6px; color: #52525b; font-size: 13px;">
                EXA Models · Miami Swim Week 2026
              </p>
              <p style="margin: 0; color: #3f3f46; font-size: 12px;">
                <a href="${BASE_URL}" style="color: #71717a; text-decoration: none;">examodels.com</a>
                &nbsp;·&nbsp;
                <a href="https://instagram.com/examodels" style="color: #71717a; text-decoration: none;">@examodels</a>
                &nbsp;·&nbsp;
                Reply to unsubscribe
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, brandName: string, contactName: string) {
  return resend.emails.send({
    from: "EXA Models <nathan@examodels.com>",
    to: [to],
    replyTo: "nathan@examodels.com",
    subject: `${brandName} × Miami Swim Week 2026`,
    html: buildEmailHtml(contactName, brandName),
  });
}

async function markContacted(id: string) {
  await supabase
    .from("brand_outreach_contacts")
    .update({
      status: "contacted",
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function main() {
  console.log("=".repeat(60));
  console.log("MSW BRAND OUTREACH — BULK EMAIL CAMPAIGN");
  if (DRY_RUN) console.log("*** DRY RUN — no emails will be sent ***");
  console.log("=".repeat(60));

  // Fetch all contacts with status "new" (skip already contacted, do_not_contact, etc.)
  const { data: contacts, error } = await supabase
    .from("brand_outreach_contacts")
    .select("id, email, brand_name, contact_name, status")
    .eq("status", "new")
    .not("email", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch contacts:", error);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log("No contacts with status 'new' found. Exiting.");
    process.exit(0);
  }

  console.log(`\nContacts to email: ${contacts.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Delay between emails: ${DELAY_MS}ms`);
  console.log(`Pause between batches: ${BATCH_PAUSE_MS / 1000}s`);

  const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
  let totalSent = 0;
  let totalFailed = 0;

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, contacts.length);
    const batch = contacts.slice(start, end);

    console.log(`\n--- BATCH ${batchNum + 1}/${totalBatches} (contacts ${start + 1}–${end}) ---`);

    let batchSent = 0;
    let batchFailed = 0;

    for (const contact of batch) {
      const contactName = contact.contact_name || "there";
      const brandName = contact.brand_name;
      const email = contact.email;

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would send to: ${brandName} <${email}>`);
        batchSent++;
        continue;
      }

      try {
        const { error: sendError } = await sendEmail(email, brandName, contactName);
        if (sendError) {
          console.log(`  [FAILED] ${brandName} <${email}>: ${JSON.stringify(sendError)}`);
          batchFailed++;
        } else {
          console.log(`  [SENT] ${brandName} <${email}>`);
          await markContacted(contact.id);
          batchSent++;
        }
      } catch (err: any) {
        console.log(`  [ERROR] ${brandName} <${email}>: ${err.message || err}`);
        batchFailed++;
      }

      await sleep(DELAY_MS);
    }

    totalSent += batchSent;
    totalFailed += batchFailed;
    console.log(`Batch ${batchNum + 1} done: ${batchSent} sent, ${batchFailed} failed`);

    if (batchNum < totalBatches - 1) {
      console.log(`Pausing ${BATCH_PAUSE_MS / 1000}s before next batch...`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("CAMPAIGN COMPLETE");
  console.log(`  Total contacts: ${contacts.length}`);
  console.log(`  Sent: ${totalSent}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
