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
        : `<p style="margin: 0 0 16px; color: #1f2937; font-size: 15px; line-height: 1.7;">${escapeHtml(line)}</p>`,
    )
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
          <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px; border-radius: 6px;">${ctaText} →</a>
        </td></tr>

        <tr><td style="padding: 24px 40px 32px; border-top: 1px solid #e5e4e0; background-color: #fafaf8;">
          <p style="margin: 0 0 6px; color: #111111; font-weight: 600; font-size: 14px;">${escapeHtml(fromName)}</p>
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
