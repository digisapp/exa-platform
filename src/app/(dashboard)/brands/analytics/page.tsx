"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Coins, Users, Calendar, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import Link from "next/link";

interface AnalyticsData {
  totalCoinsSpent: number;
  spendByMonth: Record<string, number>;
  totalBookings: number;
  completedBookings: number;
  modelsContacted: number;
  frequentCollaborators: Array<{
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
    booking_count: number;
  }>;
  upcomingBookings: Array<{
    id: string;
    event_date: string;
    service_type: string;
    status: string;
    model: {
      id: string;
      username: string;
      first_name: string | null;
      last_name: string | null;
      profile_photo_url: string | null;
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

export default function BrandAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/brands/analytics");
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
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
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
  const months = Object.keys(data.spendByMonth).sort().slice(-6);
  const maxSpend = Math.max(...Object.values(data.spendByMonth), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your activity and spending</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Coins className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coins Spent</p>
                <p className="text-3xl font-bold">{data.totalCoinsSpent.toLocaleString()}</p>
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
                <p className="text-3xl font-bold">{data.completedBookings}</p>
                <p className="text-xs text-muted-foreground">completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-500/10">
                <Users className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Models Contacted</p>
                <p className="text-3xl font-bold">{data.modelsContacted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spend Chart */}
      {months.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Spend
            </CardTitle>
            <CardDescription>Coins spent over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {months.map((month) => {
                const spend = data.spendByMonth[month] || 0;
                const height = (spend / maxSpend) * 100;
                const [year, m] = month.split("-");
                const monthLabel = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });

                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-muted rounded-t relative" style={{ height: `${Math.max(height, 5)}%` }}>
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t"
                        style={{ height: "100%" }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{monthLabel}</span>
                    <span className="text-xs font-medium">{spend.toLocaleString()}</span>
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
                      <AvatarImage src={booking.model?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {booking.model?.first_name?.[0] || booking.model?.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${booking.model?.username}`}
                        className="font-medium hover:text-cyan-500 truncate block"
                      >
                        {booking.model?.first_name
                          ? `${booking.model.first_name} ${booking.model.last_name || ""}`.trim()
                          : `@${booking.model?.username}`}
                      </Link>
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

        {/* Frequent Collaborators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Frequent Collaborators
            </CardTitle>
            <CardDescription>Models you've worked with most</CardDescription>
          </CardHeader>
          <CardContent>
            {data.frequentCollaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {data.frequentCollaborators.map((model, index) => (
                  <div key={model.id} className="flex items-center gap-3">
                    <div className="w-6 text-center">
                      <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={model.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {model.first_name?.[0] || model.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/${model.username}`}
                        className="font-medium hover:text-cyan-500 truncate block"
                      >
                        {model.first_name
                          ? `${model.first_name} ${model.last_name || ""}`.trim()
                          : `@${model.username}`}
                      </Link>
                      <p className="text-sm text-muted-foreground">@{model.username}</p>
                    </div>
                    <Badge className="bg-cyan-500">
                      {model.booking_count} {model.booking_count === 1 ? "booking" : "bookings"}
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
