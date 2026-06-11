/**
 * One-off send: Miami Swim Week 2026 MEDIA approval email.
 *
 * Sends to every contact in `media_contacts` with a valid email and a
 * status that isn't `do_not_contact`. Lets media know they're approved
 * to shoot, when/where the shows are, and that check-in + badge details
 * are coming in a follow-up email.
 *
 * Usage:
 *   npx tsx scripts/send-msw-media-approved.ts                 # dry run
 *   npx tsx scripts/send-msw-media-approved.ts --send          # live, full list
 *   npx tsx scripts/send-msw-media-approved.ts --test --send   # live, only nathan@examodels.com
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SEND = process.argv.includes("--send");
const TEST = process.argv.includes("--test");
const TEST_RECIPIENT = { id: null as string | null, name: "Miriam", email: "miriam@examodels.com" };

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "nathan@examodels.com";

const VENUE_NAME = "The Alexander Hotel";
const VENUE_ADDRESS = "5225 Collins Ave, Miami Beach, FL";
const SHOW_DATES = "May 26 – 31, 2026";
const SHOW_PAGE_URL = "https://www.examodels.com/shows/miami-swim-week-2026";
const URGENT_EMAIL = "nathan@examodels.com";

type Recipient = { id: string | null; name: string; email: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function firstName(full: string | null | undefined) {
  if (!full) return "there";
  return full.trim().split(/\s+/)[0] || "there";
}

function isValidEmail(e: string | null | undefined): e is string {
  return !!e && e.includes("@") && !e.endsWith("placeholder.invalid");
}

async function loadRecipients(): Promise<Recipient[]> {
  const { data, error } = await supabase
    .from("media_contacts")
    .select("id, name, email, status")
    .neq("status", "do_not_contact")
    .order("name", { ascending: true });
  if (error) throw error;

  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const row of data ?? []) {
    if (!isValidEmail(row.email)) continue;
    const key = row.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push({ id: row.id, name: row.name || "there", email: row.email });
  }
  return recipients;
}

function buildHtml(name: string) {
  const greetingName = escapeHtml(firstName(name));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${VENUE_NAME} ${VENUE_ADDRESS}`
  )}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; overflow: hidden; border: 1px solid rgba(236, 72, 153, 0.25);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 60%, #06b6d4 100%); padding: 44px 30px; text-align: center;">
              <p style="margin: 0 0 12px; color: rgba(255,255,255,0.95); font-size: 11px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase;">
                Media Approved
              </p>
              <h1 style="margin: 0; color: white; font-size: 30px; font-weight: 800; letter-spacing: -0.5px;">
                EXA Shows Miami Swim Week
              </h1>
              <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 15px;">
                ${SHOW_DATES} · ${VENUE_NAME}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 18px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Hey ${greetingName},
              </p>
              <p style="margin: 0 0 22px; color: #a1a1aa; font-size: 16px; line-height: 1.65;">
                You're <strong style="color: #ffffff;">officially approved to shoot at EXA Models' Miami Swim Week</strong> at The Alexander Hotel. We're excited to have you join us and can't wait to see the content you create.
              </p>
              <p style="margin: 0 0 28px; color: #a1a1aa; font-size: 16px; line-height: 1.65;">
                Our opening show begins <strong style="color: #ffffff;">May 26</strong>, with events continuing through <strong style="color: #ffffff;">May 31</strong>. EXA will be taking over the <em style="color: #f9a8d4; font-style: normal;">entire hotel</em> for the week, creating an immersive runway and content experience featuring <strong style="color: #ffffff;">35 designers</strong>, up to <strong style="color: #ffffff;">10 runway presentations per day</strong>, and <strong style="color: #ffffff;">200+ EXA models</strong> throughout the week.
              </p>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: linear-gradient(180deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.05) 100%); border: 1px solid rgba(236, 72, 153, 0.25); border-radius: 12px;">
                <tr>
                  <td style="padding: 26px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                          Dates
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${SHOW_DATES}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid rgba(236,72,153,0.18);">
                          <div style="padding-top: 20px;">Location</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 6px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${VENUE_NAME}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #a1a1aa; font-size: 15px;">
                          ${VENUE_ADDRESS}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <a href="${mapsUrl}" style="display: inline-block; color: #f9a8d4; font-size: 13px; font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(249,168,212,0.5); padding-bottom: 2px;">
                            Open in Google Maps →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${SHOW_PAGE_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 60%, #06b6d4 100%); color: white; text-decoration: none; padding: 16px 44px; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 0 24px rgba(236, 72, 153, 0.35);">
                      View The Show Page →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's Next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                <tr>
                  <td style="padding: 22px 26px;">
                    <p style="margin: 0 0 10px; color: #ec4899; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                      What's Next
                    </p>
                    <p style="margin: 0; color: #ffffff; font-size: 15px; line-height: 1.6;">
                      Over the next few days, we'll send a follow-up email with your <strong style="color: #f9a8d4;">media check-in details, credentials, and badge information</strong>. That email will include everything you need for access and arrival, so hang tight for now.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 15px; line-height: 1.65;">
                If you have questions, there's a good chance they'll be answered in the upcoming email. For anything <strong style="color: #ffffff;">urgent</strong>, feel free to reach out directly at
                <a href="mailto:${URGENT_EMAIL}" style="color: #f9a8d4; text-decoration: none; font-weight: 600;">${URGENT_EMAIL}</a>.
              </p>

              <p style="margin: 28px 0 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                We're looking forward to having you with us.<br/>
                <span style="color: #ec4899; font-weight: 600;">— The EXA Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Urgent? Email <a href="mailto:${URGENT_EMAIL}" style="color: #f9a8d4; text-decoration: none;">${URGENT_EMAIL}</a>
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models · Miami Swim Week 2026
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

function buildText(name: string) {
  return `Hey ${firstName(name)},

You're officially approved to shoot at EXA Models' Miami Swim Week at The Alexander Hotel. We're excited to have you join us and can't wait to see the content you create.

Our opening show begins May 26, with events continuing through May 31. EXA will be taking over the entire hotel for the week, creating an immersive runway and content experience featuring 35 designers, up to 10 runway presentations per day, and 200+ EXA models throughout the week.

Dates: ${SHOW_DATES}
Location: ${VENUE_NAME}, ${VENUE_ADDRESS}
Show page: ${SHOW_PAGE_URL}

What's Next

Over the next few days, we'll send a follow-up email with your media check-in details, credentials, and badge information. That email will include everything you need for access and arrival, so hang tight for now.

If you have questions, there's a good chance they'll be answered in the upcoming email. For anything urgent, feel free to reach out directly at ${URGENT_EMAIL}.

We're looking forward to having you with us.

— The EXA Team`;
}

async function main() {
  const allRecipients = TEST ? [TEST_RECIPIENT] : await loadRecipients();

  console.log(`MSW media approval email`);
  console.log(`  ${SHOW_DATES} · ${VENUE_NAME}, ${VENUE_ADDRESS}`);
  console.log(`  Recipients: ${allRecipients.length}${TEST ? "  (TEST MODE — single recipient)" : ""}`);
  console.log(`  Mode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

  for (const r of allRecipients) {
    console.log(`  ${String(r.name).padEnd(32)} ${r.email}`);
  }

  if (!SEND) {
    console.log(`\nDry run complete. Re-run with --send to email these ${allRecipients.length} contacts.`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("\nRESEND_API_KEY is not set. Aborting.");
    process.exit(1);
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log(`\nSending to ${allRecipients.length} ${allRecipients.length === 1 ? "recipient" : "contacts"}...\n`);

  let sent = 0;
  let failed = 0;
  const sentIds: string[] = [];

  for (const r of allRecipients) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: [r.email],
        subject: "You're approved — EXA Model's Miami Swim Week 2026",
        html: buildHtml(r.name),
        text: buildText(r.name),
      });

      if (error) {
        failed++;
        console.error(`  ✗ ${r.email}:`, error);
      } else {
        sent++;
        if (r.id) sentIds.push(r.id);
        console.log(`  ✓ ${r.email}  (id: ${data?.id || "?"})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${r.email}:`, err);
    }

    // Resend rate limit: 2 req/s
    await new Promise((res) => setTimeout(res, 600));
  }

  if (sentIds.length > 0) {
    const { error: updateErr } = await supabase
      .from("media_contacts")
      .update({ status: "contacted", last_contacted_at: new Date().toISOString() })
      .in("id", sentIds);
    if (updateErr) {
      console.error(`\nFailed to mark ${sentIds.length} contacts as 'contacted':`, updateErr);
    } else {
      console.log(`\nMarked ${sentIds.length} contacts as 'contacted' with last_contacted_at = now.`);
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
