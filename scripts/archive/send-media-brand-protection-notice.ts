/**
 * One-off send: URGENT media credentialing / brand-protection notice.
 *
 * Goes to every contact in `media_contacts` with a valid email and a status
 * that isn't `do_not_contact`. Notifies media that collaborating with
 * @bikini.shows makes them ineligible for EXA Models credentials/events.
 *
 * Usage:
 *   npx tsx scripts/send-media-brand-protection-notice.ts                 # dry run
 *   npx tsx scripts/send-media-brand-protection-notice.ts --send          # live, full list
 *   npx tsx scripts/send-media-brand-protection-notice.ts --test --send   # live, only miriam@examodels.com
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; overflow: hidden; border: 1px solid rgba(239, 68, 68, 0.35);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #ec4899 55%, #8b5cf6 100%); padding: 44px 30px; text-align: center;">
              <p style="margin: 0 0 12px; color: rgba(255,255,255,0.95); font-size: 11px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase;">
                Urgent · Media Notice
              </p>
              <h1 style="margin: 0; color: white; font-size: 30px; font-weight: 800; letter-spacing: -0.5px;">
                🚨 ATTN MEDIA 📸
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Hi ${greetingName},
              </p>

              <!-- Alert statement -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.35); border-radius: 12px;">
                <tr>
                  <td style="padding: 26px;">
                    <p style="margin: 0; color: #ffffff; font-size: 17px; line-height: 1.6; font-weight: 600;">
                      Effective immediately, any photographer or videographer who collaborates with <span style="color: #fca5a5;">@bikini.shows</span> will no longer be eligible to shoot or receive media credentials for EXA Models events.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px; color: #a1a1aa; font-size: 16px; line-height: 1.65;">
                We appreciate your understanding and cooperation as we continue to protect and strengthen the EXA brand.
              </p>

              <p style="margin: 0; color: #a1a1aa; font-size: 15px; line-height: 1.65;">
                Questions? Reach out directly at
                <a href="mailto:${URGENT_EMAIL}" style="color: #f9a8d4; text-decoration: none; font-weight: 600;">${URGENT_EMAIL}</a>.
              </p>

              <p style="margin: 28px 0 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                <span style="color: #ec4899; font-weight: 600;">— EXA Models</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Email <a href="mailto:${URGENT_EMAIL}" style="color: #f9a8d4; text-decoration: none;">${URGENT_EMAIL}</a>
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
  return `Hi ${firstName(name)},

🚨 ATTN MEDIA 📸

Effective immediately, any photographer or videographer who collaborates with @bikini.shows will no longer be eligible to shoot or receive media credentials for EXA Models events.

We appreciate your understanding and cooperation as we continue to protect and strengthen the EXA brand.

Questions? Reach out directly at ${URGENT_EMAIL}.

— EXA Models`;
}

async function main() {
  const allRecipients = TEST ? [TEST_RECIPIENT] : await loadRecipients();

  console.log(`Media brand-protection notice`);
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
        subject: "🚨 ATTN MEDIA — EXA Shows cancel Bikini.Shows",
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
      .update({ last_contacted_at: new Date().toISOString() })
      .in("id", sentIds);
    if (updateErr) {
      console.error(`\nFailed to update last_contacted_at for ${sentIds.length} contacts:`, updateErr);
    } else {
      console.log(`\nUpdated last_contacted_at = now for ${sentIds.length} contacts.`);
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
