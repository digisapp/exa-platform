"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Phone,
  TrendingUp,
  Users,
  Target,
  Clock,
  Calendar,
  Loader2,
  Instagram,
  Mail,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface CallRequest {
  id: string;
  status: string;
  outcome: string | null;
  source: string;
  created_at: string;
  completed_at: string | null;
}

const COLORS = ["#ec4899", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#6b7280"];

export default function CrmAnalyticsPage() {
  const [callRequests, setCallRequests] = useState<CallRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    try {
      const { data, error } = await (supabase as any)
        .from("call_requests")
        .select("id, status, outcome, source, created_at, completed_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCallRequests(data || []);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: callRequests.length,
    pending: callRequests.filter(r => r.status === "pending").length,
    completed: callRequests.filter(r => r.status === "completed").length,
    signedUp: callRequests.filter(r => r.outcome === "signed_up").length,
  };

  const conversionRate = stats.completed > 0
    ? Math.round((stats.signedUp / stats.completed) * 100)
    : 0;

  // Last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayRequests = callRequests.filter(r => {
      const created = new Date(r.created_at);
      return created >= dayStart && created <= dayEnd;
    });

    const dayCompleted = callRequests.filter(r => {
      if (!r.completed_at) return false;
      const completed = new Date(r.completed_at);
      return completed >= dayStart && completed <= dayEnd;
    });

    return {
      date: format(date, "EEE"),
      fullDate: format(date, "MMM d"),
      requests: dayRequests.length,
      completed: dayCompleted.length,
    };
  });

  // Source breakdown
  const sourceBreakdown = callRequests.reduce((acc, r) => {
    const source = r.source || "unknown";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceData = Object.entries(sourceBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Outcome breakdown
  const outcomeBreakdown = callRequests
    .filter(r => r.outcome)
    .reduce((acc, r) => {
      const outcome = r.outcome || "none";
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const outcomeData = Object.entries(outcomeBreakdown).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));

  // Status breakdown
  const statusBreakdown = callRequests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusBreakdown).map(([name, value]) => ({
    name: name.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
    value,
  }));

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case "instagram": return <Instagram className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "dashboard": return <LayoutDashboard className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/crm">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-pink-500" />
            CRM Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Call request performance and conversion metrics
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Phone className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Signed Up</p>
                <p className="text-2xl font-bold">{stats.signedUp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-pink-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Target className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-pink-500">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Requests Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullDate}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#ec4899"
                  strokeWidth={2}
                  name="New Requests"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {sourceData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status & Outcome Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#888" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                />
                <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Outcome Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Call Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outcomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={outcomeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No outcome data yet. Mark calls as completed with outcomes to see stats.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Source Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-right py-3 px-4">Requests</th>
                  <th className="text-right py-3 px-4">Completed</th>
                  <th className="text-right py-3 px-4">Signed Up</th>
                  <th className="text-right py-3 px-4">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sourceBreakdown).map(([source, total]) => {
                  const completed = callRequests.filter(
                    r => r.source === source && r.status === "completed"
                  ).length;
                  const signedUp = callRequests.filter(
                    r => r.source === source && r.outcome === "signed_up"
                  ).length;
                  const rate = completed > 0 ? Math.round((signedUp / completed) * 100) : 0;

                  return (
                    <tr key={source} className="border-b border-border/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        {getSourceIcon(source)}
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </td>
                      <td className="text-right py-3 px-4">{total}</td>
                      <td className="text-right py-3 px-4">{completed}</td>
                      <td className="text-right py-3 px-4 text-green-500">{signedUp}</td>
                      <td className="text-right py-3 px-4">
                        <span className={rate >= 30 ? "text-green-500" : rate >= 15 ? "text-amber-500" : "text-muted-foreground"}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
