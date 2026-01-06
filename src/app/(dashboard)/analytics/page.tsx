"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Users,
  Calendar,
  TrendingUp,
  Loader2,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Phone,
  Gift,
  Briefcase,
} from "lucide-react";

interface AnalyticsData {
  totalCoinsEarned: number;
  earningsByMonth: Record<string, number>;
  earningsByType: Record<string, number>;
  totalBookings: number;
  completedBookings: number;
  followerCount: number;
  profileViews: number;
  activeConversations: number;
  topFans: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    type: "fan" | "brand";
    total_spent: number;
  }>;
  upcomingBookings: Array<{
    id: string;
    event_date: string;
    service_type: string;
    status: string;
    client: {
      name: string;
      avatar_url: string | null;
      type: "fan" | "brand";
    } | null;
  }>;
}

const SERVICE_LABELS: Record<string, string> = {
  photoshoot_hourly: "Photoshoot",
  photoshoot_half_day: "Photoshoot (Half-Day)",
  photoshoot_full_day: "Photoshoot (Full-Day)",
  promo: "Promo",
  brand_ambassador: "Brand Ambassador",
  private_event: "Private Event",
  social_companion: "Social Companion",
  meet_greet: "Meet & Greet",
  other: "Other",
};

const EARNING_TYPE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  tip_received: { label: "Tips", icon: Gift, color: "text-pink-500" },
  video_call: { label: "Video Calls", icon: Phone, color: "text-blue-500" },
  voice_call: { label: "Voice Calls", icon: Phone, color: "text-green-500" },
  message_sent: { label: "Messages", icon: MessageCircle, color: "text-purple-500" },
  content_sale: { label: "Content Sales", icon: Eye, color: "text-orange-500" },
  booking_payment: { label: "Bookings", icon: Briefcase, color: "text-cyan-500" },
};

export default function ModelAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/models/analytics");
        if (!res.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{error || "Failed to load analytics"}</p>
      </div>
    );
  }

  // Get last 6 months for chart
  const months = Object.keys(data.earningsByMonth).sort().slice(-6);
  const maxEarning = Math.max(...Object.values(data.earningsByMonth), 1);

  // Get earning types sorted by amount
  const earningTypes = Object.entries(data.earningsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const totalFromTypes = earningTypes.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your earnings and engagement</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Coins className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coins Earned</p>
                <p className="text-2xl font-bold">{data.totalCoinsEarned.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/10">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Followers</p>
                <p className="text-2xl font-bold">{data.followerCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profile Views</p>
                <p className="text-2xl font-bold">{data.profileViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bookings</p>
                <p className="text-2xl font-bold">{data.completedBookings}</p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      {months.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Earnings
            </CardTitle>
            <CardDescription>Coins earned over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {months.map((month) => {
                const earning = data.earningsByMonth[month] || 0;
                const height = (earning / maxEarning) * 100;
                const [year, m] = month.split("-");
                const monthLabel = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });

                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-muted rounded-t relative" style={{ height: `${Math.max(height, 5)}%` }}>
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-pink-500 to-violet-500 rounded-t"
                        style={{ height: "100%" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{monthLabel}</span>
                    <span className="text-xs font-medium">{earning.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Breakdown */}
      {earningTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Earnings Breakdown
            </CardTitle>
            <CardDescription>Where your coins come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earningTypes.map(([type, amount]) => {
                const typeInfo = EARNING_TYPE_LABELS[type] || { label: type, icon: Coins, color: "text-gray-500" };
                const Icon = typeInfo.icon;
                const percentage = totalFromTypes > 0 ? Math.round((amount / totalFromTypes) * 100) : 0;

                return (
                  <div key={type} className="flex items-center gap-4">
                    <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{typeInfo.label}</span>
                        <span className="text-sm text-muted-foreground">{amount.toLocaleString()} coins</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Bookings
            </CardTitle>
            <CardDescription>Your next scheduled sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming bookings</p>
            ) : (
              <div className="space-y-4">
                {data.upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.client?.avatar_url || undefined} />
                      <AvatarFallback>
                        {booking.client?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {booking.client?.name || "Client"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {SERVICE_LABELS[booking.service_type] || booking.service_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(booking.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Fans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Top Supporters
            </CardTitle>
            <CardDescription>Fans & brands who support you most</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topFans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No supporters yet</p>
            ) : (
              <div className="space-y-4">
                {data.topFans.map((fan, index) => (
                  <div key={fan.id} className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={fan.avatar_url || undefined} />
                      <AvatarFallback>
                        {fan.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fan.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{fan.type}</p>
                    </div>
                    <Badge className="bg-gradient-to-r from-pink-500 to-violet-500">
                      {fan.total_spent.toLocaleString()} coins
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
