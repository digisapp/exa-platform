import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import {
  Eye,
  Users,
  UserPlus,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  ExternalLink,
  QrCode,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { QRCodeDownloadButton } from "@/components/profile/QRCodeDownloadButton";
import { DailyViewsChart } from "@/components/analytics/DailyViewsChart";
import { logger } from "@/lib/logger";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics | EXA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Percent change vs the previous window; null when there's no baseline
function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  trend,
  href,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  gradient: string;
  trend?: number | null;
  href?: string;
}) {
  const card = (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-5">
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient} pointer-events-none`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          {trend !== null && trend !== undefined && (
            <span
              className={`text-[11px] font-semibold tabular-nums rounded-full px-2 py-0.5 border ${
                trend >= 0
                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                  : "text-rose-400 border-rose-500/20 bg-rose-500/10"
              }`}
              title="vs previous 30 days"
            >
              {trend >= 0 ? "+" : ""}
              {trend}%
            </span>
          )}
        </div>
        <p className="text-2xl font-black tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform hover:scale-[1.02]">
        {card}
      </Link>
    );
  }
  return card;
}

function CardErrorNote() {
  return (
    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70" />
      Couldn&apos;t load this data
    </p>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor) redirect("/signin");
  if (actor.type !== "model" && actor.type !== "admin") redirect("/dashboard");

  const { data: model } = await supabase
    .from("models")
    .select("id, username, profile_views")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/dashboard");

  // Use RPC functions for database-level aggregation (instead of loading all rows)
  const serviceClient = createServiceRoleClient();

  const now = Date.now();
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff60d = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: statsData, error: statsError },
    { data: dailyRaw, error: dailyError },
    { data: devicesRaw, error: devicesError },
    { data: countriesRaw, error: countriesError },
    { data: sourcesRaw, error: sourcesError },
    { count: newFollowers30d, error: followersError },
    { count: prevFollowers30d },
  ] = await Promise.all([
    serviceClient.rpc("get_analytics_stats", { p_model_id: model.id }),
    serviceClient.rpc("get_analytics_daily", { p_model_id: model.id }),
    serviceClient.rpc("get_analytics_devices", { p_model_id: model.id }),
    serviceClient.rpc("get_analytics_countries", { p_model_id: model.id }),
    serviceClient.rpc("get_analytics_sources", { p_model_id: model.id }),
    serviceClient
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", actor.id)
      .gte("created_at", cutoff30d),
    serviceClient
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", actor.id)
      .gte("created_at", cutoff60d)
      .lt("created_at", cutoff30d),
  ]);

  for (const [name, error] of [
    ["get_analytics_stats", statsError],
    ["get_analytics_daily", dailyError],
    ["get_analytics_devices", devicesError],
    ["get_analytics_countries", countriesError],
    ["get_analytics_sources", sourcesError],
    ["follows count", followersError],
  ] as const) {
    if (error) logger.error(`Analytics RPC failed: ${name}`, undefined, { message: error.message });
  }

  const stats = statsData?.[0] || {
    total_views_30d: 0,
    unique_visitors_30d: 0,
    today_views: 0,
    prev_views_30d: 0,
    prev_unique_30d: 0,
  };
  const totalViews30d = Number(stats.total_views_30d) || 0;
  const uniqueVisitors = Number(stats.unique_visitors_30d) || 0;
  const todayViews = Number(stats.today_views) || 0;
  const viewsTrend = trendPct(totalViews30d, Number(stats.prev_views_30d) || 0);
  const uniqueTrend = trendPct(uniqueVisitors, Number(stats.prev_unique_30d) || 0);
  const followersTrend = trendPct(newFollowers30d || 0, prevFollowers30d || 0);

  // Daily chart data (already filled with 0s by the RPC)
  const dailyData: { date: string; views: number }[] = (dailyRaw || []).map(
    (d: { day: string; views: number }) => ({ date: d.day, views: Number(d.views) || 0 })
  );

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  (devicesRaw || []).forEach((d: { device: string; views: number }) => {
    deviceMap[d.device] = Number(d.views) || 0;
  });
  const deviceTotal = Object.values(deviceMap).reduce((sum, n) => sum + n, 0);
  const otherDevices = deviceTotal - ((deviceMap.mobile || 0) + (deviceMap.desktop || 0) + (deviceMap.tablet || 0));

  // Top countries (already sorted and limited by RPC)
  const topCountries: [string, number][] = (countriesRaw || []).map(
    (c: { country: string; views: number }) => [c.country, Number(c.views) || 0] as [string, number]
  );
  const countryTotal = topCountries.reduce((sum, [, n]) => sum + n, 0);

  // Top sources (already sorted and limited by RPC); drop internal referrers from historical rows
  const isInternalSource = (source: string) => {
    const s = source.toLowerCase();
    return s.includes("examodels.com") || s.endsWith(".vercel.app") || s.startsWith("localhost");
  };
  const topSources: [string, number][] = (sourcesRaw || [])
    .map((s: { source: string; views: number }) => [s.source, Number(s.views) || 0] as [string, number])
    .filter(([source]) => !isInternalSource(source));
  const sourceTotal = topSources.reduce((sum, [, n]) => sum + n, 0);

  const hasData = totalViews30d > 0;

  // Generate QR code for the profile URL — tagged so scans show up as
  // "QR Code" in Traffic Sources instead of Direct
  const profileUrl = `https://www.examodels.com/${model.username}?utm_source=qr`;
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    width: 512,
    margin: 2,
    color: { dark: "#09090b", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-pink-500" />
            Profile Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track who&apos;s visiting your profile at{" "}
            {model.username && (
              <Link
                href={`/${model.username}`}
                target="_blank"
                className="text-pink-500 hover:text-pink-400 inline-flex items-center gap-0.5"
              >
                examodels.com/{model.username}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground bg-white/5 border border-white/10 rounded-full px-3 py-1">
          Last 30 days
        </span>
      </div>

      {/* Stats grid */}
      {statsError ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Analytics is temporarily unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">
              We couldn&apos;t load your view stats right now. Your data is safe — try refreshing in a minute.
            </p>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Profile Views"
          value={totalViews30d}
          sub="Last 30 days"
          icon={Eye}
          gradient="from-pink-500 to-rose-600"
          trend={viewsTrend}
        />
        <StatCard
          label="Unique Visitors"
          value={uniqueVisitors}
          sub="Last 30 days"
          icon={Users}
          gradient="from-violet-500 to-purple-600"
          trend={uniqueTrend}
        />
        <StatCard
          label="New Followers"
          value={newFollowers30d || 0}
          sub="Last 30 days"
          icon={UserPlus}
          gradient="from-emerald-500 to-teal-600"
          trend={followersTrend}
          href="/followers"
        />
        <StatCard
          label="Today"
          value={todayViews}
          sub="Views today"
          icon={TrendingUp}
          gradient="from-cyan-500 to-blue-600"
        />
        <StatCard
          label="All Time"
          value={model.profile_views || 0}
          sub="Total profile views"
          icon={Eye}
          gradient="from-amber-500 to-orange-600"
        />
      </div>
      )}

      {/* QR Code + Daily Chart */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* QR Code Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-6 flex flex-col items-center gap-4">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative w-full">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <QrCode className="h-4 w-4 text-pink-400" />
              Share Your Profile
            </h2>
            {/* QR code image */}
            <div className="flex justify-center mb-3">
              <div className="rounded-2xl p-[2px] bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-500 shadow-[0_0_20px_rgba(236,72,153,0.25)]">
                <div className="rounded-[14px] bg-white p-2">
                  <img
                    src={qrDataUrl}
                    alt="Profile QR Code"
                    width={144}
                    height={144}
                    className="rounded-lg"
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-center text-muted-foreground mb-4 break-all">
              examodels.com/{model.username}
            </p>
            {model.username && (
              <QRCodeDownloadButton dataUrl={qrDataUrl} username={model.username} />
            )}
          </div>
        </div>

        {/* Daily chart */}
        <div className="md:col-span-2 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Daily Profile Views</h2>
              {hasData && (
                <span className="text-xs text-muted-foreground">
                  Peak: {Math.max(...dailyData.map((d) => d.views))} views
                </span>
              )}
            </div>
            {dailyError ? (
              <div className="h-32 flex items-center justify-center">
                <CardErrorNote />
              </div>
            ) : (
              <DailyViewsChart data={dailyData} />
            )}
            {!hasData && !dailyError && !statsError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No views tracked yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Share your QR code or profile link to start getting visitors
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Devices */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
          <h3 className="text-sm font-semibold mb-4">Devices</h3>
          {devicesError ? (
            <CardErrorNote />
          ) : deviceTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-4">
              {[
                { key: "mobile", label: "Mobile", icon: Smartphone },
                { key: "desktop", label: "Desktop", icon: Monitor },
                { key: "tablet", label: "Tablet", icon: Tablet },
                ...(otherDevices > 0 ? [{ key: "other", label: "Other", icon: HelpCircle }] : []),
              ].map(({ key, label, icon: Icon }) => {
                const count = key === "other" ? otherDevices : deviceMap[key] || 0;
                const pct = deviceTotal > 0 ? Math.round((count / deviceTotal) * 100) : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">{count} views</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Countries */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Top Countries
          </h3>
          {countriesError ? (
            <CardErrorNote />
          ) : topCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCountries.map(([country, count]) => {
                const pct = countryTotal > 0 ? Math.round((count / countryTotal) * 100) : 0;
                return (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground flex-1 truncate">{country}</span>
                    <div className="w-20 h-1.5 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
          <h3 className="text-sm font-semibold mb-4">Traffic Sources</h3>
          {sourcesError ? (
            <CardErrorNote />
          ) : topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topSources.map(([source, count]) => {
                const pct = sourceTotal > 0 ? Math.round((count / sourceTotal) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground flex-1 truncate">{source}</span>
                    <div className="w-20 h-1.5 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-pink-400">Tip:</strong> Put your profile link in your Instagram and TikTok bio.{" "}
        {model.username && (
          <span className="text-pink-400 font-medium">examodels.com/{model.username}</span>
        )}
      </div>
    </div>
  );
}
