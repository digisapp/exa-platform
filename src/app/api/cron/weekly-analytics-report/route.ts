import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { MODEL_EARNING_ACTIONS, COIN_USD_RATE } from "@/lib/coin-config";

// GET /api/cron/weekly-analytics-report — owner-facing weekly analytics email.
//
// One email to REPORT_RECIPIENT every Monday with the last 7 days vs the 7
// days before: traffic, signups (with signup_source breakdown), the social
// gate funnel (taps → signups), coin revenue by action, and top models by
// profile views. Plus the model-activation north star, as-of-now: the
// claimed → visible → active → earning funnel and "first $1 within 14 days
// of approval" by weekly approval cohort. Also as-of-now: open booking
// leads (status new/contacted, oldest first) so the sales pipeline is in
// front of the owner weekly. This is an internal report — no
// unsubscribe/suppression machinery on purpose.
//
// ?dryRun=1 returns the computed stats as JSON without sending.

export const maxDuration = 300;

const REPORT_RECIPIENT = "nathan@examodels.com";
const FROM_EMAIL = "EXA Models <noreply@examodels.com>";

const adminClient: any = createServiceRoleClient();

type Window = { since: string; until: string };

function lastNDays(days: number, endOffsetDays = 0): Window {
  const until = new Date();
  until.setUTCDate(until.getUTCDate() - endOffsetDays);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - days);
  return { since: since.toISOString(), until: until.toISOString() };
}

async function countRows(table: string, w: Window, extra?: (q: any) => any): Promise<number> {
  let q = adminClient
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", w.since)
    .lt("created_at", w.until);
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) {
    logger.error(`weekly-analytics-report: count ${table} failed`, undefined, { message: error.message });
    return 0;
  }
  return count || 0;
}

// Distinct visitor count. page_views is modest (90-day retention, small site)
// so paging id+visitor_id through in chunks is fine at current scale.
async function uniqueVisitors(w: Window): Promise<number> {
  const visitors = new Set<string>();
  const PAGE = 1000;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await adminClient
      .from("page_views")
      .select("visitor_id")
      .gte("created_at", w.since)
      .lt("created_at", w.until)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error || !data?.length) break;
    for (const row of data) if (row.visitor_id) visitors.add(row.visitor_id);
    if (data.length < PAGE) break;
  }
  return visitors.size;
}

async function topModelsByViews(w: Window, limit = 5): Promise<{ username: string; views: number }[]> {
  const counts = new Map<string, number>();
  const PAGE = 1000;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await adminClient
      .from("page_views")
      .select("model_username")
      .eq("page_type", "profile")
      .not("model_username", "is", null)
      .gte("created_at", w.since)
      .lt("created_at", w.until)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error || !data?.length) break;
    for (const row of data) {
      counts.set(row.model_username, (counts.get(row.model_username) || 0) + 1);
    }
    if (data.length < PAGE) break;
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([username, views]) => ({ username, views }));
}

async function coinTotalsByAction(w: Window): Promise<Map<string, { coins: number; count: number }>> {
  const totals = new Map<string, { coins: number; count: number }>();
  const PAGE = 1000;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await adminClient
      .from("coin_transactions")
      .select("action, amount")
      .gte("created_at", w.since)
      .lt("created_at", w.until)
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error || !data?.length) break;
    for (const row of data) {
      const t = totals.get(row.action) || { coins: 0, count: 0 };
      t.coins += row.amount;
      t.count += 1;
      totals.set(row.action, t);
    }
    if (data.length < PAGE) break;
  }
  return totals;
}

