/**
 * MSW Brand Importer
 *
 * Usage:
 *   npx tsx scripts/data-imports/import-msw-brands.ts path/to/brands.csv
 *
 * CSV format (first row must be headers):
 *   brand_name,email
 *
 * What it does per row:
 *   1. Creates a Supabase auth user (no password — magic-link only)
 *   2. Creates actors + brands records
 *   3. Adds an event_show_designers row linking brand to MSW
 *   4. Generates a magic link and sends a branded email via Resend
 *
 * Set these in .env.local before running:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   NEXT_PUBLIC_SITE_URL  (e.g. https://examodels.com)
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://examodels.com";
const CASTING_URL = `${SITE_URL}/brands/msw-casting`;
const FROM_EMAIL = "nathan@examodels.com";
const FROM_NAME = "Nathan @ EXA";

// ─── CSV ─────────────────────────────────────────────────────────────────────

function parseCsv(filePath: string): { brand_name: string; email: string }[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("brand_name");
  const emailIdx = headers.indexOf("email");
  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error('CSV must have "brand_name" and "email" columns');
  }
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return { brand_name: cols[nameIdx], email: cols[emailIdx] };
  }).filter((r) => r.brand_name && r.email);
}

// ─── Username gen ─────────────────────────────────────────────────────────────

function toUsername(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  return base.length < 3 ? `brand${base}` : base;
}

async function resolveUsername(base: string): Promise<string> {
  const { data } = await supabase.from("brands").select("username").eq("username", base).maybeSingle();
  if (!data) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base.slice(0, 17)}${i}`;
    const { data: conflict } = await supabase.from("brands").select("username").eq("username", candidate).maybeSingle();
    if (!conflict) return candidate;
  }
  return `${base}${Date.now()}`.slice(0, 25);
}

// ─── Email ────────────────────────────────────────────────────────────────────

function buildInviteHtml(brandName: string, magicLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#ff2d78,#7c3aed);padding:32px;text-align:center;">
            <p style="margin:0;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.8);">EXA Models</p>
            <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#fff;">Miami Swim Week 2026</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.75);">Model Casting Portal · May 25–31</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:15px;color:#ccc;">Hi <strong style="color:#fff;">${brandName}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.6;">
              Your EXA account is ready. You now have access to the <strong style="color:#fff;">MSW 2026 Casting Portal</strong> — a private view of all confirmed models available for your show.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#ccc;line-height:1.6;">
              Browse measurements, photos, and stats, then build your private shortlist. Your picks are only visible to you and the EXA team.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#ff2d78,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.5px;">
                Open Casting Portal
              </a>
            </div>
            <p style="margin:0;font-size:12px;color:#666;text-align:center;line-height:1.6;">
              This link signs you in automatically — no password needed.<br>
              Link expires in 24 hours. Reply to this email if you need a new one.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
            <p style="margin:0;font-size:12px;color:#555;">EXA Models · Miami Swim Week 2026</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Per-brand import ─────────────────────────────────────────────────────────

async function importBrand(
  brandName: string,
  email: string,
  mswEventId: string,
  dryRun: boolean
): Promise<{ ok: boolean; note: string; magicLink?: string }> {
  // 1. Check if auth user already exists
  const { data: existingList } = await supabase.auth.admin.listUsers();
  const existingUser = existingList?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    if (dryRun) return { ok: true, note: "DRY RUN — would create user" };
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createErr || !created?.user) return { ok: false, note: `createUser failed: ${createErr?.message}` };
    userId = created.user.id;
  }

  // 2. Ensure actors + brands rows exist
  const { data: existingActor } = await supabase.from("actors").select("id").eq("user_id", userId).maybeSingle();

  let actorId: string;

  if (existingActor) {
    actorId = existingActor.id;
  } else {
    if (dryRun) return { ok: true, note: "DRY RUN — would create actor + brand" };
    const { data: newActor, error: actorErr } = await supabase
      .from("actors")
      .insert({ user_id: userId, type: "brand" })
      .select("id")
      .single();
    if (actorErr || !newActor) return { ok: false, note: `actor insert failed: ${actorErr?.message}` };
    actorId = newActor.id;

    const username = await resolveUsername(toUsername(brandName));
    const { error: brandErr } = await supabase.from("brands").insert({
      id: actorId,
      company_name: brandName,
      email,
      username,
      is_verified: false,
      subscription_tier: "free",
    });
    if (brandErr) return { ok: false, note: `brand insert failed: ${brandErr?.message}` };
  }

  // 3. Link brand to MSW via event_show_designers (upsert — show will be assigned later by admin)
  const { data: existingDesigner } = await supabase
    .from("event_show_designers")
    .select("id")
    .eq("brand_id", actorId)
    .maybeSingle();

  if (!existingDesigner && !dryRun) {
    // Find the first show for this event to attach to (admin can reassign later)
    const { data: firstShow } = await supabase
      .from("event_shows")
      .select("id")
      .eq("event_id", mswEventId)
      .order("show_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstShow) {
      await supabase.from("event_show_designers").insert({
        show_id: firstShow.id,
        designer_name: brandName,
        designer_order: 999,
        brand_id: actorId,
      });
    }
  }

  // 4. Generate magic link → send email
  if (dryRun) return { ok: true, note: "DRY RUN — would send magic link email" };

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: CASTING_URL },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    return { ok: false, note: `generateLink failed: ${linkErr?.message}` };
  }

  const magicLink = linkData.properties.action_link;

  const { error: emailErr } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "EXA MSW 2026 — Your Casting Portal is Ready",
    html: buildInviteHtml(brandName, magicLink),
  });

  if (emailErr) {
    console.warn(`  ⚠ Email failed for ${email} — magic link: ${magicLink}`);
    return { ok: true, note: "Account created but email failed — link logged above", magicLink };
  }

  return { ok: true, note: "Account created + email sent" };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");

  if (!csvPath) {
    console.error("Usage: npx tsx scripts/data-imports/import-msw-brands.ts path/to/brands.csv [--dry-run]");
    process.exit(1);
  }

  const brands = parseCsv(path.resolve(csvPath));
  console.log(`\nLoaded ${brands.length} brands from CSV${dryRun ? " (DRY RUN)" : ""}\n`);

  // Find the MSW 2026 event
  const { data: mswEvent } = await supabase
    .from("events")
    .select("id, name")
    .ilike("name", "%miami swim week%")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!mswEvent) {
    console.error("Could not find Miami Swim Week event in DB. Check the events table.");
    process.exit(1);
  }

  console.log(`Event: ${mswEvent.name} (${mswEvent.id})\n`);

  let ok = 0;
  let failed = 0;

  for (const { brand_name, email } of brands) {
    process.stdout.write(`  ${brand_name} <${email}> … `);
    const result = await importBrand(brand_name, email, mswEvent.id, dryRun);
    if (result.ok) {
      ok++;
      console.log(`✓ ${result.note}`);
    } else {
      failed++;
      console.log(`✗ ${result.note}`);
    }
    // Slight delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nDone — ${ok} succeeded, ${failed} failed`);
}

main().catch((err) => { console.error(err); process.exit(1); });
