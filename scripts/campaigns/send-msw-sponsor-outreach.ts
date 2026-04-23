/**
 * Send the MSW 2026 sponsor outreach email.
 *
 * DANGEROUS. This script sends real email to real people via Resend.
 *
 * Safety defaults:
 *   - Runs in DRY_RUN mode unless CONFIRM=yes is set.
 *   - Will not send to contacts with status = 'do_not_contact'.
 *   - Rate limits to 1 email every 2 seconds.
 *   - Logs every send to brand_outreach_emails and updates
 *     brand_outreach_contacts.last_contacted_at.
 *
 * Three modes:
 *
 * 1. TEST MODE (send 1 email to yourself to verify rendering):
 *    TEST_EMAIL=nathan@examodels.com CONFIRM=yes \
 *      npx tsx scripts/campaigns/send-msw-sponsor-outreach.ts
 *
 * 2. BATCH MODE (send to N real contacts, filtered):
 *    CATEGORY=beauty LIMIT=10 CONFIRM=yes \
 *      npx tsx scripts/campaigns/send-msw-sponsor-outreach.ts
 *
 * 3. DRY RUN (safe default — prints what would send, sends nothing):
 *    npx tsx scripts/campaigns/send-msw-sponsor-outreach.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.examodels.com";

if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// --- Config from env ----------------------------------------------------

const CONFIRM = process.env.CONFIRM === "yes";
const TEST_EMAIL = process.env.TEST_EMAIL || null;
const LIMIT = parseInt(process.env.LIMIT || "5", 10);
const STATUS = process.env.STATUS || "contacted";
const CATEGORY = process.env.CATEGORY || null;
const RATE_LIMIT_MS = 2000;

// --- Campaign content ---------------------------------------------------

const FROM_EMAIL = "nathan@examodels.com";
const FROM_NAME = "Nathan — EXA Models";
const REPLY_TO = "nathan@examodels.com";

const SUBJECT_TEMPLATE = "{{brand_name}} × Miami Swim Week";

const BODY_TEMPLATE = `Hi {{contact_name}},

{{brand_name}} is exactly the type of brand we're aligning with for Miami Swim Week this year.

We're taking over The Alexander Hotel in Miami Beach for a full 7-day experience — six runway shows, a sunset beach show, yacht activations, and nonstop content production with 300+ curated models and creators on site.

Your brand would be featured directly in the hands, content, and audience of hundreds of high-reach creators in real time.

This isn't a typical sponsorship — it's full brand immersion inside the environment where the content is actually created.

A few ways we'd integrate {{brand_name}}:

– Official Category Partner (exclusive to your space)
– Backstage + on-site activations across the week
– Creator seeding with 300+ models generating organic content
– Custom content production tied directly to your brand

We're locking category partners before May 1, so timing is key.

Worth a quick 15–20 min call this week?

Full details + past shows at the link below.

Best,
Nathan
EXA Models`;

const CTA_URL = `${BASE_URL}/sponsors/miami-swim-week`;
const CTA_TEXT = "View Sponsorship Packages";

// --- HTML template (duplicated from src/lib/email.ts sponsor template) -

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderHtml({
  brandName,
  contactName,
  bodyText,
}: {
  brandName: string;
  contactName: string | null;
  bodyText: string;
}): string {
  const personalized = bodyText
    .replace(/\{\{brand_name\}\}/g, escapeHtml(brandName))
    .replace(/\{\{contact_name\}\}/g, escapeHtml(contactName || "there"));

  const htmlBody = personalized
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : `<p style="margin: 0 0 16px; color: #1f2937; font-size: 15px; line-height: 1.7;">${escapeHtml(line)}</p>`))
    .join("\n");

  // Light editorial template with EXA brand color accents — pink/violet on clean white.
  // Renders cleanly in Outlook + Gmail corporate mailboxes.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f7f6f3; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f6f3; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e5e4e0;">

        <!-- Brand accent bar -->
        <tr><td style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td></tr>

        <tr><td style="padding: 36px 40px 20px; border-bottom: 1px solid #e5e4e0;">
          <p style="margin: 0 0 6px; color: #ec4899; font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">EXA Models · Invitation</p>
          <h1 style="margin: 0 0 6px; color: #111111; font-size: 28px; font-weight: 400; line-height: 1.2; letter-spacing: -0.3px; font-family: Georgia, 'Times New Roman', serif;">Miami Swim Week 2026</h1>
          <p style="margin: 0; color: #6b6b6b; font-size: 14px;">May 25–31 &nbsp;·&nbsp; The Alexander Hotel, Miami Beach</p>
        </td></tr>

        <tr><td style="padding: 24px 40px; background-color: #fafaf8; border-bottom: 1px solid #e5e4e0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: center;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 18px; font-weight: 700;">300+</p><p style="margin: 0; color: #8a8a8a; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;">Models</p></td>
              <td style="text-align: center;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 18px; font-weight: 700;">6</p><p style="margin: 0; color: #8a8a8a; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;">Shows</p></td>
              <td style="text-align: center;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 18px; font-weight: 700;">7 Days</p><p style="margin: 0; color: #8a8a8a; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;">Takeover</p></td>
              <td style="text-align: center;"><p style="margin: 0 0 2px; color: #ec4899; font-size: 18px; font-weight: 700;">50M+</p><p style="margin: 0; color: #8a8a8a; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;">Reach</p></td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding: 36px 40px 8px;">
          ${htmlBody}
        </td></tr>

        <tr><td style="padding: 12px 40px 36px;" align="left">
          <a href="${CTA_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px; border-radius: 6px;">${CTA_TEXT} →</a>
        </td></tr>

        <tr><td style="padding: 24px 40px 32px; border-top: 1px solid #e5e4e0; background-color: #fafaf8;">
          <p style="margin: 0 0 6px; color: #111111; font-weight: 600; font-size: 14px;">${escapeHtml(FROM_NAME)}</p>
          <p style="margin: 0 0 14px; color: #6b6b6b; font-size: 13px;">Reply directly to this email to connect.</p>
          <p style="margin: 0; color: #9a9a9a; font-size: 12px;">
            <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">examodels.com</a> &nbsp;·&nbsp;
            <a href="${BASE_URL}/tv" style="color: #ec4899; text-decoration: none;">Past shows</a> &nbsp;·&nbsp;
            <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">@examodels</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

// --- Main --------------------------------------------------------------

interface Contact {
  id: string;
  brand_name: string;
  contact_name: string | null;
  email: string;
  category: string | null;
  status: string;
}

async function main() {
  const resend = new Resend(RESEND_API_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("\n📧 MSW Sponsor Outreach Sender");
  console.log("──────────────────────────────────────────");

  let contacts: Contact[] = [];

  if (TEST_EMAIL) {
    // Test mode — send one email to a specified address with test data
    console.log(`🧪 TEST MODE — will send ONE email to: ${TEST_EMAIL}`);
    contacts = [
      {
        id: "test",
        brand_name: "Shore Club Turks & Caicos",
        contact_name: "Denario",
        email: TEST_EMAIL,
        category: "travel",
        status: "test",
      },
    ];
  } else {
    // Load real contacts from DB.
    // Safety: skip anyone we've already contacted within the last 24 hours
    // so back-to-back runs don't double-mail the same brand.
    const oneDayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let q = supabase
      .from("brand_outreach_contacts")
      .select("id, brand_name, contact_name, email, category, status, last_contacted_at")
      .neq("status", "do_not_contact")
      .eq("status", STATUS)
      .or(`last_contacted_at.is.null,last_contacted_at.lt.${oneDayAgoIso}`)
      .limit(LIMIT);
    if (CATEGORY) q = q.eq("category", CATEGORY);

    const { data, error } = await q;
    if (error) {
      console.error("❌ DB error:", error.message);
      process.exit(1);
    }
    contacts = (data || []) as Contact[];
  }

  if (!contacts.length) {
    console.log("\n⚠️  No contacts to send to. Check your filters.");
    process.exit(0);
  }

  const modeLabel = CONFIRM ? "🔥 LIVE SEND" : "🟢 DRY RUN (safe)";
  console.log(`Mode:        ${modeLabel}`);
  console.log(`Sender:      ${FROM_NAME} <${FROM_EMAIL}>`);
  console.log(`Recipients:  ${contacts.length}`);
  if (CATEGORY) console.log(`Category:    ${CATEGORY}`);
  if (!TEST_EMAIL) console.log(`Status:      ${STATUS}`);
  console.log(`Rate limit:  ${RATE_LIMIT_MS}ms between sends`);
  console.log("──────────────────────────────────────────\n");

  if (!CONFIRM) {
    console.log("⚠️  CONFIRM=yes is NOT set — nothing will actually be sent.");
    console.log("    This is just a preview of what would send.\n");
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const subject = SUBJECT_TEMPLATE
      .replace(/\{\{brand_name\}\}/g, c.brand_name)
      .replace(/\{\{contact_name\}\}/g, c.contact_name || "there");
    const html = renderHtml({
      brandName: c.brand_name,
      contactName: c.contact_name,
      bodyText: BODY_TEMPLATE,
    });

    const label = `${String(i + 1).padStart(3)}/${contacts.length}  ${c.brand_name.padEnd(30).slice(0, 30)}  ${c.email}`;

    if (!CONFIRM) {
      console.log(`[DRY]  ${label}`);
      console.log(`       → ${subject}`);
      continue;
    }

    try {
      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: c.email,
        replyTo: REPLY_TO,
        subject,
        html,
      });

      if (error) {
        throw new Error(error.message || "Unknown Resend error");
      }

      sent++;
      console.log(`[SENT] ${label}`);

      // Log + update DB (skip for pure test email to a non-DB contact)
      if (c.id !== "test") {
        await supabase.from("brand_outreach_emails").insert({
          contact_id: c.id,
          subject,
          body_html: html,
          email_type: "outreach",
          status: "sent",
        });
        await supabase
          .from("brand_outreach_contacts")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", c.id);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : "Unknown";
      console.log(`[FAIL] ${label}  — ${msg}`);
    }

    // Rate limit
    if (i < contacts.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  console.log("\n──────────────────────────────────────────");
  console.log("📊 Summary");
  console.log("──────────────────────────────────────────");
  if (CONFIRM) {
    console.log(`  Sent:   ${sent}`);
    console.log(`  Failed: ${failed}`);
  } else {
    console.log(`  Would send: ${contacts.length} (CONFIRM=yes to actually send)`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
