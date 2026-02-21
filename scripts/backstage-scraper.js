/**
 * Backstage.com Job Scraper — EXA Models
 *
 * Filters: Modeling + Content Creator | Female | Age 18-34
 * Locations: New York, California, Florida, Texas, Arizona, Online
 *
 * Usage:
 *   BACKSTAGE_EMAIL=you@email.com BACKSTAGE_PASSWORD=yourpassword node scripts/backstage-scraper.js
 *
 * Debug (shows browser window):
 *   BACKSTAGE_HEADLESS=false BACKSTAGE_EMAIL=... BACKSTAGE_PASSWORD=... node scripts/backstage-scraper.js
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const EMAIL     = process.env.BACKSTAGE_EMAIL;
const PASSWORD  = process.env.BACKSTAGE_PASSWORD;
const HEADLESS  = process.env.BACKSTAGE_HEADLESS !== "false";
const MAX_PAGES = parseInt(process.env.BACKSTAGE_MAX_PAGES || "20", 10);

if (!EMAIL || !PASSWORD) {
  console.error("Set BACKSTAGE_EMAIL and BACKSTAGE_PASSWORD env vars");
  process.exit(1);
}

// ── Login via Sign In button on homepage ──────────────────────────────────────
async function login(page) {
  console.log("Going to Backstage homepage...");
  await page.goto("https://www.backstage.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.screenshot({ path: "scripts/bs-1-homepage.png" });

  // Click the "Sign in" button in the nav
  console.log("Clicking Sign in...");
  const signInBtn = page.locator('text="Sign in", text="Sign In", [href*="login"], a:has-text("Sign in")').first();
  await signInBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/bs-2-after-signin-click.png" });

  // At this point we might be on a login page or a modal appeared
  console.log("Current URL:", page.url());

  // Fill email — look for it in modal or page
  console.log("Filling email...");
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(EMAIL);
  await page.screenshot({ path: "scripts/bs-3-email-filled.png" });

  // Click Continue/Next if it's a 2-step flow
  const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Log In"), button:has-text("Sign In")').first();
  try {
    await continueBtn.waitFor({ timeout: 3000 });
    await continueBtn.click();
    console.log("Clicked Continue button");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "scripts/bs-4-after-continue.png" });
  } catch {
    // No separate continue step — might be single form
    console.log("No Continue button found, trying single-step form...");
  }

  // Fill password
  console.log("Filling password...");
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 10000 });
  await passwordInput.fill(PASSWORD);
  await page.screenshot({ path: "scripts/bs-5-password-filled.png" });

  // Submit
  console.log("Submitting login...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => page.waitForTimeout(3000)),
    page.keyboard.press("Enter"),
  ]);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/bs-6-after-login.png" });

  const url = page.url();
  console.log("URL after login:", url);

  // Check if still showing login UI
  const stillHasSignIn = await page.locator('text="Sign in"').count();
  if (stillHasSignIn > 0 && url.includes("login")) {
    throw new Error("Login appears to have failed. Check scripts/bs-6-after-login.png");
  }

  console.log("✓ Logged in!\n");
}

// ── Navigate to casting calls search ─────────────────────────────────────────
async function goToJobSearch(page) {
  // Try known Backstage search URLs
  const candidates = [
    "https://www.backstage.com/find-auditions-and-casting-calls/",
    "https://www.backstage.com/casting-calls/",
    "https://www.backstage.com/jobs/",
    "https://www.backstage.com/auditions/",
  ];

  for (const url of candidates) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    const current = page.url();
    // If we got a real page (not 404 and not redirected to login)
    if (!current.includes("/login") && !current.includes("/404") && !current.includes("shoot")) {
      console.log("Search page found at:", current);
      await page.screenshot({ path: "scripts/bs-7-search-page.png" });
      return true;
    }
  }

  // Fallback: click "Find Jobs" in nav
  console.log("Trying Find Jobs nav link...");
  await page.goto("https://www.backstage.com", { waitUntil: "domcontentloaded" });
  const findJobs = page.locator('text="Find Jobs", a:has-text("Find Jobs")').first();
  await findJobs.click();
  await page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: "scripts/bs-7-search-page.png" });
  console.log("Search page URL:", page.url());
  return true;
}

// ── Apply a filter via dropdown ───────────────────────────────────────────────
async function selectFilter(page, filterLabel, optionText) {
  try {
    // Find filter trigger by label text
    const triggers = [
      `button:has-text("${filterLabel}")`,
      `[aria-label*="${filterLabel}" i]`,
      `select[name*="${filterLabel.toLowerCase()}"]`,
      `label:has-text("${filterLabel}") + * select`,
    ];

    for (const sel of triggers) {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        await el.click();
        await page.waitForTimeout(500);

        // Now find and click the option
        const option = page.locator(`[role="option"]:has-text("${optionText}"), li:has-text("${optionText}"), option:has-text("${optionText}")`).first();
        const optCount = await option.count();
        if (optCount > 0) {
          await option.click();
          await page.waitForTimeout(800);
          return true;
        }
        // Close if didn't find option
        await page.keyboard.press("Escape");
      }
    }
  } catch (e) {
    // Filter not found — continue without it
  }
  return false;
}

// ── Scrape listings on current page ──────────────────────────────────────────
async function scrapeListings(page) {
  await page.waitForTimeout(2000);

  return page.evaluate(() => {
    const results = [];
    const SELECTORS = [
      '[class*="JobCard"]', '[class*="job-card"]',
      '[class*="ListingCard"]', '[class*="listing-card"]',
      '[class*="CastingCard"]', '[class*="casting-card"]',
      '[class*="AuditionCard"]', '[class*="audition-card"]',
      'article[class*="job"]', 'article[class*="listing"]',
      '[data-testid*="job"]', '[data-testid*="listing"]',
      'article',
    ];

    let cards = [];
    for (const sel of SELECTORS) {
      const found = document.querySelectorAll(sel);
      if (found.length >= 2) { cards = Array.from(found); break; }
    }

    const getText = (el, sels) => {
      for (const s of sels) {
        const found = el.querySelector(s);
        if (found?.textContent?.trim()) return found.textContent.trim();
      }
      return "";
    };

    for (const card of cards) {
      const title = getText(card, ["h2","h3","h4","[class*='title' i]","[class*='heading' i]"]);
      if (!title || title.length < 3) continue;

      const linkEl = card.querySelector("a[href]");
      const href   = linkEl?.getAttribute("href") || "";
      const link   = href.startsWith("http") ? href : href ? `https://www.backstage.com${href}` : "";

      results.push({
        id:          link || title,
        title,
        company:     getText(card, ["[class*='company' i]","[class*='brand' i]","[class*='producer' i]"]),
        location:    getText(card, ["[class*='location' i]","[class*='city' i]","[class*='region' i]"]),
        pay:         getText(card, ["[class*='pay' i]","[class*='rate' i]","[class*='compensation' i]","[class*='salary' i]"]),
        jobType:     getText(card, ["[class*='type' i]","[class*='category' i]","[class*='tag' i]"]),
        posted:      getText(card, ["time","[class*='date' i]","[class*='posted' i]","[datetime]"]),
        deadline:    getText(card, ["[class*='deadline' i]","[class*='expires' i]","[class*='due' i]"]),
        description: getText(card, ["[class*='description' i]","[class*='summary' i]","p"]).substring(0, 400),
        link,
      });
    }
    return results;
  });
}

// ── Run one search pass with given filters ────────────────────────────────────
async function runSearch(page, jobType, location, seen, allJobs) {
  const label = `${jobType} / ${location}`;
  console.log(`\nSearching: ${label}`);

  // Apply filters via UI
  await selectFilter(page, "Job Type", jobType);
  await selectFilter(page, "Category", jobType);
  await selectFilter(page, "Location", location);
  await selectFilter(page, "Gender", "Female");
  await selectFilter(page, "Age", "18");

  // Click Search/Apply if there's a button
  const searchBtn = page.locator('button:has-text("Search"), button:has-text("Apply"), button:has-text("Find")').first();
  if (await searchBtn.count() > 0) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => page.waitForTimeout(2000)),
      searchBtn.click(),
    ]);
  }

  await page.screenshot({ path: `scripts/bs-search-${jobType.replace(/ /g,"-")}-${location.replace(/ /g,"-")}.png` });

  let pageNum = 1;
  let localCount = 0;

  while (pageNum <= MAX_PAGES) {
    const listings = await scrapeListings(page);

    if (listings.length === 0) {
      if (pageNum === 1) console.log("  No listings found on page 1.");
      break;
    }

    for (const job of listings) {
      if (!seen.has(job.id)) {
        seen.add(job.id);
        allJobs.push({ ...job, _category: jobType, _location: location });
        localCount++;
      }
    }

    // Next page
    const nextBtn = page.locator('[aria-label="Next page"], a:has-text("Next"), button:has-text("Next")').first();
    if (await nextBtn.count() === 0) break;
    const disabled = await nextBtn.getAttribute("disabled");
    if (disabled !== null) break;

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => page.waitForTimeout(2000)),
      nextBtn.click(),
    ]);
    pageNum++;
  }

  console.log(`  → ${localCount} new listings`);
  await page.waitForTimeout(800);
}

// ── Save results ──────────────────────────────────────────────────────────────
function saveResults(allJobs) {
  const date   = new Date().toISOString().slice(0, 10);
  const json   = `scripts/backstage-jobs-${date}.json`;
  const md     = `scripts/backstage-jobs-${date}.md`;

  fs.writeFileSync(json, JSON.stringify(allJobs, null, 2));

  const byType = {};
  for (const job of allJobs) {
    const t = job._category || "Other";
    if (!byType[t]) byType[t] = [];
    byType[t].push(job);
  }

  const lines = [
    `# Backstage Opportunities — EXA Models`,
    `**Date:** ${date}  |  **Total:** ${allJobs.length} listings`,
    `**Filters:** Modeling + Content Creator | Female | Age 18–34 | NY, CA, FL, TX, AZ, Online\n`,
    "---\n",
  ];

  for (const [type, jobs] of Object.entries(byType)) {
    lines.push(`## ${type} (${jobs.length})\n`);
    for (const job of jobs) {
      lines.push(`### ${job.title}`);
      if (job.company)     lines.push(`**Company:** ${job.company}`);
      if (job.location)    lines.push(`**Location:** ${job.location}`);
      if (job.pay)         lines.push(`**Pay:** ${job.pay}`);
      if (job.posted)      lines.push(`**Posted:** ${job.posted}`);
      if (job.deadline)    lines.push(`**Deadline:** ${job.deadline}`);
      if (job.description) lines.push(`\n${job.description}`);
      if (job.link)        lines.push(`\n[View Listing](${job.link})`);
      lines.push("");
    }
  }

  fs.writeFileSync(md, lines.join("\n"));
  return { json, md };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log("🎬 Backstage Scraper — EXA Models");
  console.log("   Saving debug screenshots to scripts/bs-*.png\n");

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const seen = new Set();
  const allJobs = [];

  try {
    await login(page);
    await goToJobSearch(page);

    for (const jobType of ["Modeling", "Content Creator"]) {
      for (const location of ["New York", "California", "Florida", "Texas", "Arizona", "Online"]) {
        await runSearch(page, jobType, location, seen, allJobs);
      }
    }

    const { json, md } = saveResults(allJobs);
    console.log(`\n✅ Done! ${allJobs.length} listings`);
    console.log(`   Markdown: ${md}`);
    console.log(`   JSON:     ${json}`);

  } catch (err) {
    console.error("\n❌", err.message);
    await page.screenshot({ path: "scripts/bs-error.png" }).catch(() => {});
    console.error("   Screenshot: scripts/bs-error.png");
  } finally {
    await browser.close();
  }
}

run();
