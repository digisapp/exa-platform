import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

// GET /api/cron/weekly-analytics-report — owner-facing weekly analytics email.
//
// One email to REPORT_RECIPIENT every Monday with the last 7 days vs the 7
// days before: traffic, signups (with signup_source breakdown), the social
// gate funnel (taps → signups), coin revenue by action, and top models by
// profile views. This is an internal report — no unsubscribe/suppression
// machinery on purpose.
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

function delta(cur: number, prev: number): string {
  if (prev === 0) return cur > 0 ? "new" : "—";
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmailHtml(cur: Stats, prev: Stats, weekLabel: string): string {
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

  const section = (title: string, inner: string) => `
    <h2 style="margin:28px 0 8px;font-size:15px;color:#f9a8d4;letter-spacing:0.06em;text-transform:uppercase;">${title}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0f2e;border:1px solid #2d1b4e;border-radius:12px;overflow:hidden;">${inner}</table>`;

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
    const [cur, prev] = await Promise.all([gatherStats(curWindow), gatherStats(prevWindow)]);

    const weekLabel = `${curWindow.since.slice(0, 10)} → ${curWindow.until.slice(0, 10)}`;

    if (dryRun) {
      return NextResponse.json({ dryRun: true, weekLabel, current: cur, previous: prev });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: REPORT_RECIPIENT,
      subject: `EXA weekly: ${cur.newFans} fans, $${cur.revenueUsd}, ${cur.pageViews.toLocaleString()} views`,
      html: buildEmailHtml(cur, prev, weekLabel),
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
