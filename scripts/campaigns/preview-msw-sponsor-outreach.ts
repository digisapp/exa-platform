/**
 * Preview the MSW 2026 sponsor outreach email BEFORE you send it.
 *
 * Loads brand_outreach_contacts from your Supabase DB, renders each one
 * as an HTML file using the real sponsor email template, and opens an
 * index page in your browser so you can eyeball the personalization,
 * links, and copy for every recipient.
 *
 * Nothing is sent. Nothing is marked as contacted. It is 100% dry-run.
 *
 * Run:
 *   npx tsx scripts/campaigns/preview-msw-sponsor-outreach.ts
 *
 * Options (env vars):
 *   LIMIT=10                 How many contacts to preview (default 10)
 *   STATUS=new               Contact status to filter (default 'new')
 *   CATEGORY=swimwear        Only preview one category (optional)
 *
 * Example:
 *   LIMIT=25 STATUS=new npx tsx scripts/campaigns/preview-msw-sponsor-outreach.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { exec } from "child_process";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.examodels.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const LIMIT = parseInt(process.env.LIMIT || "10", 10);
const STATUS = process.env.STATUS || "new";
const CATEGORY = process.env.CATEGORY;

// Where we write the preview files
const OUT_DIR = join(process.cwd(), "tmp", "outreach-preview");

// =============================================
// CAMPAIGN CONTENT — edit these to tune the outreach
// =============================================

const SUBJECT_TEMPLATE =
  "{{brand_name}} x Miami Swim Week 2026 — partnership invitation";

const BODY_TEMPLATE = `Hi {{contact_name}},

I'm reaching out because {{brand_name}} feels like a natural fit for what we're producing at Miami Swim Week 2026.

Quick context: EXA is taking over The Alexander Hotel in Miami Beach from May 25–31 for a full 7-day experience — a ticketed Casting Day Party, six evening runway shows (each featuring global designers and 100+ models), a sunset beach show, a 120ft yacht, and continuous content production the entire week. 300+ curated models and creators will be onsite with audiences ranging from 5K to 5M each.

We have sponsorship openings that line up well with {{brand_name}} — from product seeding and backstage integration to official category exclusivity. Category partners lock in before May 1, so I wanted to reach out early.

A few ways we typically integrate brands like {{brand_name}}:

– Official Category Partner (exclusive to your vertical)
– Backstage & activation presence across the week
– Gift bag + creator seeding (300+ models distributing organically)
– Custom content packages built around your goals

Worth a quick 20-minute call to walk through it?

Full packages, schedule, and past-year content at the link below.

Talk soon,
Nathan`;

const CTA_URL = `${BASE_URL}/sponsors/miami-swim-week`;
const CTA_TEXT = "View Sponsorship Packages";
const FROM_NAME = "Nathan — EXA Models Partnerships";

// =============================================
// HTML TEMPLATE (duplicated from src/lib/email.ts sponsor template)
// If the production template changes, update this to match.
// =============================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSponsorEmailHtml({
  brandName,
  contactName,
  bodyText,
  ctaUrl,
  ctaText,
  fromName,
}: {
  brandName: string;
  contactName: string | null;
  bodyText: string;
  ctaUrl: string;
  ctaText: string;
  fromName: string;
}): string {
  const personalizedBody = bodyText
    .replace(/\{\{brand_name\}\}/g, escapeHtml(brandName))
    .replace(/\{\{contact_name\}\}/g, escapeHtml(contactName || "there"));

  const htmlBody = personalizedBody
    .split("\n")
    .map((line) =>
      line.trim() === ""
        ? ""
        : `<p style="margin: 0 0 14px; color: #d4d4d4; font-size: 15px; line-height: 1.7;">${escapeHtml(line)}</p>`,
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
              <p style="margin: 0 0 8px; color: #ec4899; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">EXA Models · Exclusive Invitation</p>
              <h1 style="margin: 0 0 6px; color: #ffffff; font-size: 30px; font-weight: 800; line-height: 1.15;">Miami Swim Week 2026</h1>
              <p style="margin: 0 0 32px; color: #71717a; font-size: 15px;">May 25–31 &nbsp;·&nbsp; The Alexander Hotel, Miami Beach</p>
              <div style="height: 1px; background: linear-gradient(90deg, #ec4899, #8b5cf6, transparent); margin-bottom: 28px;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">300+</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Curated Models</p>
                  </td>
                  <td style="width: 6px;"></td>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">6</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Runway Shows</p>
                  </td>
                  <td style="width: 6px;"></td>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">7 Days</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Hotel Takeover</p>
                  </td>
                  <td style="width: 6px;"></td>
                  <td style="text-align: center; padding: 14px 6px; background-color: #1a1a1a; border-radius: 8px;">
                    <p style="margin: 0 0 3px; color: #ec4899; font-size: 22px; font-weight: 800;">50M+</p>
                    <p style="margin: 0; color: #71717a; font-size: 11px;">Combined Reach</p>
                  </td>
                </tr>
              </table>

              ${htmlBody}

              <p style="margin: 24px 0 16px; color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.3px;">What Your Sponsorship Includes:</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr><td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #ec4899;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">🎯</td>
                    <td>
                      <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Brand Placement Across the Week</p>
                      <p style="margin: 0; color: #71717a; font-size: 13px;">Runway backdrops, signage, digital screens, and step-and-repeats</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr><td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #8b5cf6;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">📸</td>
                    <td>
                      <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Organic Creator Distribution</p>
                      <p style="margin: 0; color: #71717a; font-size: 13px;">300+ creators posting across the week — full content library with usage rights</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                <tr><td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #06b6d4;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">🥂</td>
                    <td>
                      <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Activation Presence</p>
                      <p style="margin: 0; color: #71717a; font-size: 13px;">Pool deck, backstage, yacht, beach runway — embedded moments, not bolted-on sponsorships</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr><td style="padding: 14px 16px; background-color: #1a1a1a; border-radius: 10px; border-left: 3px solid #f59e0b;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align: middle; padding-right: 14px; font-size: 22px; width: 36px;">⭐</td>
                    <td>
                      <p style="margin: 0 0 3px; color: #ffffff; font-size: 14px; font-weight: 600;">Category Exclusivity Available</p>
                      <p style="margin: 0; color: #71717a; font-size: 13px;">Only one Official Partner per vertical — locks in before May 1, 2026</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px; background-color: #0d0d0d; border-radius: 12px; border: 1px solid #262626;">
                <tr><td style="padding: 20px 20px 16px;">
                  <p style="margin: 0 0 14px; color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Sponsorship Packages</p>
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;">
                      <p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$2K</p>
                      <p style="margin: 0; color: #71717a; font-size: 11px;">Gift Bag</p>
                    </td>
                    <td style="width: 6px;"></td>
                    <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;">
                      <p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$8K</p>
                      <p style="margin: 0; color: #71717a; font-size: 11px;">Pool Deck</p>
                    </td>
                    <td style="width: 6px;"></td>
                    <td style="padding: 10px 8px; background-color: #1f0f2e; border-radius: 8px; text-align: center; border: 1px solid #8b5cf6; width: 25%;">
                      <p style="margin: 0 0 2px; color: #a78bfa; font-size: 17px; font-weight: 800;">$22.5K</p>
                      <p style="margin: 0; color: #71717a; font-size: 11px;">Category Partner</p>
                    </td>
                    <td style="width: 6px;"></td>
                    <td style="padding: 10px 8px; background-color: #1a1a1a; border-radius: 8px; text-align: center; width: 25%;">
                      <p style="margin: 0 0 2px; color: #ec4899; font-size: 17px; font-weight: 800;">$45K</p>
                      <p style="margin: 0; color: #71717a; font-size: 11px;">Presenting</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 36px;">
                <tr><td align="center">
                  <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 44px; border-radius: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
                    ${ctaText}
                  </a>
                </td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #262626; padding-top: 24px;">
                <tr><td>
                  <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 14px;">${escapeHtml(fromName)}</p>
                  <p style="margin: 0 0 10px; color: #71717a; font-size: 13px;">Reply to this email to connect with our team</p>
                  <p style="margin: 0; color: #71717a; font-size: 12px;">
                    <a href="${BASE_URL}" style="color: #ec4899; text-decoration: none;">examodels.com</a>
                    &nbsp;·&nbsp;
                    <a href="${BASE_URL}/tv" style="color: #ec4899; text-decoration: none;">Watch past shows</a>
                    &nbsp;·&nbsp;
                    <a href="https://instagram.com/examodels" style="color: #ec4899; text-decoration: none;">@examodels</a>
                  </p>
                </td></tr>
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

// =============================================
// MAIN
// =============================================

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("\n🔍 Loading brand outreach contacts…");
  let query = supabase
    .from("brand_outreach_contacts")
    .select("id, brand_name, contact_name, email, category, status, website_url, instagram_handle")
    .eq("status", STATUS)
    .limit(LIMIT);

  if (CATEGORY) {
    query = query.eq("category", CATEGORY);
  }

  const { data: contacts, error } = await query;

  if (error) {
    console.error("❌ Failed to load contacts:", error.message);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log(`\n⚠️  No contacts found with status='${STATUS}'${CATEGORY ? ` and category='${CATEGORY}'` : ""}.`);
    process.exit(0);
  }

  console.log(`✓ Loaded ${contacts.length} contact(s).\n`);

  // Prep output dir (wipe previous)
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Personalization quality stats
  let withContactName = 0;
  let withoutContactName = 0;
  const categoryCounts = new Map<string, number>();
  const fileList: { filename: string; brand: string; contact: string; email: string; category: string }[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    if (c.contact_name) withContactName++;
    else withoutContactName++;

    const cat = c.category || "uncategorized";
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

    const subject = SUBJECT_TEMPLATE
      .replace(/\{\{brand_name\}\}/g, c.brand_name)
      .replace(/\{\{contact_name\}\}/g, c.contact_name || "there");

    const html = renderSponsorEmailHtml({
      brandName: c.brand_name,
      contactName: c.contact_name,
      bodyText: BODY_TEMPLATE,
      ctaUrl: CTA_URL,
      ctaText: CTA_TEXT,
      fromName: FROM_NAME,
    });

    const filename = `${String(i + 1).padStart(3, "0")}-${slugify(c.brand_name).slice(0, 40)}.html`;
    writeFileSync(join(OUT_DIR, filename), html, "utf-8");
    fileList.push({
      filename,
      brand: c.brand_name,
      contact: c.contact_name || "(missing)",
      email: c.email,
      category: cat,
    });

    console.log(
      `  ${String(i + 1).padStart(3)}. ${c.brand_name.padEnd(30).slice(0, 30)}  ${(c.contact_name || "—").padEnd(18).slice(0, 18)}  ${c.email.padEnd(35).slice(0, 35)}  [${cat}]`,
    );
    console.log(`       Subject: ${subject}`);
  }

  // Build index.html
  const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MSW Sponsor Outreach Preview — ${contacts.length} emails</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .meta { color: #888; font-size: 14px; margin-bottom: 32px; }
    .subject { color: #ec4899; font-weight: 600; font-size: 13px; margin-top: 8px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
    .stat { background: #1a1a1a; padding: 16px; border-radius: 12px; }
    .stat-num { font-size: 22px; font-weight: 800; color: #ec4899; }
    .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: #111; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #222; font-size: 13px; }
    th { background: #1a1a1a; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    a { color: #a78bfa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .missing { color: #f59e0b; font-style: italic; }
    .warning { background: #2a1a0a; border: 1px solid #92400e; padding: 16px; border-radius: 12px; margin-bottom: 24px; color: #fcd34d; font-size: 14px; }
  </style>
</head>
<body>
  <h1>📧 MSW Sponsor Outreach Preview</h1>
  <p class="meta">${contacts.length} email${contacts.length !== 1 ? "s" : ""} · filter: <code>status=${STATUS}${CATEGORY ? ` · category=${CATEGORY}` : ""}</code> · click a row to preview the full rendered email</p>

  ${withoutContactName > 0 ? `<div class="warning">⚠️  ${withoutContactName} contact${withoutContactName !== 1 ? "s are" : " is"} missing a contact_name — these will say "Hi there" instead of a personalized greeting.</div>` : ""}

  <div class="stats">
    <div class="stat">
      <div class="stat-num">${contacts.length}</div>
      <div class="stat-label">Emails Previewed</div>
    </div>
    <div class="stat">
      <div class="stat-num">${withContactName}</div>
      <div class="stat-label">With First Name</div>
    </div>
    <div class="stat">
      <div class="stat-num">${withoutContactName}</div>
      <div class="stat-label">Missing Name</div>
    </div>
    <div class="stat">
      <div class="stat-num">${categoryCounts.size}</div>
      <div class="stat-label">Categories</div>
    </div>
  </div>

  <p class="meta"><strong>Campaign subject:</strong> <span style="color:#ec4899">${escapeHtml(SUBJECT_TEMPLATE)}</span></p>
  <p class="meta"><strong>CTA URL:</strong> <a href="${CTA_URL}">${CTA_URL}</a></p>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Brand</th>
        <th>Contact</th>
        <th>Email</th>
        <th>Category</th>
        <th>Preview</th>
      </tr>
    </thead>
    <tbody>
      ${fileList
        .map(
          (f, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(f.brand)}</strong></td>
            <td>${f.contact === "(missing)" ? `<span class="missing">(missing)</span>` : escapeHtml(f.contact)}</td>
            <td>${escapeHtml(f.email)}</td>
            <td>${escapeHtml(f.category)}</td>
            <td><a href="./${f.filename}" target="_blank">Open →</a></td>
          </tr>`,
        )
        .join("\n")}
    </tbody>
  </table>
</body>
</html>`;

  writeFileSync(join(OUT_DIR, "index.html"), indexHtml, "utf-8");

  // Summary
  console.log("\n────────────────────────────────────────");
  console.log("📊 Summary");
  console.log("────────────────────────────────────────");
  console.log(`  Total emails previewed     : ${contacts.length}`);
  console.log(`  With contact_name (personal): ${withContactName}`);
  console.log(`  Missing contact_name        : ${withoutContactName}  ${withoutContactName > 0 ? "⚠️  will show \"Hi there\"" : ""}`);
  console.log(`  Categories                  : ${categoryCounts.size}`);
  for (const [cat, count] of Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`    • ${cat.padEnd(15)} ${count}`);
  }
  console.log(`\n✓ Previews written to: ${OUT_DIR}`);
  console.log(`  Open: ${join(OUT_DIR, "index.html")}`);

  // Auto-open in browser (macOS / Linux)
  const indexPath = join(OUT_DIR, "index.html");
  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${indexPath}"`, () => {});

  console.log("\n💡 Nothing was sent. Nothing was marked contacted. Review the previews, then send from your admin panel when ready.\n");
}

main().catch((err) => {
  console.error("❌ Preview script failed:", err);
  process.exit(1);
});
