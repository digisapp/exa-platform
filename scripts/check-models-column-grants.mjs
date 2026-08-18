#!/usr/bin/env node
/**
 * Phase B2 gate: find every non-service-client read of the models table that
 * references a column the authenticated-role grant flip will revoke.
 *
 * The planned authenticated GRANT = the anon set (see migration
 * 20260810000001) PLUS social handles. Everything else — names, email, phone,
 * DOB, payout/KYC, balances, ratings, tokens, internals — becomes unreadable
 * by client roles, so any query below that still references one of those
 * columns through the browser or cookie-scoped server client will 403 in
 * production the moment the migration runs.
 *
 * Usage: node scripts/check-models-column-grants.mjs
 * Exit 1 if violations are found. Regex-based: treat hits as leads to verify,
 * and re-run after every rewrite until clean.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const GRANTED_ANON = new Set([
  "id","user_id","username","display_name","bio","profile_photo_url",
  "profile_photo_width","profile_photo_height","city","state","show_location",
  "specialty","focus_tags","new_face","height","bust","waist","hips",
  "dress_size","shoe_size","eye_color","hair_color","show_measurements",
  "show_social_media","show_instagram_stats","show_links","show_additional_info",
  "show_booking_rates","show_on_rates_page","is_approved","is_verified",
  "is_featured","deactivated","deleted_at","claimed_at","created_at",
  "updated_at","last_active_at","reliability_score","profile_views",
  "instagram_followers","tiktok_followers","snapchat_followers","x_followers",
  "youtube_subscribers","instagram_engagement_rate","avg_instagram_impressions",
  "avg_tiktok_views","open_to_collabs","instagram_collab_rate",
  "tiktok_collab_rate","instagram_cpm","tiktok_cpm","photoshoot_hourly_rate",
  "photoshoot_half_day_rate","photoshoot_full_day_rate","promo_hourly_rate",
  "brand_ambassador_daily_rate","private_event_hourly_rate",
  "social_companion_hourly_rate","meet_greet_rate","travel_fee","rate_min",
  "rate_max","rate_type","message_rate","video_call_rate","voice_call_rate",
  "video_is_online","available_for_calls","allow_chat","allow_tips",
  "allow_video_call","allow_voice_call","availability_status","affiliate_code",
  "points_cached","level_cached",
]);
// authenticated additionally gets the signup-gated social handles
const GRANTED_AUTHENTICATED = new Set([
  ...GRANTED_ANON,
  "instagram_name","tiktok_username","snapchat_username","x_username",
  "youtube_username","twitch_username",
]);

const SERVICE_MARKERS = [
  "admin.",
  "(admin",
  "createServiceRoleClient",
  "adminClient",
  "adminDb",
  "serviceClient",
  "contentDb",
  "service.",
  "service\n",
  "(service",
  "svc.",
  "(svc",
  "(grid",
  "grid.",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      yield* walk(p);
    } else if (/\.(ts|tsx)$/.test(name) && !p.includes("types/database")) {
      yield p;
    }
  }
}

// Known regex-noise: the column scan window bleeds into an adjacent query on
// a DIFFERENT table (or a ternary select defeats the string match). Verified
// by hand — the models select at each site references only granted columns.
const NOISE_ALLOWLIST = [
  "src/app/api/shop/affiliate/route.ts",      // shop_affiliate_codes chain bleed
  "src/app/api/shop/model/[username]/route.ts", // ternary select (granted cols) + codes chain
  "src/components/wallet/AffiliateTab.tsx",   // shop_affiliate_codes chain bleed
  "src/app/(dashboard)/dashboard/FanDashboard.tsx", // auctions chain bleed; models selects verified granted-only
];

let violations = 0;
for (const file of walk("src")) {
  const src = readFileSync(file, "utf8");
  // Module-level `const <name> = createServiceRoleClient()` makes that name
  // service-backed everywhere in the file (e.g. crons aliasing it `supabase`).
  const fileAliases = [...src.matchAll(/const (\w+)(?::[^=]+)? = createServiceRoleClient\(\)/g)].map((m) => m[1]);
  let idx = 0;
  while ((idx = src.indexOf('.from("models")', idx)) !== -1) {
    // The client expression immediately precedes .from(...): scan back to the
    // start of the statement (await / = / return / ( boundary).
    const back = src.slice(Math.max(0, idx - 300), idx);
    const stmtTail = back.split(/\bawait\b|=\s|return\s/).pop() ?? back;
    // Conventional service-client variable names (module aliases, params like
    // `admin` in lib helpers) matched on word boundary — `await admin\n.from`
    // has no trailing dot, so substring markers alone miss it.
    const SERVICE_NAMES = ["admin", "adminDb", "adminClient", "service", "svc", "contentDb", "grid", ...fileAliases];
    const isService =
      SERVICE_MARKERS.some((m) => stmtTail.includes(m)) ||
      SERVICE_NAMES.some((a) => new RegExp("\\b" + a + "\\b").test(stmtTail));

    // Collect the .select("...") column list plus filter/order columns in the
    // chain that follows. The chain ends when parens are balanced AND the next
    // line is not a `.method()` continuation — a fixed window bled into
    // adjacent queries on other tables and produced false positives.
    const rest = src.slice(idx, Math.min(src.length, idx + 2000));
    const lines = rest.split("\n");
    let depth = 0;
    const kept = [];
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (li > 0 && depth <= 0 && !line.trim().startsWith(".")) break;
      kept.push(line);
      for (const ch of line) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
      }
    }
    const q = kept.join("\n");

    const cols = new Set();
    let star = false;
    const sel = q.match(/\.select\(\s*(["'`])([\s\S]*?)\1/);
    if (sel) {
      const body = sel[2];
      if (body.trim() === "*") star = true;
      for (const raw of body.split(",")) {
        const c = raw.trim().split(/[:(!\s]/)[0].trim();
        if (c && /^[a-z_]+$/.test(c)) cols.add(c);
      }
    }
    for (const m of q.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|not|contains|order)\(\s*["']([a-z_]+)["']/g)) {
      cols.add(m[1]);
    }

    if (!isService && !NOISE_ALLOWLIST.some((n) => file.endsWith(n) || file.includes(n))) {
      const bad = [...cols].filter((c) => !GRANTED_AUTHENTICATED.has(c));
      if (star || bad.length) {
        violations++;
        const line = src.slice(0, idx).split("\n").length;
        console.log(
          `${file}:${line} ${star ? 'select("*")' : ""} ${bad.length ? "ungranted: " + bad.join(", ") : ""}`.trim()
        );
      }
    }
    idx += 10;
  }
}

console.log(violations ? `\n${violations} violation(s)` : "clean — no client-role models reads reference revoked columns");
process.exit(violations ? 1 : 0);
