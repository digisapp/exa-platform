/**
 * One-time re-engagement: every approved, claimed model with NO profile photo
 * is invisible on /models (the explore query requires profile_photo_url).
 * Funnel audit 2026-07-05: that's ~50% of all approvals. This tells them the
 * one thing standing between them and being live, with a CTA to /dashboard
 * (which now shows the "you're not visible yet" banner + checklist).
 *
 * Usage:
 *   node scripts/campaigns/send-invisible-models-photo-nudge.mjs                 # dry run (default)
 *   node scripts/campaigns/send-invisible-models-photo-nudge.mjs --preview you@x # send ONE sample to an address
 *   node scripts/campaigns/send-invisible-models-photo-nudge.mjs --send          # actually send to everyone
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { readFileSync } from "fs";

const DRY_RUN = !process.argv.includes("--send") && !process.argv.includes("--preview");
const previewIdx = process.argv.indexOf("--preview");
const PREVIEW_TO = previewIdx !== -1 ? process.argv[previewIdx + 1] : null;

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(env.RESEND_API_KEY);
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";
const REPLY_TO = "hello@inbound.examodels.com";
const BASE_URL = "https://www.examodels.com";

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Approved + claimed (can log in) + not deleted + no profile photo = invisible on /models
const { data: models, error } = await sb
  .from("models")
  .select("id, username, first_name, email, preferred_language, created_at, user_id")
  .eq("is_approved", true)
  .is("deleted_at", null)
  .not("user_id", "is", null)
  .or("profile_photo_url.is.null,profile_photo_url.eq.")
  .order("created_at", { ascending: false });

if (error) {
  console.error("DB error:", error);
  process.exit(1);
}

const targets = (models || []).filter((m) => m.email && m.email.includes("@"));
console.log(`Approved + claimed, no profile photo (invisible on /models): ${targets.length}`);

if (DRY_RUN) {
  console.log("\n--- DRY RUN --- (--preview <email> for a sample, --send to send to everyone)\n");
  for (const m of targets) {
    console.log(`  ${m.first_name || "(no name)"} | @${m.username} | ${m.email} | ${(m.preferred_language || "en").slice(0, 2)} | joined ${m.created_at?.slice(0, 10)}`);
  }
  console.log(`\nTotal: ${targets.length} emails would be sent`);
  process.exit(0);
}

function buildEmail(m) {
  const isSpanish = (m.preferred_language || "en").startsWith("es");
  const modelName = m.first_name || m.username;
  const dashboardUrl = `${BASE_URL}/dashboard`;
  const profileUrl = `${BASE_URL}/${m.username}`;

  const t = isSpanish
    ? {
        subject: `${modelName}, estás a una foto de aparecer en EXA ✨`,
        headerTitle: "Estás aprobada —<br>pero nadie puede verte",
        headerSub: "Una foto de perfil es lo único que falta<br>para que aparezcas en EXA.",
        greeting: `¡Hola ${escapeHtml(modelName)}! 👋`,
        p1: "Tu solicitud en EXA Models fue aprobada — pero tu perfil aún no tiene <strong style=\"color: #ffffff;\">foto de perfil</strong>, y sin ella no apareces en la página de modelos donde marcas y fans te buscan.",
        p2: "Agrega una foto y estarás visible al instante. Toma menos de un minuto.",
        whyTitle: "Por qué importa",
        whyBody: "Las marcas navegan los perfiles de EXA para elegir modelos para campañas, castings y eventos pagados. Sin foto, literalmente no estás en la lista.",
        tipsTitle: "Tips para una foto que destaque:",
        tips: "📸 &nbsp;Rostro claro y bien iluminado<br>✨ &nbsp;Look natural, sin filtros pesados<br>📐 &nbsp;Alta resolución — nada borroso ni recortado",
        cta: "Agregar Mi Foto →",
        ctaNote: "Toma menos de un minuto — ¡en serio!",
        viewProfile: "Ver tu perfil",
        unsub: "Cancelar suscripción",
      }
    : {
        subject: `${modelName}, you're one photo away from going live on EXA ✨`,
        headerTitle: "You're approved —<br>but no one can see you",
        headerSub: "A profile photo is the only thing standing<br>between you and being live on EXA.",
        greeting: `Hey ${escapeHtml(modelName)}! 👋`,
        p1: "Your EXA Models application was approved — but your profile still has no <strong style=\"color: #ffffff;\">profile photo</strong>, and without one you don't appear on the models page where brands and fans are browsing.",
        p2: "Add a photo and you're visible instantly. It takes less than a minute.",
        whyTitle: "Why it matters",
        whyBody: "Brands browse EXA profiles to pick models for campaigns, castings, and paid events. Without a photo, you're literally not on the list.",
        tipsTitle: "Tips for a standout photo:",
        tips: "📸 &nbsp;Clear, well-lit face shot<br>✨ &nbsp;Natural look, minimal heavy filters<br>📐 &nbsp;High resolution — no blurry or cropped photos",
        cta: "Add My Photo →",
        ctaNote: "Takes less than a minute — seriously!",
        viewProfile: "View your profile",
        unsub: "Unsubscribe",
      };

  return { t, dashboardUrl, profileUrl };
}

async function sendTo(m, overrideEmail = null) {
  const { t, dashboardUrl, profileUrl } = buildEmail(m);

  let unsubLink = "";
  try {
    const { data: tokenData } = await sb.rpc("get_or_create_email_preferences", { p_email: m.email });
    if (tokenData?.[0]?.unsubscribe_token) {
      unsubLink = `${BASE_URL}/unsubscribe?token=${tokenData[0].unsubscribe_token}`;
    }
  } catch (_) {}

  const unsubFooter = unsubLink
    ? `<p style="margin: 10px 0 0; color: #52525b; font-size: 11px;"><a href="${unsubLink}" style="color: #52525b; text-decoration: underline;">${t.unsub}</a></p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111111; border-radius: 20px; overflow: hidden; border: 1px solid #262626;">

          <!-- Hero Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 52px 32px 44px; text-align: center;">
              <p style="margin: 0 0 10px; color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">EXA Models</p>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 30px; font-weight: 800; line-height: 1.2; text-shadow: 0 2px 12px rgba(0,0,0,0.35);">
                ${t.headerTitle}
              </h1>
              <p style="margin: 14px 0 0; color: rgba(255,255,255,0.92); font-size: 16px; line-height: 1.5;">
                ${t.headerSub}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px 32px;">

              <p style="margin: 0 0 22px; color: #f4f4f5; font-size: 18px; font-weight: 600;">
                ${t.greeting}
              </p>

              <p style="margin: 0 0 18px; color: #a1a1aa; font-size: 16px; line-height: 1.75;">
                ${t.p1}
              </p>

              <p style="margin: 0 0 18px; color: #a1a1aa; font-size: 16px; line-height: 1.75;">
                ${t.p2}
              </p>

              <!-- Highlight box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td style="padding: 22px 24px; background: linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.12) 100%); border-radius: 14px; border: 1px solid rgba(236,72,153,0.25);">
                    <p style="margin: 0 0 8px; color: #ec4899; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">${t.whyTitle}</p>
                    <p style="margin: 0; color: #d4d4d8; font-size: 15px; line-height: 1.65;">
                      ${t.whyBody}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Tips -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 18px 20px; background-color: #1c1c1c; border-radius: 12px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-weight: 600; font-size: 15px;">${t.tipsTitle}</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.8;">
                      ${t.tips}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 44px; border-radius: 50px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 20px rgba(236, 72, 153, 0.45);">
                      ${t.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #52525b; font-size: 13px; text-align: center;">${t.ctaNote}</p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 28px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 14px;">
                <a href="${profileUrl}" style="color: #ec4899; text-decoration: none;">${t.viewProfile}</a>
                &nbsp;·&nbsp;
                <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">@examodels</a>
              </p>
              <p style="margin: 0; color: #3f3f46; font-size: 12px;">EXA Models &nbsp;·&nbsp; examodels.com</p>
              ${unsubFooter}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO,
    to: [overrideEmail || m.email],
    subject: t.subject,
    html,
  });
}

if (PREVIEW_TO) {
  const sample = targets[0];
  if (!sample) { console.log("No targets to preview."); process.exit(0); }
  const { error: e } = await sendTo(sample, PREVIEW_TO);
  console.log(e ? `Preview error: ${e.message}` : `Preview sent to ${PREVIEW_TO} (rendered as it would appear for @${sample.username})`);
  process.exit(0);
}

let sent = 0, skipped = 0, errors = 0;

for (const m of targets) {
  const { data: unsubData } = await sb.rpc("is_email_unsubscribed", {
    p_email: m.email,
    p_email_type: "marketing",
  });
  if (unsubData === true) {
    console.log(`  SKIP (unsubscribed): @${m.username}`);
    skipped++;
    continue;
  }

  try {
    const { error: sendError } = await sendTo(m);
    if (sendError) {
      console.log(`  ERROR: @${m.username} — ${sendError.message}`);
      errors++;
    } else {
      console.log(`  SENT: @${m.username} | ${m.email}`);
      sent++;
    }
  } catch (e) {
    console.log(`  ERROR: @${m.username} — ${e.message}`);
    errors++;
  }

  // Stay well under Resend rate limits
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`\nDone! Sent: ${sent} | Skipped: ${skipped} | Errors: ${errors}`);