async function gatherStats(w: Window) {
  const [
    pageViews,
    visitors,
    profileViews,
    newFans,
    newModels,
    gateClicks,
    topModels,
    coinTotals,
    signupSources,
  ] = await Promise.all([
    countRows("page_views", w),
    uniqueVisitors(w),
    countRows("page_views", w, (q) => q.eq("page_type", "profile")),
    countRows("fans", w),
    countRows("models", w, (q) => q.not("user_id", "is", null)),
    countRows("analytics_events", w, (q) => q.eq("event_name", "social_gate_click")),
    topModelsByViews(w),
    coinTotalsByAction(w),
    adminClient
      .rpc("get_fan_signup_source_counts", { p_since: w.since, p_until: w.until })
      .then(({ data, error }: any) => {
        if (error) {
          logger.error("weekly-analytics-report: signup sources failed", undefined, { message: error.message });
          return [] as { source: string; signups: number }[];
        }
        return (data || []) as { source: string; signups: number }[];
      }),
  ]);

  const purchased = coinTotals.get("purchase") || { coins: 0, count: 0 };
  const revenueUsd = (purchased.coins * 0.1).toFixed(2); // 1 coin = $0.10

  return {
    pageViews,
    visitors,
    profileViews,
    newFans,
    newModels,
    gateClicks,
    topModels,
    signupSources,
    coinsPurchased: purchased.coins,
    purchaseCount: purchased.count,
    revenueUsd,
    coinActions: [...coinTotals.entries()].map(([action, t]) => ({ action, ...t })),
  };
}

type Stats = Awaited<ReturnType<typeof gatherStats>>;

// ─── Model activation (north star: first $1 within 14 days of approval) ──
//
// Computed in TypeScript from paged service-role reads instead of a new
// SECURITY DEFINER SQL function — deliberate after the
// convert_model_wallet_to_fan plpgsql incident (shipped broken for 6 days;
// plpgsql doesn't validate table refs at CREATE). Every step here is
// eyeballable and ?dryRun=1-verifiable, and MODEL_EARNING_ACTIONS is
// imported straight from coin-config.ts so the earning definition can never
// drift from the ledger convention. Volumes are small (~1.4k claimed
// models, earning ledger rows in the hundreds), so paging everything
// through PostgREST is a handful of requests.

const DAY_MS = 86_400_000;
// $1 of model earnings at the model-side rate (1 coin = $0.10) = 10 coins
const FIRST_DOLLAR_COINS = Math.ceil(1 / COIN_USD_RATE);
const COHORT_WEEKS = 8; // current approval week + 7 prior

/**
 * Page a PostgREST query to completion. Throws on any batch error so a
 * partial fetch can never masquerade as a real total — PostgREST max_rows
 * is 1000 and silently truncates un-paged selects, and a swallowed batch
 * error would deflate every funnel number below it.
 */
