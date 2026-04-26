"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Coins,
  Users,
  Calendar,
  Send,
  Crown,
  Clock,
  CheckCircle,
  BarChart3,
  ArrowRight,
  Gift,
  Loader2,
  Building2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { BRAND_SUBSCRIPTION_TIERS } from "@/lib/stripe-config";

interface DashboardData {
  brand: {
    company_name: string;
    logo_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
    coin_balance: number;
  };
  stats: {
    activeOffers: number;
    pendingResponses: number;
    upcomingBookings: number;
    modelsContacted: number;
  };
  recentOffers: Array<{
    id: string;
    title: string;
    status: string;
    spots_filled: number;
    spots: number;
    created_at: string;
  }>;
  upcomingBookings: Array<{
    id: string;
    event_date: string;
    service_type: string;
    model: {
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

export default function BrandDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };

      if (!actor || actor.type !== "brand") return;

      const { data: brand } = await (supabase.from("brands") as any)
        .select("company_name, logo_url, is_verified, subscription_tier, coin_balance")
        .eq("id", actor.id)
        .single();

      if (!brand) return;

      // Load stats and recent activity in parallel
      const now = new Date().toISOString();
      const [
        { count: activeOffers },
        { count: pendingResponses },
        { count: upcomingBookings },
        { count: modelsContacted },
        { data: recentOffers },
        { data: bookings },
      ] = await Promise.all([
        (supabase.from("offers") as any)
          .select("id", { count: "exact", head: true })
          .eq("brand_id", actor.id)
          .eq("status", "open"),
        (supabase.from("offer_responses") as any)
          .select("id", { count: "exact", head: true })
          .eq("brand_id", actor.id)
          .eq("status", "accepted"),
        (supabase.from("bookings") as any)
          .select("id", { count: "exact", head: true })
          .eq("client_id", actor.id)
          .in("status", ["accepted", "confirmed"])
          .gte("event_date", now.split("T")[0]),
        (supabase.from("bookings") as any)
          .select("model_id", { count: "exact", head: true })
          .eq("client_id", actor.id),
        (supabase.from("offers") as any)
          .select("id, title, status, spots_filled, spots, created_at")
          .eq("brand_id", actor.id)
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase.from("bookings") as any)
          .select("id, event_date, service_type, model:models(username, first_name, last_name, profile_photo_url)")
          .eq("client_id", actor.id)
          .in("status", ["accepted", "confirmed"])
          .gte("event_date", now.split("T")[0])
          .order("event_date", { ascending: true })
          .limit(4),
      ]);

      setData({
        brand,
        stats: {
          activeOffers: activeOffers || 0,
          pendingResponses: pendingResponses || 0,
          upcomingBookings: upcomingBookings || 0,
          modelsContacted: modelsContacted || 0,
        },
        recentOffers: recentOffers || [],
        upcomingBookings: bookings || [],
      });
      setLoading(false);
    }

    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Could not load your brand dashboard.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const { brand, stats, recentOffers, upcomingBookings } = data;
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[brand.subscription_tier as keyof typeof BRAND_SUBSCRIPTION_TIERS];
  const isFreeTier = brand.subscription_tier === "free";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
            {brand.logo_url ? (
              <img src={brand.logo_url} alt={brand.company_name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-cyan-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{brand.company_name}</h1>
              {brand.is_verified && (
                <CheckCircle className="h-5 w-5 text-cyan-500" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs capitalize">
                <Crown className="h-3 w-3 mr-1" />
                {tierConfig?.name || brand.subscription_tier}
              </Badge>
              {!brand.is_verified && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Verification
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-bold text-yellow-500">{brand.coin_balance.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">coins</span>
          </div>
          <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
            <Link href="/models">
              <Users className="h-4 w-4 mr-2" />
              Browse Models
            </Link>
          </Button>
        </div>
      </div>

      {/* Pending verification banner */}
      {!brand.is_verified && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-500">Account Pending Verification</p>
                <p className="text-sm text-muted-foreground">Our team is reviewing your account. You&apos;ll receive an email once approved — usually within 24 hours.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free tier upgrade nudge */}
      {isFreeTier && brand.is_verified && (
        <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Unlock the full platform</p>
                  <p className="text-sm text-muted-foreground">Subscribe to send offers, message models, and get monthly coins.</p>
                </div>
              </div>
              <Button asChild className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shrink-0">
                <Link href="/brands/pricing">
                  View Plans
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <Send className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeOffers}</p>
                <p className="text-xs text-muted-foreground">Active Offers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingResponses}</p>
                <p className="text-xs text-muted-foreground">Accepted Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-500/10">
                <Calendar className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                <p className="text-xs text-muted-foreground">Upcoming Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-violet-500/10">
                <Users className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.modelsContacted}</p>
                <p className="text-xs text-muted-foreground">Models Worked With</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Offers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Recent Offers
              </CardTitle>
              <CardDescription>Your latest campaigns</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-cyan-500 hover:text-cyan-400">
              <Link href="/brands/offers">
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOffers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No offers sent yet</p>
                {!isFreeTier && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/models">Browse models to get started</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{offer.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.spots_filled}/{offer.spots} spots filled
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        offer.status === "open"
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {offer.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Bookings
              </CardTitle>
              <CardDescription>Confirmed sessions</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-cyan-500 hover:text-cyan-400">
              <Link href="/brands/analytics">
                Analytics
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 py-1">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={booking.model?.profile_photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {booking.model?.first_name?.[0] || booking.model?.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {booking.model?.first_name
                          ? `${booking.model.first_name} ${booking.model.last_name || ""}`.trim()
                          : `@${booking.model?.username}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {SERVICE_LABELS[booking.service_type] || booking.service_type}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-right shrink-0">
                      {new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/models">
                <Users className="h-5 w-5 text-cyan-500" />
                <span className="text-xs">Browse Models</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/brands/offers">
                <Gift className="h-5 w-5 text-violet-500" />
                <span className="text-xs">My Offers</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/brands/analytics">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <span className="text-xs">Analytics</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/brands/subscription">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="text-xs">Subscription</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
