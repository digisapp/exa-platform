/**
 * EXA Shows — tonight (Saturday May 30, 2026) confirmation email.
 *
 *   Call time (Hair & Makeup): 3:00 PM
 *   Show start: 6:30 PM (early)
 *   Venue: The Alexander Hotel Miami Beach
 *   12 Global Designers
 *
 *   IMPORTANT: each model must DM @examodels to confirm — un-confirmed
 *   models will not be on the lineup list.
 *
 * Resolves each entry to a model email by matching instagram_url first,
 * then first_name+last_name fallback. Prints unresolved entries so we
 * can clean them up before --send.
 *
 * Usage:
 *   npx tsx scripts/send-exa-shows-tonight-confirmation.ts                 # dry run
 *   npx tsx scripts/send-exa-shows-tonight-confirmation.ts --test --send   # single test email
 *   npx tsx scripts/send-exa-shows-tonight-confirmation.ts --send          # live, full list
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const SEND = process.argv.includes("--send");
const TEST = process.argv.includes("--test");

const TEST_RECIPIENT = { name: "Nathan", email: "nathan@examodels.com", instagram: "" };

const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO_EMAIL = "team@examodels.com";

const SHOW_DAY = "Tonight · Saturday";
const CALL_TIME = "3:00 PM";
const SHOW_TIME = "6:30 PM";
const VENUE_NAME = "The Alexander Hotel Miami Beach";
const VENUE_ADDRESS = "5225 Collins Ave, Miami Beach, FL 33140";
const DESIGNERS_COUNT = "12 Global Designers";
const CONFIRM_HANDLE = "@examodels";

type Entry = { name: string; instagram: string };

const ENTRIES: Entry[] = [
  { name: "Amanda Saez", instagram: "https://www.instagram.com/amandasaezofficial" },
  { name: "Andreea Dragoi", instagram: "https://www.instagram.com/dragoi_andreea" },
  { name: "Angelica C", instagram: "https://www.instagram.com/angelica.c____" },
  { name: "Ann Marie Freeman", instagram: "https://www.instagram.com/annmariefreemann" },
  { name: "Ashley Flete", instagram: "https://www.instagram.com/ashleyflete_" },
  { name: "Ashley Lam", instagram: "https://www.instagram.com/ashleyy.lam" },
  { name: "Ava Kapurch", instagram: "https://www.instagram.com/avakapurchh" },
  { name: "Barbara Silva", instagram: "https://www.instagram.com/thebrazilianfitbarbie" },
  { name: "Bo Cassidy", instagram: "https://www.instagram.com/bo.cassidyy" },
  { name: "Brittany Gibson", instagram: "https://www.instagram.com/brittany.gibz" },
  { name: "Caroline Jaquish", instagram: "https://www.instagram.com/carolinejaquish" },
  { name: "Chloe Kofoed", instagram: "https://www.instagram.com/chloeekofoed" },
  { name: "Chloee Tinnin", instagram: "https://www.instagram.com/chloee.tinnin" },
  { name: "Christina Alvarez", instagram: "https://www.instagram.com/christy.md" },
  { name: "Courtney Lynn", instagram: "https://www.instagram.com/courtnneylynn" },
  { name: "Cristiana Molina", instagram: "https://www.instagram.com/cristiana.molina" },
  { name: "D", instagram: "https://www.instagram.com/tropic_of_d" },
  { name: "Danielle Moinet", instagram: "https://www.instagram.com/daniellemoinet" },
  { name: "Danielle Webb", instagram: "https://www.instagram.com/danielle.webbb" },
  { name: "Daryana Campusano", instagram: "https://www.instagram.com/daryanacn" },
  { name: "Delaney Milian", instagram: "https://www.instagram.com/delaney.milian" },
  { name: "Desirae Elizabeth", instagram: "https://www.instagram.com/desirae.elizabeth" },
  { name: "Dj Jeannine", instagram: "https://www.instagram.com/d_jeanninexx" },
  { name: "Donatella Barbero", instagram: "https://www.instagram.com/donatellabarbero" },
  { name: "Emelye Ender", instagram: "https://www.instagram.com/emelyeender" },
  { name: "Emily Chesler", instagram: "https://www.instagram.com/emily.chesler" },
  { name: "Esther Finnie", instagram: "https://www.instagram.com/esther_finnie" },
  { name: "Faithlyn Derla", instagram: "https://www.instagram.com/faith.gbds" },
  { name: "Gabbi Garrett", instagram: "https://www.instagram.com/gabbiigarrett" },
  { name: "Genesis Venegas", instagram: "https://www.instagram.com/genesisvenegass" },
  { name: "Gia Dierking", instagram: "https://www.instagram.com/giadierking" },
  { name: "Heidi Small", instagram: "https://www.instagram.com/Heidixmall" },
  { name: "Iriannis Lopez", instagram: "https://www.instagram.com/iriannislopez" },
  { name: "Karoline Gedda", instagram: "https://www.instagram.com/kaarolinees" },
  { name: "Keslyn Hart", instagram: "https://www.instagram.com/keslynhartmullis" },
  { name: "Kira J'Nae", instagram: "https://www.instagram.com/kay.jnae" },
  { name: "Madison Novo", instagram: "https://www.instagram.com/madisongnovo" },
  { name: "Maggie Romeo", instagram: "https://www.instagram.com/maggieromeo_" },
  { name: "Makayla Holden", instagram: "https://www.instagram.com/makayla.mayla" },
  { name: "Marilyn Harvey", instagram: "https://www.instagram.com/marilynharvey_" },
  { name: "Melany Castañeda", instagram: "https://www.instagram.com/melany.0622" },
  { name: "Mia Bailey", instagram: "https://www.instagram.com/onlymiabailey" },
  { name: "Mia Torrence", instagram: "https://www.instagram.com/miatorrence" },
  { name: "Miah Daniels", instagram: "https://www.instagram.com/mxiahh" },
  { name: "Michele Lewandoski", instagram: "https://www.instagram.com/michele.lew" },
  { name: "Michelle Adams", instagram: "https://www.instagram.com/itsmichelleadams" },
  { name: "Miriam Haase", instagram: "https://www.instagram.com/miriamvas_" },
  { name: "Misti", instagram: "https://www.instagram.com/iammistidawn" },
  { name: "Monica Mcwhorter", instagram: "https://www.instagram.com/monicab.lee" },
  { name: "Nicol Araque", instagram: "https://www.instagram.com/nicoll_araque" },
  { name: "Nicole Mondragon", instagram: "https://www.instagram.com/nicolemdragon" },
  { name: "Norissa Valdez", instagram: "https://www.instagram.com/norissavaldez" },
  { name: "Nova-Joy Johnston", instagram: "https://www.instagram.com/novajoyjohnston" },
  { name: "Nya Kameko Burnett", instagram: "https://www.instagram.com/nyakameko" },
  { name: "Olivia Racaniello", instagram: "https://www.instagram.com/oliviaracaniello" },
  { name: "Paris Power", instagram: "https://www.instagram.com/Powerparis" },
  { name: "Paula Galindo", instagram: "https://www.instagram.com/paulagaval" },
  { name: "Pipa V.", instagram: "https://www.instagram.com/pipaval" },
  { name: "Presley Sullivan", instagram: "https://www.instagram.com/itspresplay" },
  { name: "Sally Mae", instagram: "https://www.instagram.com/thesallymae_" },
  { name: "Sarah Henderson", instagram: "https://www.instagram.com/sarah.h44" },
  { name: "Sarah Hill", instagram: "https://www.instagram.com/sarahhrosehill" },
  { name: "Sarah Lloyd", instagram: "https://www.instagram.com/saraahlloyd" },
  { name: "Sharna Beckman", instagram: "https://www.instagram.com/sharnabeckman" },
  { name: "Tiffany Diaz", instagram: "https://www.instagram.com/tiffanyxxdiaz" },
  { name: "Tiffany Lopez", instagram: "https://www.instagram.com/Tiffanyyllopez" },
  { name: "Tomiry De La Paz", instagram: "https://www.instagram.com/tomirydelapazz" },
  { name: "Van Phan", instagram: "https://www.instagram.com/van_phann" },
  { name: "Zahedie Martir", instagram: "https://www.instagram.com/Zahediexo" },
];

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

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || "Model";
}

function igHandleFrom(url: string): string {
  return (url.split("instagram.com/")[1] || "")
    .replace(/\/$/, "")
    .split(/[?#]/)[0]
    .toLowerCase();
}

function normalizeName(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const isValidEmail = (e: string | null | undefined) =>
  !!e && e.includes("@") && !e.endsWith("placeholder.invalid");

type Resolved = Entry & { email: string; modelId: string; matchedBy: "instagram" | "name" };

async function resolveRecipients(entries: Entry[]): Promise<{
  resolved: Resolved[];
  unresolved: Entry[];
}> {
  const handles = entries.map((e) => igHandleFrom(e.instagram)).filter(Boolean);

  // We can't index-match instagram_url on case-insensitive matching with .in(),
  // so pull all candidate rows and match in JS.
  const orHandleFilter = handles.map((h) => `instagram_url.ilike.%instagram.com/${h}%`).join(",");

  const { data: byIg, error: igErr } = await supabase
    .from("models")
    .select("id, email, first_name, last_name, username, instagram_url")
    .or(orHandleFilter);
  if (igErr) {
    console.error("Failed to query models by instagram_url:", igErr);
    process.exit(1);
  }

  // Fallback: pull all models for name-match attempts on unresolved entries.
  const igRowByHandle = new Map<string, any>();
  for (const r of byIg || []) {
    const h = igHandleFrom(r.instagram_url || "");
    if (h) igRowByHandle.set(h, r);
  }

  const resolved: Resolved[] = [];
  const stillUnresolved: Entry[] = [];

  for (const e of entries) {
    const handle = igHandleFrom(e.instagram);
    const row = handle ? igRowByHandle.get(handle) : null;
    if (row && isValidEmail(row.email)) {
      resolved.push({ ...e, email: row.email, modelId: row.id, matchedBy: "instagram" });
    } else {
      stillUnresolved.push(e);
    }
  }

  if (stillUnresolved.length === 0) {
    return { resolved, unresolved: [] };
  }

  // Name fallback: per-entry targeted query (the models table has >1000 rows
  // so a single unfiltered .select() silently truncates).
  const trulyUnresolved: Entry[] = [];
  for (const e of stillUnresolved) {
    const parts = e.name.trim().split(/\s+/);
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : null;

    const q = supabase
      .from("models")
      .select("id, email, first_name, last_name, username, instagram_url")
      .ilike("first_name", `%${first}%`);
    const { data: candidates, error: candErr } = last
      ? await q.ilike("last_name", `%${last}%`)
      : await q;
    if (candErr) {
      console.error(`Name fallback query failed for ${e.name}:`, candErr);
      trulyUnresolved.push(e);
      continue;
    }

    const entryKey = normalizeName(e.name);
    const exact = (candidates || []).filter((m: any) => {
      const fk = normalizeName(`${m.first_name || ""}${m.last_name || ""}`);
      return fk === entryKey && isValidEmail(m.email);
    });

    if (exact.length === 1) {
      const m = exact[0];
      resolved.push({ ...e, email: m.email, modelId: m.id, matchedBy: "name" });
    } else {
      trulyUnresolved.push(e);
    }
  }

  return { resolved, unresolved: trulyUnresolved };
}

function buildHtml(modelName: string) {
  const greetingName = escapeHtml(firstName(modelName));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${VENUE_NAME} ${VENUE_ADDRESS}`
  )}`;
  const igConfirmUrl = `https://www.instagram.com/examodels`;

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
                EXA Shows · ${escapeHtml(SHOW_DAY)}
              </p>
              <h1 style="margin: 0; color: white; font-size: 30px; font-weight: 800; letter-spacing: -0.5px;">
                Tonight's Lineup — Please Confirm
              </h1>
              <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 15px;">
                Call ${escapeHtml(CALL_TIME)} · Show ${escapeHtml(SHOW_TIME)} (early start)
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 18px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Hey ${greetingName},
              </p>
              <p style="margin: 0 0 28px; color: #a1a1aa; font-size: 16px; line-height: 1.65;">
                You're on the call sheet for <strong style="color: #ffffff;">EXA Shows tonight</strong> at <strong style="color: #ffffff;">${escapeHtml(VENUE_NAME)}</strong>. We're showcasing <strong style="color: #ffffff;">${escapeHtml(DESIGNERS_COUNT)}</strong> with an early ${escapeHtml(SHOW_TIME)} show start.
              </p>

              <!-- Confirmation callout -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: linear-gradient(180deg, rgba(236,72,153,0.18) 0%, rgba(139,92,246,0.10) 100%); border: 1px solid rgba(236, 72, 153, 0.5); border-radius: 12px;">
                <tr>
                  <td style="padding: 24px 26px;">
                    <p style="margin: 0 0 10px; color: #ec4899; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                      Action required
                    </p>
                    <p style="margin: 0 0 16px; color: #ffffff; font-size: 17px; font-weight: 600; line-height: 1.5;">
                      DM <a href="${igConfirmUrl}" style="color: #f9a8d4; text-decoration: none;">${escapeHtml(CONFIRM_HANDLE)}</a> on Instagram to confirm you'll be there.
                    </p>
                    <p style="margin: 0 0 18px; color: #fecaca; font-size: 14px; line-height: 1.5;">
                      If you do not DM to confirm, you will <strong>not</strong> be on tonight's lineup list.
                    </p>
                    <a href="${igConfirmUrl}" style="display: inline-block; padding: 12px 22px; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 999px; letter-spacing: 0.3px;">
                      DM ${escapeHtml(CONFIRM_HANDLE)} to confirm →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background: linear-gradient(180deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.05) 100%); border: 1px solid rgba(236, 72, 153, 0.25); border-radius: 12px;">
                <tr>
                  <td style="padding: 26px;">
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                          Call Time · Hair &amp; Makeup
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${escapeHtml(CALL_TIME)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid rgba(236,72,153,0.18);">
                          <div style="padding-top: 20px;">Show Start (early)</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${escapeHtml(SHOW_TIME)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid rgba(236,72,153,0.18);">
                          <div style="padding-top: 20px;">Location</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 6px; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${escapeHtml(VENUE_NAME)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #a1a1aa; font-size: 15px;">
                          ${escapeHtml(VENUE_ADDRESS)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 20px;">
                          <a href="${mapsUrl}" style="display: inline-block; color: #f9a8d4; font-size: 13px; font-weight: 600; text-decoration: none; border-bottom: 1px solid rgba(249,168,212,0.5); padding-bottom: 2px;">
                            Open in Google Maps →
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border-top: 1px solid rgba(236,72,153,0.18);">
                          <div style="padding-top: 20px;">Showcase</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0; color: #ffffff; font-size: 17px; font-weight: 600;">
                          ${escapeHtml(DESIGNERS_COUNT)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 15px; line-height: 1.65;">
                Questions or running late, email
                <a href="mailto:team@examodels.com" style="color: #f9a8d4; text-decoration: none; font-weight: 600;">team@examodels.com</a>.
              </p>

              <p style="margin: 28px 0 0; color: #a1a1aa; font-size: 15px; line-height: 1.6;">
                See you on the runway tonight.<br/>
                <span style="color: #ec4899; font-weight: 600;">— The EXA Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                Questions? Reply to this email or contact team@examodels.com
              </p>
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                EXA Models · Where Models Shine
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

function buildText(modelName: string) {
  return `Hey ${firstName(modelName)},

You're on the call sheet for EXA Shows TONIGHT at ${VENUE_NAME}.
We're showcasing ${DESIGNERS_COUNT} with an early ${SHOW_TIME} show start.

ACTION REQUIRED — please DM ${CONFIRM_HANDLE} on Instagram to confirm.
If you do not DM to confirm, you will NOT be on tonight's lineup list.

Call Time (Hair & Makeup): ${CALL_TIME}
Show Start (early):        ${SHOW_TIME}
Location:                  ${VENUE_NAME}, ${VENUE_ADDRESS}
Showcase:                  ${DESIGNERS_COUNT}

Questions or running late, email team@examodels.com.

See you on the runway tonight.
— The EXA Team`;
}

async function main() {
  console.log(`EXA Shows tonight — confirmation email`);
  console.log(`  ${SHOW_DAY}`);
  console.log(`  Call (H&M): ${CALL_TIME}`);
  console.log(`  Show:       ${SHOW_TIME} (early)`);
  console.log(`  Venue:      ${VENUE_NAME}, ${VENUE_ADDRESS}`);
  console.log(`  Showcase:   ${DESIGNERS_COUNT}`);
  console.log(`  Confirm:    DM ${CONFIRM_HANDLE}`);
  console.log(`  Mode:       ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

  if (TEST) {
    console.log(`TEST MODE — sending only to ${TEST_RECIPIENT.email}\n`);
    if (!SEND) {
      console.log(`Dry run complete. Re-run with --test --send to send the single test email.`);
      return;
    }
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set. Aborting.");
      process.exit(1);
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: [TEST_RECIPIENT.email],
      subject: `Tonight: EXA Shows · ${CALL_TIME} Model Hair & Makeup Call Time, ${SHOW_TIME} Show — please confirm`,
      html: buildHtml(TEST_RECIPIENT.name),
      text: buildText(TEST_RECIPIENT.name),
    });
    if (error) {
      console.error(`✗ ${TEST_RECIPIENT.email}:`, error);
      process.exit(1);
    }
    console.log(`✓ Sent test to ${TEST_RECIPIENT.email}  (id: ${data?.id || "?"})`);
    return;
  }

  console.log(`Resolving ${ENTRIES.length} models to emails…\n`);
  const { resolved, unresolved } = await resolveRecipients(ENTRIES);

  console.log(`Resolved: ${resolved.length}`);
  console.log(`  by instagram: ${resolved.filter((r) => r.matchedBy === "instagram").length}`);
  console.log(`  by name:      ${resolved.filter((r) => r.matchedBy === "name").length}`);
  console.log(`Unresolved (no model row or no email): ${unresolved.length}\n`);

  for (const r of resolved) {
    const tag = r.matchedBy === "instagram" ? "ig" : "nm";
    console.log(`  ✓ [${tag}] ${r.name.padEnd(28)} ${r.email}`);
  }
  if (unresolved.length) {
    console.log(`\n  Unresolved — these models will NOT be emailed unless you add them manually:`);
    for (const u of unresolved) {
      console.log(`    - ${u.name.padEnd(28)} ${u.instagram}`);
    }
  }

  if (!SEND) {
    console.log(`\nDry run complete. Re-run with --send to email these ${resolved.length} models.`);
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("\nRESEND_API_KEY is not set. Aborting.");
    process.exit(1);
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log(`\nSending to ${resolved.length} models…\n`);

  let sent = 0;
  let failed = 0;

  for (const r of resolved) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: [r.email],
        subject: `Tonight: EXA Shows · ${CALL_TIME} Model Hair & Makeup Call Time, ${SHOW_TIME} Show — please confirm`,
        html: buildHtml(r.name),
        text: buildText(r.name),
      });
      if (error) {
        failed++;
        console.error(`  ✗ ${r.email}:`, error);
      } else {
        sent++;
        console.log(`  ✓ ${r.email}  (id: ${data?.id || "?"})`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${r.email}:`, err);
    }

    // Resend rate limit: 2 req/s
    await new Promise((res) => setTimeout(res, 600));
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
  if (unresolved.length) {
    console.log(`Unresolved (not emailed): ${unresolved.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