async function fetchAllRows(build: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 200; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/** UTC Monday 00:00 of the week containing the given ms timestamp. */
function weekStartMs(ms: number): number {
  const d = new Date(ms);
  const mondayOffset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

type ActivationStats = {
  funnel: {
    claimed: number;
    visible: number;
    active7d: number;
    active30d: number;
    earnedAny30d: number;
    payoutSetup: number;
  };
  cohorts: {
    week: string; // Monday (UTC) of the approval week, YYYY-MM-DD
    approved: number;
    firstDollar14d: number;
    medianHoursToFirstEarn: number | null;
    matured: boolean; // every model in the cohort has had a full 14-day window
  }[];
  overall: {
    approved: number;
    firstDollar14d: number;
    medianHoursToFirstEarn: number | null;
  };
};

async function gatherActivationStats(): Promise<ActivationStats> {
  const nowMs = Date.now();
  const oldestCohortStartMs = weekStartMs(nowMs) - (COHORT_WEEKS - 1) * 7 * DAY_MS;
  // Cohort models can't have material earnings before their approval anchor
  // (earning surfaces require an approved, visible profile), so fetching the
  // ledger from the oldest cohort week bounds the scan without losing
  // first-dollar accuracy. This window is ≥ 8 weeks, so it also covers the
  // 30-day "earned anything" check.
  const earnSinceIso = new Date(oldestCohortStartMs).toISOString();

  const [modelRows, approvedApps, zelleRows, bankRows, payoneerRows, earnRows] =
    await Promise.all([
      // Claimed roster only — the ~4.4k unclaimed Sheets-import rows are
      // leads, not models, and must never appear in activation stats.
      fetchAllRows((from, to) =>
        adminClient
          .from("models")
          .select("id, user_id, is_approved, profile_photo_url, last_active_at, claimed_at")
          .not("user_id", "is", null)
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .range(from, to)
      ),
      // Approval timestamp source of truth: model_applications.reviewed_at,
      // written at status='approved' in src/lib/model-approval.ts. Models
      // approved outside the application flow fall back to claimed_at below.
      fetchAllRows((from, to) =>
        adminClient
          .from("model_applications")
          .select("user_id, reviewed_at")
          .eq("status", "approved")
          .not("reviewed_at", "is", null)
          .order("id", { ascending: true })
          .range(from, to)
      ),
      // id-only on purpose: zelle_info is payout PII, non-emptiness is all we
      // need here.
      fetchAllRows((from, to) =>
        adminClient
          .from("models")
          .select("id")
          .not("user_id", "is", null)
          .is("deleted_at", null)
          .not("zelle_info", "is", null)
          .neq("zelle_info", "")
          .order("id", { ascending: true })
          .range(from, to)
      ),
      // Any saved bank account counts as a payout method (verification is a
      // separate step) — matches the dashboard's zelle-OR-bank-OR-payoneer
      // needsPayoutMethod definition.
      fetchAllRows((from, to) =>
        adminClient
          .from("bank_accounts")
          .select("model_id")
          .order("id", { ascending: true })
          .range(from, to)
      ),
      // Payoneer counts only once registration actually completed — a
      // generated registration link the model never finished isn't a payout
      // method.
      fetchAllRows((from, to) =>
        adminClient
          .from("payoneer_accounts")
          .select("model_id")
          .or("registration_completed_at.not.is.null,can_receive_payments.eq.true")
          .order("id", { ascending: true })
          .range(from, to)
      ),
      // Model earning rows per the ledger convention: MODEL_EARNING_ACTIONS
      // with no amount filter (clawback reversals net out of the running
      // sum). These are the credit-side actions, so the double-entry ledger
      // is not double-counted.
      fetchAllRows((from, to) =>
        adminClient
          .from("coin_transactions")
          .select("actor_id, amount, created_at")
          .in("action", [...MODEL_EARNING_ACTIONS])
          .gte("created_at", earnSinceIso)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
      ),
    ]);

  // ── Funnel (as-of-now snapshot) ──
  const claimedIds = new Set<string>(modelRows.map((m: any) => m.id));
  const claimed = modelRows.length;
  // "Visible" matches the public /models grid: approved + profile photo.
  const visible = modelRows.filter((m: any) => m.is_approved && m.profile_photo_url).length;
  const activeSince = (days: number) =>
    modelRows.filter(
      (m: any) =>
        m.is_approved &&
        m.last_active_at &&
        new Date(m.last_active_at).getTime() >= nowMs - days * DAY_MS
    ).length;
  const active7d = activeSince(7);
  const active30d = activeSince(30);

  // Earned anything in 30d = net earning-action coins > 0 in the window
  // (a lone clawback reversal must not count as "earned").
  const cutoff30dMs = nowMs - 30 * DAY_MS;
  const net30d = new Map<string, number>();
  for (const r of earnRows as any[]) {
    if (new Date(r.created_at).getTime() >= cutoff30dMs) {
      net30d.set(r.actor_id, (net30d.get(r.actor_id) || 0) + r.amount);
    }
  }
  let earnedAny30d = 0;
  for (const [actorId, net] of net30d) {
    if (net > 0 && claimedIds.has(actorId)) earnedAny30d++;
  }

  // Payout method on file = zelle OR bank OR completed Payoneer.
  const payoutIds = new Set<string>();
  for (const r of zelleRows as any[]) payoutIds.add(r.id);
  for (const r of bankRows as any[]) payoutIds.add(r.model_id);
  for (const r of payoneerRows as any[]) payoutIds.add(r.model_id);
  let payoutSetup = 0;
  for (const id of payoutIds) if (claimedIds.has(id)) payoutSetup++;

  // ── First-dollar cohorts ──
  // Earliest approved reviewed_at per user (a user can, rarely, have more
  // than one approved application — first approval wins).
  const reviewedAtByUser = new Map<string, number>();
  for (const a of approvedApps as any[]) {
    const t = new Date(a.reviewed_at).getTime();
    const prev = reviewedAtByUser.get(a.user_id);
    if (prev === undefined || t < prev) reviewedAtByUser.set(a.user_id, t);
  }

  // First positive earn + first time net cumulative earnings cross $1,
  // per actor, in ledger order.
  const firstEarnAtMs = new Map<string, number>();
  const firstDollarAtMs = new Map<string, number>();
  const running = new Map<string, number>();
  for (const r of earnRows as any[]) {
    const t = new Date(r.created_at).getTime();
    const net = (running.get(r.actor_id) || 0) + r.amount;
    running.set(r.actor_id, net);
    if (r.amount > 0 && !firstEarnAtMs.has(r.actor_id)) firstEarnAtMs.set(r.actor_id, t);
    if (net >= FIRST_DOLLAR_COINS && !firstDollarAtMs.has(r.actor_id)) {
      firstDollarAtMs.set(r.actor_id, t);
    }
  }

  const cohortMap = new Map<
    number,
    { approved: number; firstDollar14d: number; hoursToFirstEarn: number[] }
  >();
  const allHoursToFirstEarn: number[] = [];
  let overallApproved = 0;
  let overallFirstDollar14d = 0;

  for (const m of modelRows as any[]) {
    if (!m.is_approved) continue;
    const anchorMs =
      reviewedAtByUser.get(m.user_id) ??
      (m.claimed_at ? new Date(m.claimed_at).getTime() : undefined);
    // Models with neither an approved application nor claimed_at (approved
    // via one-off admin paths) have no usable approval timestamp — excluded
    // from cohorts, still counted in the funnel above.
    if (anchorMs === undefined || anchorMs < oldestCohortStartMs || anchorMs > nowMs) continue;

    const week = weekStartMs(anchorMs);
    const cohort = cohortMap.get(week) || { approved: 0, firstDollar14d: 0, hoursToFirstEarn: [] };
    cohort.approved++;
    overallApproved++;

    const dollarAt = firstDollarAtMs.get(m.id);
    if (dollarAt !== undefined && dollarAt <= anchorMs + 14 * DAY_MS) {
      cohort.firstDollar14d++;
      overallFirstDollar14d++;
    }
    const earnAt = firstEarnAtMs.get(m.id);
    if (earnAt !== undefined) {
      const hours = Math.max(0, (earnAt - anchorMs) / 3_600_000);
      cohort.hoursToFirstEarn.push(hours);
      allHoursToFirstEarn.push(hours);
    }
    cohortMap.set(week, cohort);
  }

  const cohorts = [...cohortMap.entries()]
    .sort((a, b) => b[0] - a[0]) // newest week first
    .map(([week, c]) => ({
      week: new Date(week).toISOString().slice(0, 10),
      approved: c.approved,
      firstDollar14d: c.firstDollar14d,
      medianHoursToFirstEarn: median(c.hoursToFirstEarn),
      // Cohort week ends at +7d; every member has a full window at +21d.
      matured: week + 21 * DAY_MS <= nowMs,
    }));

  return {
    funnel: { claimed, visible, active7d, active30d, earnedAny30d, payoutSetup },
    cohorts,
    overall: {
      approved: overallApproved,
      firstDollar14d: overallFirstDollar14d,
      medianHoursToFirstEarn: median(allHoursToFirstEarn),
    },
  };
}

// ─── Open leads (booking pipeline, as-of-now) ──
//
// Surfaces every booking inquiry still in `new` or `contacted` so leads
// can't silently rot in /admin/booking-inquiries between visits. Oldest
// first: the most-rotted lead is the one to act on.

type OpenLeads = {
  inquiries: {
    name: string;
    company: string | null;
    email: string;
    inquiry_type: string;
    budget_range: string | null;
    model_username: string | null;
    status: string;
    created_at: string;
  }[];
  openTotal: number;
  tourNew: number;
};

const BUDGET_LABELS: Record<string, string> = {
  under_1k: "<$1k",
  "1k_5k": "$1–5k",
  "5k_15k": "$5–15k",
  "15k_plus": "$15k+",
  discuss: "budget TBD",
};

async function gatherOpenLeads(): Promise<OpenLeads> {
  const [listRes, countRes, tourRes] = await Promise.all([
    adminClient
      .from("booking_inquiries")
      .select("name, company, email, inquiry_type, budget_range, model_username, status, created_at")
      .in("status", ["new", "contacted"])
      .order("created_at", { ascending: true })
      .limit(10),
    adminClient
      .from("booking_inquiries")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "contacted"]),
    adminClient
      .from("tour_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);
  if (listRes.error) throw new Error(listRes.error.message);
  if (countRes.error) throw new Error(countRes.error.message);
  if (tourRes.error) throw new Error(tourRes.error.message);
  return {
    inquiries: listRes.data || [],
    openTotal: countRes.count || 0,
    tourNew: tourRes.count || 0,
  };
}

function fmtHours(h: number): string {
  if (h < 1) return "<1h";
  if (h < 48) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function delta(cur: number, prev: number): string {
  if (prev === 0) return cur > 0 ? "new" : "—";
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmailHtml(
  cur: Stats,
  prev: Stats,
  weekLabel: string,
  activation: ActivationStats | null,
  leads: OpenLeads | null
): string {
  const row = (label: string, value: string | number, wow: string) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #2d1b4e;color:#c4b5fd;">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #2d1b4e;color:#ffffff;font-weight:600;text-align:right;">${value}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #2d1b4e;color:#a78bfa;text-align:right;">${wow}</td>
    </tr>`;

  const gateSignups =
    cur.signupSources.find((s: { source: string }) => s.source === "social_gate")?.signups ?? 0;
  const gateConversion =
    cur.gateClicks > 0 ? `${Math.round((Number(gateSignups) / cur.gateClicks) * 100)}%` : "—";

  const sourceRows = cur.signupSources
    .map(
      (s: { source: string; signups: number }) =>
        `<tr><td style="padding:6px 14px;color:#c4b5fd;">${esc(s.source)}</td><td style="padding:6px 14px;color:#fff;text-align:right;">${s.signups}</td></tr>`
    )
    .join("") || `<tr><td style="padding:6px 14px;color:#c4b5fd;">no fan signups this week</td><td></td></tr>`;

  const topModelRows = cur.topModels
    .map(
      (m, i) =>
        `<tr><td style="padding:6px 14px;color:#c4b5fd;">${i + 1}. @${esc(m.username)}</td><td style="padding:6px 14px;color:#fff;text-align:right;">${m.views} views</td></tr>`
    )
    .join("") || `<tr><td style="padding:6px 14px;color:#c4b5fd;">no profile views recorded</td><td></td></tr>`;

  // Ledger is double-entry (message_sent -N pairs with message_received +N);
  // show only the debit side so activity isn't double-listed.
  const spendRows = cur.coinActions
    .filter((a) => a.action !== "purchase" && a.coins < 0)
    .sort((a, b) => Math.abs(b.coins) - Math.abs(a.coins))
    .slice(0, 8)
    .map(
      (a) =>
        `<tr><td style="padding:6px 14px;color:#c4b5fd;">${esc(a.action)}</td><td style="padding:6px 14px;color:#fff;text-align:right;">${Math.abs(a.coins).toLocaleString()} coins · ${a.count}x</td></tr>`
    )
    .join("") || `<tr><td style="padding:6px 14px;color:#c4b5fd;">no coin activity</td><td></td></tr>`;

  const leadRows = leads
    ? leads.inquiries
        .map((l) => {
          const ageDays = Math.max(
            0,
            Math.floor((Date.now() - new Date(l.created_at).getTime()) / DAY_MS)
          );
          const who = `${esc(l.name)}${l.company ? ` · ${esc(l.company)}` : ""}`;
          const detail = [
            esc(l.inquiry_type),
            l.budget_range ? BUDGET_LABELS[l.budget_range] || esc(l.budget_range) : null,
            l.model_username ? `@${esc(l.model_username)}` : "general",
          ]
            .filter(Boolean)
            .join(" · ");
          const status =
            l.status === "new"
              ? `<span style="color:#f9a8d4;font-weight:600;">new</span>`
              : `<span style="color:#a78bfa;">contacted</span>`;
          return `<tr><td style="padding:6px 14px;color:#c4b5fd;">${who}<br><span style="color:#6d5b95;font-size:12px;">${esc(l.email)}</span></td><td style="padding:6px 14px;color:#fff;text-align:right;font-size:13px;">${detail}<br>${status} · ${ageDays}d old</td></tr>`;
        })
        .join("") +
      (leads.openTotal > leads.inquiries.length
        ? `<tr><td style="padding:6px 14px;color:#c4b5fd;" colspan="2">…and ${leads.openTotal - leads.inquiries.length} more at /admin/booking-inquiries</td></tr>`
        : "") +
      (leads.inquiries.length === 0
        ? `<tr><td style="padding:6px 14px;color:#c4b5fd;">no open booking leads — pipeline clear</td><td></td></tr>`
        : "") +
      `<tr><td style="padding:6px 14px;color:#c4b5fd;">Tour applications awaiting reply</td><td style="padding:6px 14px;color:#fff;text-align:right;">${leads.tourNew}</td></tr>`
    : `<tr><td style="padding:6px 14px;color:#c4b5fd;">lead stats unavailable this week (see logs)</td><td></td></tr>`;

  const section = (title: string, inner: string) => `
    <h2 style="margin:28px 0 8px;font-size:15px;color:#f9a8d4;letter-spacing:0.06em;text-transform:uppercase;">${title}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0f2e;border:1px solid #2d1b4e;border-radius:12px;overflow:hidden;">${inner}</table>`;

  // Model activation: as-of-now snapshot (no week-over-week column — these
  // are roster totals, not windowed counts).
  const overallDollarRate =
    activation && activation.overall.approved > 0
      ? `${Math.round((activation.overall.firstDollar14d / activation.overall.approved) * 100)}%`
      : "—";
  const activationFunnelRows = activation
    ? row("Claimed models", activation.funnel.claimed.toLocaleString(), "") +
      row("→ Visible (approved + photo)", activation.funnel.visible.toLocaleString(), "") +
      row("→ Active · 7d", activation.funnel.active7d.toLocaleString(), "") +
      row("→ Active · 30d", activation.funnel.active30d.toLocaleString(), "") +
      row("→ Earned anything · 30d", activation.funnel.earnedAny30d.toLocaleString(), "") +
      row("Payout method on file", activation.funnel.payoutSetup.toLocaleString(), "") +
      row(
        "First $1 ≤ 14d of approval (8-wk)",
        `${activation.overall.firstDollar14d}/${activation.overall.approved}`,
        overallDollarRate
      ) +
      row(
        "Median time to first earn",
        activation.overall.medianHoursToFirstEarn !== null
          ? fmtHours(activation.overall.medianHoursToFirstEarn)
          : "—",
        ""
      )
    : `<tr><td style="padding:6px 14px;color:#c4b5fd;">activation stats unavailable this week (see logs)</td><td></td></tr>`;

  const cohortRows = activation
    ? activation.cohorts
        .map((c) => {
          const rate = c.approved > 0 ? `${Math.round((c.firstDollar14d / c.approved) * 100)}%` : "—";
          const med =
            c.medianHoursToFirstEarn !== null
              ? ` · med first earn ${fmtHours(c.medianHoursToFirstEarn)}`
              : "";
          const maturing = c.matured ? "" : " · maturing";
          return `<tr><td style="padding:6px 14px;color:#c4b5fd;">wk of ${c.week}</td><td style="padding:6px 14px;color:#fff;text-align:right;">${c.firstDollar14d}/${c.approved} · ${rate}${med}${maturing}</td></tr>`;
        })
        .join("") ||
      `<tr><td style="padding:6px 14px;color:#c4b5fd;">no approvals in the last 8 weeks</td><td></td></tr>`
    : "";

  return `
  <div style="background:#0d0618;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;">
      <h1 style="margin:0 0 4px;font-size:22px;color:#ffffff;">EXA Weekly Analytics</h1>
      <p style="margin:0 0 20px;color:#a78bfa;font-size:13px;">${weekLabel} · vs previous 7 days</p>

      ${section(
        "Traffic",
        row("Page views", cur.pageViews.toLocaleString(), delta(cur.pageViews, prev.pageViews)) +
        row("Unique visitors", cur.visitors.toLocaleString(), delta(cur.visitors, prev.visitors)) +
        row("Model profile views", cur.profileViews.toLocaleString(), delta(cur.profileViews, prev.profileViews))
      )}

      ${section(
        "Signups",
        row("New fans", cur.newFans, delta(cur.newFans, prev.newFans)) +
        row("New claimed models", cur.newModels, delta(cur.newModels, prev.newModels))
      )}

      ${section("Fan signups by source", sourceRows)}

      ${section(
        "Social gate funnel",
        row("Locked-socials taps", cur.gateClicks, delta(cur.gateClicks, prev.gateClicks)) +
        row("→ signups (social_gate)", String(gateSignups), "") +
        row("→ tap-to-signup rate", gateConversion, "")
      )}

      ${section(
        "Money",
        row("Coins purchased", cur.coinsPurchased.toLocaleString(), delta(cur.coinsPurchased, prev.coinsPurchased)) +
        row("≈ Revenue", `$${cur.revenueUsd}`, "") +
        row("Purchases", cur.purchaseCount, delta(cur.purchaseCount, prev.purchaseCount))
      )}

      ${section(
        `Open leads${leads && leads.openTotal > 0 ? ` (${leads.openTotal})` : ""}`,
        leadRows
      )}

      ${section("Model activation", activationFunnelRows)}

      ${activation ? section("First $1 within 14d, by approval week", cohortRows) : ""}

      ${section("Coin activity (spend)", spendRows)}

      ${section("Top models by profile views", topModelRows)}

      <p style="margin:24px 0 0;color:#6d5b95;font-size:12px;">
        Automated report · examodels.com · full dashboards at /admin/traffic
      </p>
    </div>
  </div>`;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

    const curWindow = lastNDays(7);
    const prevWindow = lastNDays(7, 7);
    const [cur, prev, activation, openLeads] = await Promise.all([
      gatherStats(curWindow),
      gatherStats(prevWindow),
      // Activation stats must never sink the whole report — on failure the
      // email ships with an "unavailable" note in that section instead.
      gatherActivationStats().catch((e: unknown): ActivationStats | null => {
        logger.error("weekly-analytics-report: activation stats failed", undefined, {
          message: e instanceof Error ? e.message : String(e),
        });
        return null;
      }),
      // Same degradation contract as activation.
      gatherOpenLeads().catch((e: unknown): OpenLeads | null => {
        logger.error("weekly-analytics-report: open leads failed", undefined, {
          message: e instanceof Error ? e.message : String(e),
        });
        return null;
      }),
    ]);

    const weekLabel = `${curWindow.since.slice(0, 10)} → ${curWindow.until.slice(0, 10)}`;

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        weekLabel,
        current: cur,
        previous: prev,
        activation,
        openLeads,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: REPORT_RECIPIENT,
      subject: `EXA weekly: ${cur.newFans} fans, $${cur.revenueUsd}, ${cur.pageViews.toLocaleString()} views`,
      html: buildEmailHtml(cur, prev, weekLabel, activation, openLeads),
    });

    if (error) {
      logger.error("weekly-analytics-report: send failed", undefined, { message: error.message });
      return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }

    logger.info("weekly-analytics-report sent", { to: REPORT_RECIPIENT, weekLabel });
    return NextResponse.json({ success: true, weekLabel });
  } catch (error) {
    logger.error("weekly-analytics-report error", error);
    return NextResponse.json({ error: "Failed to build report" }, { status: 500 });
  }
}
