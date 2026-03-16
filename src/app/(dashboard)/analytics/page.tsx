import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import {
  Eye,
  Users,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  ExternalLink,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { QRCodeDownloadButton } from "@/components/profile/QRCodeDownloadButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics | EXA",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-5">
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient} pointer-events-none`} />
      <div className="relative">
        <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${gradient} mb-3`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <p className="text-2xl font-black tabular-nums">{value.toLocaleString()}</p>
        <p className="text-xs font-medium text-foreground mt-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { date: string; views: number }[] }) {
  const max = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="flex items-end gap-[3px] h-28">
      {data.map((day, i) => {
        const height = Math.max((day.views / max) * 100, day.views > 0 ? 4 : 1);
        const showLabel = i === 0 || i === 14 || i === 29;
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="relative w-full flex items-end" style={{ height: "108px" }}>
              <div
                className="w-full rounded-sm transition-all cursor-default"
                style={{
                  height: `${height}%`,
                  background:
                    day.views > 0
                      ? "linear-gradient(to top, #ec4899cc, #a855f7aa)"
                      : "rgba(255,255,255,0.04)",
                }}
                title={`${new Date(day.date + "T12:00:00").toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })}: ${day.views} views`}
              />
            </div>
            {showLabel && (
              <span className="text-[8px] text-zinc-600 whitespace-nowrap">
                {new Date(day.date + "T12:00:00").toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        );
      })}
    </div>
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
    .select("id, username, first_name, profile_views")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/dashboard");

  // Use RPC functions for database-level aggregation (instead of loading all rows)
  const serviceClient = createServiceRoleClient();

  const [
    { data: statsData },
    { data: dailyRaw },
    { data: devicesRaw },
    { data: countriesRaw },
    { data: sourcesRaw },
  ] = await Promise.all([
    (serviceClient.rpc as any)("get_analytics_stats", { p_model_id: model.id }),
    (serviceClient.rpc as any)("get_analytics_daily", { p_model_id: model.id }),
    (serviceClient.rpc as any)("get_analytics_devices", { p_model_id: model.id }),
    (serviceClient.rpc as any)("get_analytics_countries", { p_model_id: model.id }),
    (serviceClient.rpc as any)("get_analytics_sources", { p_model_id: model.id }),
  ]);

  const stats = statsData?.[0] || { total_views_30d: 0, unique_visitors_30d: 0, today_views: 0 };
  const totalViews30d = Number(stats.total_views_30d) || 0;
  const uniqueVisitors = Number(stats.unique_visitors_30d) || 0;
  const todayViews = Number(stats.today_views) || 0;

  // Daily chart data (already filled with 0s by the RPC)
  const dailyData: { date: string; views: number }[] = (dailyRaw || []).map(
    (d: { day: string; views: number }) => ({ date: d.day, views: Number(d.views) || 0 })
  );

  // Device breakdown
  const deviceMap: Record<string, number> = {};
  (devicesRaw || []).forEach((d: { device: string; views: number }) => {
    deviceMap[d.device] = Number(d.views) || 0;
  });

  // Top countries (already sorted and limited by RPC)
  const topCountries: [string, number][] = (countriesRaw || []).map(
    (c: { country: string; views: number }) => [c.country, Number(c.views) || 0] as [string, number]
  );

  // Top sources (already sorted and limited by RPC)
  const topSources: [string, number][] = (sourcesRaw || []).map(
    (s: { source: string; views: number }) => [s.source, Number(s.views) || 0] as [string, number]
  );

  const hasData = totalViews30d > 0;

  // Generate QR code for the profile URL
  const profileUrl = `https://www.examodels.com/${model.username}`;
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    width: 200,
    margin: 2,
    color: { dark: "#ffffff", light: "#09090b" },
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
        <span className="text-xs text-muted-foreground bg-white/5 border border-white/10 rounded-full px-3 py-1">
          Last 30 days
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Profile Views"
          value={totalViews30d}
          sub="Last 30 days"
          icon={Eye}
          gradient="from-pink-500 to-rose-600"
        />
        <StatCard
          label="Unique Visitors"
          value={uniqueVisitors}
          sub="Last 30 days"
          icon={Users}
          gradient="from-violet-500 to-purple-600"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Profile QR Code"
                width={160}
                height={160}
                className="rounded-xl"
              />
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold">Daily Profile Views</h2>
              {hasData && (
                <span className="text-xs text-muted-foreground">
                  Peak: {Math.max(...dailyData.map((d) => d.views))} views
                </span>
              )}
            </div>
            <BarChart data={dailyData} />
            {!hasData && (
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
          {!hasData ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-4">
              {[
                { key: "mobile", label: "Mobile", icon: Smartphone },
                { key: "desktop", label: "Desktop", icon: Monitor },
                { key: "tablet", label: "Tablet", icon: Tablet },
              ].map(({ key, label, icon: Icon }) => {
                const count = deviceMap[key] || 0;
                const pct = totalViews30d > 0 ? Math.round((count / totalViews30d) * 100) : 0;
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
          {topCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCountries.map(([country, count]) => {
                const pct = totalViews30d > 0 ? Math.round((count / totalViews30d) * 100) : 0;
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
          {topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topSources.map(([source, count]) => {
                const pct = totalViews30d > 0 ? Math.round((count / totalViews30d) * 100) : 0;
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
        {" "}— or download the QR code above and add it to your stories.
      </div>
    </div>
  );
}
