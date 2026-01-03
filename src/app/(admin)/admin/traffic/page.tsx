"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Eye,
  Users,
  MousePointer,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  viewsPerVisitor: string;
  deviceBreakdown: { device_type: string; count: number }[];
  topPages: { page_path: string; page_type: string; count: number }[];
  topModels: { model_username: string; count: number }[];
  dailyViews: { date: string; views: number; visitors: number }[];
  browserBreakdown: { browser: string; count: number }[];
  countryBreakdown: { country: string; count: number }[];
}

const COLORS = ["#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

// Country name to flag emoji mapping
const countryFlags: Record<string, string> = {
  "United States": "🇺🇸",
  "USA": "🇺🇸",
  "Canada": "🇨🇦",
  "United Kingdom": "🇬🇧",
  "UK": "🇬🇧",
  "Australia": "🇦🇺",
  "Germany": "🇩🇪",
  "France": "🇫🇷",
  "Spain": "🇪🇸",
  "Italy": "🇮🇹",
  "Netherlands": "🇳🇱",
  "Brazil": "🇧🇷",
  "Mexico": "🇲🇽",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "India": "🇮🇳",
  "China": "🇨🇳",
  "Russia": "🇷🇺",
  "Philippines": "🇵🇭",
  "Indonesia": "🇮🇩",
  "Thailand": "🇹🇭",
  "Vietnam": "🇻🇳",
  "Malaysia": "🇲🇾",
  "Singapore": "🇸🇬",
  "Poland": "🇵🇱",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Denmark": "🇩🇰",
  "Finland": "🇫🇮",
  "Ireland": "🇮🇪",
  "New Zealand": "🇳🇿",
  "South Africa": "🇿🇦",
  "Argentina": "🇦🇷",
  "Colombia": "🇨🇴",
  "Chile": "🇨🇱",
  "Peru": "🇵🇪",
  "Portugal": "🇵🇹",
  "Belgium": "🇧🇪",
  "Austria": "🇦🇹",
  "Switzerland": "🇨🇭",
  "Greece": "🇬🇷",
  "Turkey": "🇹🇷",
  "Israel": "🇮🇱",
  "UAE": "🇦🇪",
  "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦",
  "Egypt": "🇪🇬",
  "Nigeria": "🇳🇬",
  "Kenya": "🇰🇪",
  "Pakistan": "🇵🇰",
  "Bangladesh": "🇧🇩",
  "Taiwan": "🇹🇼",
  "Hong Kong": "🇭🇰",
  "Unknown": "🌍",
};

const getCountryFlag = (country: string): string => {
  return countryFlags[country] || "🌍";
};

const deviceIcons: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="h-4 w-4" />,
  desktop: <Monitor className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
};

export default function TrafficPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch analytics");
      }
      const analytics = await res.json();
      setData(analytics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatPagePath = (path: string) => {
    if (path === "/") return "Home";
    if (path.startsWith("/")) return path.slice(1);
    return path;
  };

  if (loading) {
    return (
      <div className="container px-8 md:px-16 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-8 md:px-16 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Traffic Analytics</h1>
            <p className="text-muted-foreground">Monitor your platform traffic and engagement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <TabsList>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/20">
                <Eye className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{data?.totalViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{data?.uniqueVisitors.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Unique Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <MousePointer className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{data?.viewsPerVisitor}</p>
                <p className="text-sm text-muted-foreground">Views per Visitor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Views Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" />
            Views Over Time
          </CardTitle>
          <CardDescription>Daily page views and unique visitors</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.dailyViews && data.dailyViews.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyViews}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                    labelFormatter={formatDate}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#ec4899"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    name="Page Views"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVisitors)"
                    name="Visitors"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Views by device type</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.deviceBreakdown && data.deviceBreakdown.length > 0 ? (
              <div className="flex items-center gap-8">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.deviceBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="device_type"
                      >
                        {data.deviceBreakdown.map((entry, index) => (
                          <Cell key={entry.device_type} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {data.deviceBreakdown.map((device, index) => (
                    <div key={device.device_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="flex items-center gap-2 capitalize">
                          {deviceIcons[device.device_type] || <Globe className="h-4 w-4" />}
                          {device.device_type}
                        </span>
                      </div>
                      <span className="font-medium">{device.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                No device data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Breakdown</CardTitle>
            <CardDescription>Views by browser</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.browserBreakdown && data.browserBreakdown.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.browserBreakdown.slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#666" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="browser"
                      stroke="#666"
                      fontSize={12}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No browser data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages and Models */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topPages && data.topPages.length > 0 ? (
              <div className="space-y-3">
                {data.topPages.map((page, index) => (
                  <div
                    key={page.page_path}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{formatPagePath(page.page_path)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{page.page_type}</p>
                      </div>
                    </div>
                    <span className="font-bold text-pink-500">{page.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No page data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Model Profiles */}
        <Card>
          <CardHeader>
            <CardTitle>Top Model Profiles</CardTitle>
            <CardDescription>Most viewed model profiles</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topModels && data.topModels.length > 0 ? (
              <div className="space-y-3">
                {data.topModels.map((model, index) => (
                  <div
                    key={model.model_username}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Link
                        href={`/${model.model_username}`}
                        className="font-medium hover:text-pink-500 transition-colors"
                      >
                        @{model.model_username}
                      </Link>
                    </div>
                    <span className="font-bold text-pink-500">{model.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No model profile views yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Country Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Top Countries
          </CardTitle>
          <CardDescription>Views by country</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.countryBreakdown && data.countryBreakdown.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {data.countryBreakdown.map((country) => (
                <div
                  key={country.country}
                  className="p-4 rounded-lg bg-muted/50 text-center"
                >
                  <p className="text-3xl mb-1">{getCountryFlag(country.country)}</p>
                  <p className="text-2xl font-bold text-blue-500">{country.count.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">{country.country}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No country data yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
