import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModelCard } from "@/components/models/model-card";
import { LiveWallServer } from "@/components/live-wall/LiveWallServer";
import { BRAND_SUBSCRIPTION_TIERS } from "@/lib/stripe-config";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Users,
  Clock,
  Calendar,
  Search,
  Mail,
  Crown,
  CheckCircle2,
  Megaphone,
  BarChart3,
  Circle,
  Heart,
  Plus,
} from "lucide-react";

const BRAND_SERVICE_LABELS: Record<string, string> = {
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

export async function BrandDashboard({ actorId }: { actorId: string }) {
  const supabase = await createClient();

  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("id", actorId)
    .single();

  const isApproved = brand?.is_verified === true;
  const isPending = brand?.is_verified !== true;

  const [
    { data: campaignsList },
    { count: campaignCount },
    { data: offersData },
    { data: upcomingBookings },
    { data: topModels },
    { data: follows },
  ] = await Promise.all([
    (supabase.from("campaigns") as any)
      .select(`*, campaign_models(id)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false })
      .limit(3),
    (supabase.from("campaigns") as any)
      .select("*", { count: "exact", head: true })
      .eq("brand_id", actorId),
    (supabase.from("offers") as any)
      .select(`*, offer_responses(id, status, model_id, responded_at)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false }),
    (supabase.from("bookings") as any)
      .select("id, event_date, service_type, status, model_id")
      .eq("client_id", actorId)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .neq("status", "cancelled")
      .order("event_date", { ascending: true })
      .limit(5),
    (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .eq("is_approved", true)
      .not("profile_photo_url", "is", null)
      .not("profile_photo_url", "ilike", "%cdninstagram.com%")
      .not("profile_photo_url", "ilike", "%instagram%")
      .gte("admin_rating", 4)
      .order("admin_rating", { ascending: false })
      .limit(8),
    (supabase.from("follows") as any)
      .select(`
        created_at,
        following_id,
        actors!follows_following_id_fkey (
          user_id
        )
      `)
      .eq("follower_id", actorId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const coinBalance = brand?.coin_balance || 0;
  const activeCampaignCount = campaignCount || 0;

  const allResponses = (offersData || []).flatMap((offer: any) =>
    (offer.offer_responses || []).map((r: any) => ({
      ...r,
      offer_title: offer.title,
      offer_id: offer.id,
    }))
  );
  const pendingResponseCount = allResponses.filter((r: any) => r.status === "pending").length;
  const upcomingEventCount = (upcomingBookings || []).length;

  const recentResponses = allResponses
    .filter((r: any) => r.status === "accepted" || r.status === "declined" || r.status === "confirmed")
    .sort((a: any, b: any) =>
      new Date(b.responded_at || b.created_at).getTime() - new Date(a.responded_at || a.created_at).getTime()
    )
    .slice(0, 5);

  const campaignOfferMap = new Map<string, { accepted: number; pending: number }>();
  (offersData || []).forEach((offer: any) => {
    if (!offer.campaign_id) return;
    const existing = campaignOfferMap.get(offer.campaign_id) || { accepted: 0, pending: 0 };
    (offer.offer_responses || []).forEach((r: any) => {
      if (r.status === "accepted" || r.status === "confirmed") existing.accepted++;
      else if (r.status === "pending") existing.pending++;
    });
    campaignOfferMap.set(offer.campaign_id, existing);
  });

  const bookingModelIds = (upcomingBookings || []).map((b: any) => b.model_id).filter(Boolean);
  const responseModelIds = recentResponses.map((r: any) => r.model_id).filter(Boolean);
  const allEnrichIds = [...new Set([...bookingModelIds, ...responseModelIds])];
  let enrichModels: any[] = [];
  if (allEnrichIds.length > 0) {
    const { data } = await (supabase.from("models") as any)
      .select("id, username, first_name, last_name, profile_photo_url")
      .in("id", allEnrichIds);
    enrichModels = data || [];
  }
  const enrichMap = new Map(enrichModels.map((m: any) => [m.id, m]));

  const currentTier = (brand?.subscription_tier || "free") as keyof typeof BRAND_SUBSCRIPTION_TIERS;
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[currentTier] || BRAND_SUBSCRIPTION_TIERS.free;
  const monthlyCoins = tierConfig.monthlyCoins;

  const hasProfile = !!brand?.logo_url;
  const hasCampaign = activeCampaignCount > 0;
  const hasSentOffer = (offersData || []).length > 0;
  const completedSteps = [hasProfile, hasCampaign, hasSentOffer].filter(Boolean).length;

  const discoverModels = topModels || [];

  const followedUserIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];
  let favoriteModels: any[] = [];
  if (followedUserIds.length > 0) {
    const { data: followedModels } = await (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_name, show_social_media,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true);

    const modelsByUserId = new Map((followedModels || []).map((m: any) => [m.user_id, m]));
    favoriteModels = followedUserIds
      .map((userId: string) => modelsByUserId.get(userId))
      .filter(Boolean);
  }

  const displayName = brand?.company_name || "Brand";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ──────────────────────────────────────────────
          HERO — brand identity + quick actions
         ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,191,255,0.15) 0%, rgba(139,92,246,0.08) 50%, rgba(255,105,180,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-violet-500 to-pink-500 blur-md opacity-60" />
              {brand?.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-2 ring-white/30"
                />
              ) : (
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/40 to-pink-500/40 ring-2 ring-white/30 flex items-center justify-center text-2xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Welcome back</p>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight truncate">
                <span className="exa-gradient-text">{displayName}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/40 shadow-[0_0_10px_rgba(167,139,250,0.2)]">
                  <Crown className="h-3 w-3 text-violet-300" />
                  <span className="text-[11px] font-semibold text-violet-200">{tierConfig.name}</span>
                </span>
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40">
                    <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                    <span className="text-[11px] font-semibold text-emerald-200">Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40">
                    <Clock className="h-3 w-3 text-amber-300" />
                    <span className="text-[11px] font-semibold text-amber-200">Pending</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:gap-3 md:flex md:items-center">
            <Link
              href="/models"
              className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-xs md:text-sm font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
            </Link>
            <Link
              href="/campaigns/new"
              className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-xs md:text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Campaign</span>
            </Link>
            <Link
              href="/brands/offers/new"
              className="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs md:text-sm font-semibold text-white transition-all"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Offer</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          KPI RAIL
         ────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/campaigns" className="group relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-4 transition-all hover:border-violet-500/50 hover:bg-violet-500/10">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-violet-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Megaphone className="h-3.5 w-3.5 text-violet-400" />
              <span className="font-medium uppercase tracking-wider">Campaigns</span>
            </div>
            <p className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight">{activeCampaignCount}</p>
            <p className="text-xs text-white/50 mt-0.5">active</p>
          </div>
        </Link>

        <Link href="/favorites" className="group relative overflow-hidden rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-4 transition-all hover:border-pink-500/50 hover:bg-pink-500/10">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-pink-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400/50" />
              <span className="font-medium uppercase tracking-wider">Favorites</span>
            </div>
            <p className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight">{favoriteModels.length}</p>
            <p className="text-xs text-white/50 mt-0.5">saved models</p>
          </div>
        </Link>

        <Link href="/brands/offers" className="group relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 transition-all hover:border-amber-500/50 hover:bg-amber-500/10">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Mail className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight">{pendingResponseCount}</p>
            <p className="text-xs text-white/50 mt-0.5">responses</p>
          </div>
        </Link>

        <Link href="/bookings" className="group relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium uppercase tracking-wider">Upcoming</span>
            </div>
            <p className="mt-2 text-2xl md:text-3xl font-bold text-white tracking-tight">{upcomingEventCount}</p>
            <p className="text-xs text-white/50 mt-0.5">shows booked</p>
          </div>
        </Link>
      </section>

      {/* ──────────────────────────────────────────────
          Pending approval notice
         ────────────────────────────────────────────── */}
      {isPending && (
        <div className="flex items-start gap-4 p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="p-3 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40">
            <Clock className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Application under review</h3>
            <p className="text-white/60 text-sm mt-1">
              We&apos;re reviewing your brand application. You&apos;ll receive an email once approved.
              In the meantime, feel free to browse our models!
            </p>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Getting Started Checklist
         ────────────────────────────────────────────── */}
      {completedSteps < 3 && (
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Getting started</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {completedSteps}/3
            </span>
          </header>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { href: "/settings", done: hasProfile, title: "Complete your profile", sub: "Add logo + company details" },
                { href: "/campaigns", done: hasCampaign, title: "Create a campaign", sub: "Organize models by project" },
                { href: "/brands/offers", done: hasSentOffer, title: "Send your first offer", sub: "Reach out to models" },
              ].map((step) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    step.done
                      ? "bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/40"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-white/30 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`font-medium text-sm truncate ${step.done ? "line-through text-white/50" : "text-white"}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-white/50 truncate">{step.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Subscription widget + Quick Actions
         ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subscription */}
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/40">
              <Crown className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <p className="font-semibold text-white">{tierConfig.name} Plan</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isApproved
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              }`}>
                {isApproved ? "ACTIVE" : "PENDING"}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-white/60">Coin balance</span>
                <span className="font-semibold text-white">
                  {coinBalance.toLocaleString()}
                  {monthlyCoins > 0 && <span className="text-white/40"> / {monthlyCoins.toLocaleString()}</span>}
                </span>
              </div>
              {monthlyCoins > 0 && (
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_0_10px_rgba(167,139,250,0.5)] transition-all"
                    style={{ width: `${Math.min((coinBalance / monthlyCoins) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            {currentTier !== "enterprise" && (
              <Link
                href="/brands/subscription"
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white/5 hover:bg-violet-500/15 border border-white/10 hover:border-violet-500/40 text-sm font-semibold text-white/80 hover:text-white transition-all"
              >
                Upgrade Plan
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/60 mb-4">Quick actions</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/models", icon: Search, label: "Browse Models", color: "pink", rgb: "236,72,153" },
              { href: "/campaigns", icon: Megaphone, label: "Campaigns", color: "violet", rgb: "167,139,250" },
              { href: "/brands/offers", icon: Mail, label: "View Offers", color: "cyan", rgb: "34,211,238" },
              { href: "/brands/analytics", icon: BarChart3, label: "Analytics", color: "emerald", rgb: "52,211,153" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all"
                style={{
                  transition: "all 0.2s",
                } as React.CSSProperties}
              >
                <div
                  className="p-2 rounded-lg transition-all group-hover:scale-110"
                  style={{
                    background: `rgba(${action.rgb}, 0.15)`,
                    boxShadow: `inset 0 0 0 1px rgba(${action.rgb}, 0.3)`,
                  }}
                >
                  <action.icon className={`h-4 w-4 text-${action.color}-300`} />
                </div>
                <span className="font-semibold text-sm text-white group-hover:text-white">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          EXA Live Wall
         ────────────────────────────────────────────── */}
      <LiveWallServer actorId={actorId} actorType="brand" />

      {/* ──────────────────────────────────────────────
          Active Campaigns + Recent Responses
         ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-pink-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-400" />
              <h2 className="text-base font-semibold text-white">Active campaigns</h2>
            </div>
            <Link href="/campaigns" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="p-3">
            {(campaignsList || []).length > 0 ? (
              <div className="space-y-2">
                {(campaignsList || []).map((campaign: any) => {
                  const modelCount = campaign.campaign_models?.length || 0;
                  const offerSummary = campaignOfferMap.get(campaign.id);
                  return (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-violet-500/30 transition-all group"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                        style={{ backgroundColor: campaign.color || "#ec4899", color: campaign.color || "#ec4899" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{campaign.name}</p>
                        <p className="text-xs text-white/50">
                          {modelCount} {modelCount === 1 ? "model" : "models"}
                          {offerSummary && (offerSummary.accepted > 0 || offerSummary.pending > 0) && (
                            <>
                              {" · "}
                              {offerSummary.accepted > 0 && (
                                <span className="text-emerald-300">{offerSummary.accepted} accepted</span>
                              )}
                              {offerSummary.accepted > 0 && offerSummary.pending > 0 && ", "}
                              {offerSummary.pending > 0 && (
                                <span className="text-amber-300">{offerSummary.pending} pending</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/10 ring-1 ring-violet-500/30 mb-3">
                  <Megaphone className="h-6 w-6 text-violet-300" />
                </div>
                <p className="text-sm text-white/60 mb-3">No campaigns yet</p>
                <Link
                  href="/campaigns/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-sm font-semibold text-white shadow-[0_0_18px_rgba(167,139,250,0.4)] transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Create Campaign
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Recent responses</h2>
            </div>
            <Link href="/brands/offers" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="p-4">
            {recentResponses.length > 0 ? (
              <div className="space-y-3">
                {recentResponses.map((response: any) => {
                  const model = enrichMap.get(response.model_id);
                  const respName = model?.first_name
                    ? `${model.first_name} ${model.last_name || ""}`.trim()
                    : model?.username || "Model";
                  return (
                    <div key={response.id} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-white/10">
                        <AvatarImage src={model?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs">
                          {respName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{respName}</p>
                        <p className="text-xs text-white/50 truncate">{response.offer_title}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wider font-semibold px-2 ${
                          response.status === "accepted" || response.status === "confirmed"
                            ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
                            : "text-rose-300 border-rose-500/40 bg-rose-500/10"
                        }`}
                      >
                        {response.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/30 mb-3">
                  <Mail className="h-6 w-6 text-cyan-300" />
                </div>
                <p className="text-sm text-white/60">
                  Responses to your offers will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Upcoming Shows
         ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Upcoming shows</h2>
          </div>
          {upcomingEventCount > 0 && (
            <Link href="/bookings" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </header>
        <div className="p-4">
          {(upcomingBookings || []).length > 0 ? (
            <div className="space-y-3">
              {(upcomingBookings || []).map((booking: any) => {
                const model = enrichMap.get(booking.model_id);
                const respName = model?.first_name
                  ? `${model.first_name} ${model.last_name || ""}`.trim()
                  : model?.username || "Model";
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <Avatar className="h-10 w-10 ring-1 ring-white/10">
                      <AvatarImage src={model?.profile_photo_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                        {respName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      {model?.username ? (
                        <Link href={`/${model.username}`} className="font-medium text-sm text-white hover:text-cyan-300 truncate block transition-colors">
                          {respName}
                        </Link>
                      ) : (
                        <p className="font-medium text-sm text-white truncate">{respName}</p>
                      )}
                      <p className="text-xs text-white/50">
                        {BRAND_SERVICE_LABELS[booking.service_type] || booking.service_type}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-white">
                        {new Date(booking.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 mb-3">
                <Calendar className="h-6 w-6 text-emerald-300" />
              </div>
              <p className="text-sm text-white/60">No upcoming shows</p>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          Favorites
         ────────────────────────────────────────────── */}
      {favoriteModels.length > 0 ? (
        <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
              <h2 className="text-base font-semibold text-white">Favorites</h2>
            </div>
            <Link href="/favorites" className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteModels.slice(0, 4).map((model: any) => (
                <ModelCard key={model.id} model={model} showFavorite={true} isFavorited={true} isLoggedIn={true} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-pink-500/25 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent shadow-[0_0_18px_rgba(236,72,153,0.15)]">
          <div className="p-3 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30">
            <Heart className="h-6 w-6 text-pink-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Save your favorite models</h3>
            <p className="text-sm text-white/60">
              Click the heart icon on models you work with frequently for quick access.
            </p>
          </div>
          <Link
            href="/models"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-sm font-semibold text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
          >
            Browse Models
          </Link>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          Discover Models
         ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Discover models</h2>
          </div>
          <Link href="/models" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </header>
        <div className="p-5">
          {discoverModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {discoverModels.slice(0, 8).map((model: any) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 ring-1 ring-white/10 mb-3">
                <Users className="h-6 w-6 text-white/40" />
              </div>
              <p className="text-sm text-white/60">Explore our top models</p>
              <Link
                href="/models"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-sm font-semibold text-white shadow-[0_0_18px_rgba(34,211,238,0.4)] transition-all"
              >
                <Users className="h-4 w-4" />
                Browse All Models
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
