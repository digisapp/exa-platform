import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";

// Admin client for bypassing RLS on specific queries
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Disable caching to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GigsFeed } from "@/components/gigs/GigsFeed";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Coins,
  UserPlus,
  MessageCircle,
  Gavel,
  Plus,
  TrendingUp,
  Flame,
  Sparkles,
  Zap,
  Heart,
  Clock,
} from "lucide-react";
import { formatCoins } from "@/lib/coin-config";
import { FanDashboard } from "./FanDashboard";
import { BrandDashboard } from "./BrandDashboard";
import { LiveWallServer } from "@/components/live-wall/LiveWallServer";
import { ProfilePhotoBanner } from "@/components/dashboard/ProfilePhotoBanner";
import { getHeroPortrait } from "@/lib/hero-portrait";

// Helper function to format relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Get actor info to determine dashboard type
  const { data: actor } = await (supabase.from("actors") as any)
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor) redirect("/fan/signup");

  // For admins, redirect to admin dashboard
  if (actor.type === "admin") {
    redirect("/admin");
  }

  // For fans, check if they have a pending model application
  if (actor.type === "fan") {
    const { data: pendingApp } = await (supabase.from("model_applications") as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .single();

    if (pendingApp) {
      redirect("/pending-approval");
    }

    return <FanDashboard actorId={actor.id} />;
  }

  // For brands, show brand dashboard
  if (actor.type === "brand") {
    return <BrandDashboard actorId={actor.id} />;
  }

  // For models, get model data
  const { data: model } = await (supabase.from("models") as any)
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/fan/signup");

  // Stats queries: this month + previous month earnings + bookings + portfolio photos (parallel)
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const [
    { data: monthlyTransactions },
    { data: previousMonthTransactions },
    { data: allBookings },
    { data: rawPortfolioPhotos },
  ] = await Promise.all([
    (adminClient.from("coin_transactions") as any)
      .select("amount, created_at")
      .eq("actor_id", actor.id)
      .gt("amount", 0)
      .gte("created_at", oneMonthAgo.toISOString()),
    (adminClient.from("coin_transactions") as any)
      .select("amount")
      .eq("actor_id", actor.id)
      .gt("amount", 0)
      .gte("created_at", twoMonthsAgo.toISOString())
      .lt("created_at", oneMonthAgo.toISOString()),
    // Get pending bookings for this model - use adminClient to bypass RLS
    (adminClient.from("bookings") as any)
      .select("*")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(20),
    // Portfolio photos for profile banner portrait picker
    (supabase as any)
      .from("content_items")
      .select("id, media_url, media_type, width, height, is_primary, created_at")
      .eq("model_id", model.id)
      .eq("status", "portfolio")
      .eq("media_type", "image")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const thisMonthEarnings = (monthlyTransactions || []).reduce((sum: number, t: any) => sum + t.amount, 0);
  const prevMonthEarnings = (previousMonthTransactions || []).reduce((sum: number, t: any) => sum + t.amount, 0);
  const monthDeltaPct = prevMonthEarnings > 0
    ? Math.round(((thisMonthEarnings - prevMonthEarnings) / prevMonthEarnings) * 100)
    : (thisMonthEarnings > 0 ? 100 : 0);

  // Filter for pending/counter bookings in JS
  const pendingBookings = (allBookings || []).filter(
    (b: any) => b.status === "pending" || b.status === "counter"
  ).slice(0, 5);

  // Enrich bookings with client info using batch queries (avoiding N+1)
  if (pendingBookings && pendingBookings.length > 0) {
    const clientIds: string[] = pendingBookings
      .map((b: any) => b.client_id as string | null)
      .filter((id: string | null): id is string => id !== null && id !== undefined);
    const uniqueClientIds = [...new Set(clientIds)];

    if (uniqueClientIds.length > 0) {
      const { data: actors } = await (adminClient.from("actors") as any)
        .select("id, type")
        .in("id", uniqueClientIds);
      const actorsMap = new Map<string, { id: string; type: string }>((actors || []).map((a: any) => [a.id, a]));

      const fanIds = uniqueClientIds.filter(id => actorsMap.get(id)?.type === "fan");
      const brandIds = uniqueClientIds.filter(id => actorsMap.get(id)?.type === "brand");

      const [fansResult, brandsResult] = await Promise.all([
        fanIds.length > 0
          ? (adminClient.from("fans") as any).select("id, display_name, avatar_url").in("id", fanIds)
          : { data: [] },
        brandIds.length > 0
          ? (adminClient.from("brands") as any).select("id, company_name, logo_url").in("id", brandIds)
          : { data: [] },
      ]);

      const fansMap = new Map((fansResult.data || []).map((f: any) => [f.id, f]));
      const brandsMap = new Map((brandsResult.data || []).map((b: any) => [b.id, b]));

      for (const booking of pendingBookings) {
        if (booking.client_id) {
          const clientActor = actorsMap.get(booking.client_id);
          if (clientActor?.type === "fan") {
            const fan = fansMap.get(booking.client_id);
            booking.client = fan ? { ...fan, type: "fan" } : null;
          } else if (clientActor?.type === "brand") {
            const brand = brandsMap.get(booking.client_id);
            booking.client = brand ? { ...brand, type: "brand" } : null;
          }
        }
      }
    }
  }

  // Get pending offers for this model
  const { data: offerResponses } = await (adminClient
    .from("offer_responses") as any)
    .select(`
      id,
      status,
      offer_id,
      offers (
        id,
        title,
        event_date,
        event_time,
        location_name,
        location_city,
        compensation_type,
        compensation_amount,
        compensation_description,
        created_at,
        brand_id
      )
    `)
    .eq("model_id", model.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  // Enrich with brand info using batch query
  const pendingOffers: any[] = [];
  if (offerResponses && offerResponses.length > 0) {
    const brandIds = [...new Set(offerResponses.map((r: any) => r.offers?.brand_id).filter(Boolean))];

    if (brandIds.length > 0) {
      const { data: brands } = await (adminClient.from("brands") as any)
        .select("id, company_name, logo_url")
        .in("id", brandIds);
      const brandsMap = new Map((brands || []).map((b: any) => [b.id, b]));

      for (const response of offerResponses) {
        if (response.offers?.brand_id) {
          response.brand = brandsMap.get(response.offers.brand_id) || null;
          pendingOffers.push(response);
        }
      }
    }
  }

  // Get open gigs
  const { data: gigs } = await (supabase
    .from("gigs") as any)
    .select("id, slug, title, type, description, location_city, location_state, start_at, compensation_type, compensation_amount, spots, spots_filled")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("start_at", { ascending: true })
    .limit(5);

  // Get model's applications
  const { data: modelApplications } = await (supabase
    .from("gig_applications") as any)
    .select("gig_id, status")
    .eq("model_id", model.id);

  // Get model's auctions for EXA Bids section
  const { data: modelAuctions } = await (supabase as any)
    .from("auctions")
    .select("id, title, status, current_bid, starting_price, bid_count, ends_at, category")
    .eq("model_id", model.id)
    .in("status", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(5);

  // ============================================
  // RECENT ACTIVITY FEED
  // ============================================

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    { data: recentTips },
    { data: recentFollowers },
    { data: modelParticipations },
  ] = await Promise.all([
    (adminClient.from("coin_transactions") as any)
      .select("id, amount, created_at, metadata")
      .eq("actor_id", actor.id)
      .eq("action", "tip_received")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    (adminClient.from("follows") as any)
      .select("follower_id, created_at")
      .eq("following_id", actor.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
    (supabase.from("conversation_participants") as any)
      .select("conversation_id, last_read_at")
      .eq("actor_id", actor.id),
  ]);

  const conversationIds = modelParticipations?.map((p: any) => p.conversation_id) || [];
  const lastReadMap = new Map<string, string | null>((modelParticipations || []).map((p: any) => [p.conversation_id, p.last_read_at]));

  let recentMessages: any[] = [];
  if (conversationIds.length > 0) {
    const { data: messages } = await (adminClient
      .from("messages") as any)
      .select("id, conversation_id, sender_id, content, created_at, is_system")
      .in("conversation_id", conversationIds)
      .neq("sender_id", actor.id)
      .eq("is_system", false)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    recentMessages = (messages || []).filter((msg: any) => {
      const lastRead = lastReadMap.get(msg.conversation_id);
      return !lastRead || new Date(msg.created_at) > new Date(lastRead);
    }).slice(0, 10);
  }

  // Enrich activity data with user info
  const tipSenderIds = (recentTips || [])
    .map((t: any) => t.metadata?.sender_id)
    .filter(Boolean);
  const followerIds = (recentFollowers || [])
    .map((f: any) => f.follower_id)
    .filter(Boolean);
  const messageSenderIds = recentMessages
    .map((m: any) => m.sender_id)
    .filter(Boolean);

  const allActivityActorIds = [...new Set([...tipSenderIds, ...followerIds, ...messageSenderIds])];

  const activityActorsMap = new Map<string, any>();
  if (allActivityActorIds.length > 0) {
    const { data: activityActors } = await (adminClient.from("actors") as any)
      .select("id, type, user_id")
      .in("id", allActivityActorIds);

    const actorTypes = new Map<string, any>((activityActors || []).map((a: any) => [a.id, a]));

    const activityFanIds = allActivityActorIds.filter(id => actorTypes.get(id)?.type === "fan");
    const activityBrandIds = allActivityActorIds.filter(id => actorTypes.get(id)?.type === "brand");
    const activityModelUserIds = (activityActors || [])
      .filter((a: any) => a.type === "model" && a.user_id)
      .map((a: any) => a.user_id);

    const [activityFans, activityBrands, activityModels] = await Promise.all([
      activityFanIds.length > 0
        ? (adminClient.from("fans") as any).select("id, display_name, username, avatar_url").in("id", activityFanIds)
        : { data: [] },
      activityBrandIds.length > 0
        ? (adminClient.from("brands") as any).select("id, company_name, username, logo_url").in("id", activityBrandIds)
        : { data: [] },
      activityModelUserIds.length > 0
        ? (adminClient.from("models") as any).select("id, user_id, first_name, last_name, username, profile_photo_url").in("user_id", activityModelUserIds)
        : { data: [] },
    ]);

    for (const fan of activityFans.data || []) {
      activityActorsMap.set(fan.id, {
        type: "fan",
        name: fan.display_name || fan.username || "Fan",
        avatar: fan.avatar_url,
        username: fan.username || null,
      });
    }
    for (const brand of activityBrands.data || []) {
      activityActorsMap.set(brand.id, {
        type: "brand",
        name: brand.company_name || "Brand",
        avatar: brand.logo_url,
        username: brand.username || null,
      });
    }
    for (const actorData of activityActors || []) {
      if (actorData.type === "model") {
        const matchedModel = (activityModels.data || []).find((m: any) => m.user_id === actorData.user_id);
        if (matchedModel) {
          activityActorsMap.set(actorData.id, {
            type: "model",
            name: matchedModel.first_name
              ? `${matchedModel.first_name} ${matchedModel.last_name || ""}`.trim()
              : matchedModel.username,
            avatar: matchedModel.profile_photo_url,
            username: matchedModel.username
          });
        }
      }
    }
  }

  // Build unified activity feed
  type ActivityItem = {
    id: string;
    type: "tip" | "follower" | "message";
    actor: { name: string; avatar: string | null; type: string; username?: string } | null;
    amount?: number;
    messagePreview?: string;
    conversationId?: string;
    createdAt: string;
  };

  const activityFeed: ActivityItem[] = [
    ...(recentTips || []).map((tip: any) => ({
      id: `tip-${tip.id}`,
      type: "tip" as const,
      actor: activityActorsMap.get(tip.metadata?.sender_id) || null,
      amount: tip.amount,
      createdAt: tip.created_at,
    })),
    ...(recentFollowers || []).map((follow: any) => ({
      id: `follow-${follow.follower_id}-${follow.created_at}`,
      type: "follower" as const,
      actor: activityActorsMap.get(follow.follower_id) || null,
      createdAt: follow.created_at,
    })),
    ...recentMessages.map((msg: any) => ({
      id: `msg-${msg.id}`,
      type: "message" as const,
      actor: activityActorsMap.get(msg.sender_id) || null,
      messagePreview: msg.content?.slice(0, 50) + (msg.content?.length > 50 ? "..." : ""),
      conversationId: msg.conversation_id,
      createdAt: msg.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // ============================================
  // 7-DAY AGGREGATES + TOP TIPPERS
  // ============================================
  const tips7dTotal = (recentTips || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);


  const tipperTotals = new Map<string, number>();
  for (const tip of recentTips || []) {
    const sid = tip.metadata?.sender_id;
    if (!sid) continue;
    tipperTotals.set(sid, (tipperTotals.get(sid) || 0) + (tip.amount || 0));
  }
  const topTippers = Array.from(tipperTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, amount]) => ({ actor: activityActorsMap.get(id) || null, amount }));

  // ============================================
  // PRIORITY INBOX (offers + bookings + auctions, urgency-ranked)
  // ============================================
  type InboxItem = {
    id: string;
    kind: "offer" | "booking" | "auction";
    urgency: "hot" | "warm" | "normal";
    title: string;
    sub: string;
    amount?: string;
    avatarUrl?: string | null;
    fallbackInitial?: string;
    href: string;
    sortKey: number; // higher = more urgent
  };

  const nowMs = Date.now();
  const inboxItems: InboxItem[] = [];

  for (const r of pendingOffers) {
    const o = r.offers;
    if (!o) continue;
    const eventTs = o.event_date ? new Date(o.event_date).getTime() : Number.MAX_SAFE_INTEGER;
    const daysAway = Math.max(0, (eventTs - nowMs) / 86_400_000);
    const urgency: InboxItem["urgency"] = daysAway < 3 ? "hot" : daysAway < 14 ? "warm" : "normal";
    const amount =
      o.compensation_type === "paid" && o.compensation_amount
        ? `$${o.compensation_amount}`
        : o.compensation_description || undefined;
    const sub = [
      r.brand?.company_name || "Brand",
      o.event_date ? new Date(o.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    inboxItems.push({
      id: `offer-${r.id}`,
      kind: "offer",
      urgency,
      title: o.title,
      sub,
      amount,
      avatarUrl: r.brand?.logo_url || null,
      fallbackInitial: (r.brand?.company_name || "B").charAt(0).toUpperCase(),
      href: `/offers/${o.id}`,
      sortKey: 1_000_000 - daysAway * 100, // offers always near top
    });
  }

  for (const b of pendingBookings || []) {
    const eventTs = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
    const daysAway = Math.max(0, (eventTs - nowMs) / 86_400_000);
    const urgency: InboxItem["urgency"] = b.status === "counter" || daysAway < 2 ? "hot" : daysAway < 7 ? "warm" : "normal";
    const clientName = b.client?.company_name || b.client?.display_name || "Client";
    inboxItems.push({
      id: `booking-${b.id}`,
      kind: "booking",
      urgency,
      title: b.status === "counter" ? `Counter-offer · ${clientName}` : `Booking request · ${clientName}`,
      sub: [
        b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date",
        b.total_amount ? `${b.total_amount.toLocaleString()} coins` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      amount: b.total_amount ? `${b.total_amount.toLocaleString()}c` : undefined,
      avatarUrl: b.client?.avatar_url || b.client?.logo_url || null,
      fallbackInitial: clientName.charAt(0).toUpperCase(),
      href: "/bookings",
      sortKey: 800_000 - daysAway * 100,
    });
  }

  for (const a of (modelAuctions || [])) {
    if (a.status !== "active") continue; // drafts not "inbox-worthy"
    const endsTs = a.ends_at ? new Date(a.ends_at).getTime() : Number.MAX_SAFE_INTEGER;
    const hoursLeft = Math.max(0, (endsTs - nowMs) / 3_600_000);
    const urgency: InboxItem["urgency"] = hoursLeft < 6 ? "hot" : hoursLeft < 24 ? "warm" : "normal";
    inboxItems.push({
      id: `auction-${a.id}`,
      kind: "auction",
      urgency,
      title: a.title,
      sub: `${a.bid_count || 0} bids · ends ${hoursLeft < 24 ? `in ${Math.round(hoursLeft)}h` : new Date(a.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      amount: `${(a.current_bid || a.starting_price || 0).toLocaleString()}c`,
      href: `/bids/${a.id}`,
      sortKey: 600_000 - hoursLeft * 1000,
    });
  }

  inboxItems.sort((a, b) => b.sortKey - a.sortKey);

  // ============================================
  // PROFILE BANNER — hero portrait + avatar
  // ============================================
  const resolveMediaUrl = (url: string) =>
    url.startsWith("http")
      ? url
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;

  const portfolioPhotos = (rawPortfolioPhotos || []).map((p: any) => ({
    id: p.id as string,
    url: resolveMediaUrl(p.media_url),
    width: (p.width ?? null) as number | null,
    height: (p.height ?? null) as number | null,
    is_primary: !!p.is_primary,
  }));

  const heroSource = getHeroPortrait({
    profilePhotoUrl: model.profile_photo_url ?? null,
    profilePhotoWidth: model.profile_photo_width ?? null,
    profilePhotoHeight: model.profile_photo_height ?? null,
    portfolioPhotos: portfolioPhotos.map((p: any) => ({
      url: p.url,
      width: p.width,
      height: p.height,
      isPrimary: p.is_primary,
    })),
  });

  const displayName = model.first_name
    ? `${model.first_name} ${model.last_name || ""}`.trim()
    : model.username || "Model";

  return (
    <div className="max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════════
          DESKTOP: 2-column layout — main content left, chats right
          MOBILE: single column, chats appear after gigs
         ══════════════════════════════════════════════════════ */}
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6">

      {/* ── LEFT COLUMN: all dashboard sections ── */}
      <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────
          PROFILE PHOTOS + KPI RAIL (shared row on desktop)
         ────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Profile photos — left column */}
        <ProfilePhotoBanner
          username={model.username || ""}
          displayName={displayName}
          profilePhotoUrl={model.profile_photo_url || null}
          heroPhotoUrl={heroSource?.url ?? model.profile_photo_url ?? null}
          portfolioPhotos={portfolioPhotos}
        />

        {/* KPI cards — right column, stacked vertically to match Profile Pictures height */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          <Link href="/wallet" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-3 transition-all hover:border-amber-500/40 hover:bg-white/[0.08] flex items-center gap-4">
            <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4 w-full">
              <Coins className="h-5 w-5 text-amber-400 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wider text-white/60">Coins</span>
              <p className="ml-auto text-2xl font-bold tracking-tight">{formatCoins(model.coin_balance || 0)}</p>
            </div>
          </Link>

          <Link href="/analytics" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-3 transition-all hover:border-emerald-500/40 hover:bg-white/[0.08] flex items-center gap-4">
            <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-emerald-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4 w-full">
              <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wider text-white/60">Views</span>
              <p className="ml-auto text-2xl font-bold tracking-tight">{formatCoins(thisMonthEarnings)}</p>
            </div>
          </Link>

          <Link href="/wallet" className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-3 transition-all hover:border-pink-500/40 hover:bg-white/[0.08] flex items-center gap-4">
            <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-pink-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-4 w-full">
              <Zap className="h-5 w-5 text-pink-400 shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wider text-white/60">Tips</span>
              <p className="ml-auto text-2xl font-bold tracking-tight">{formatCoins(tips7dTotal)}</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          GIGS FOR YOU — full-width, prominent placement
         ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
        <GigsFeed
          gigs={gigs || []}
          modelApplications={modelApplications || []}
          isApproved={model.is_approved}
        />
      </section>

      {/* ──────────────────────────────────────────────────────
          PRIORITY INBOX — full-width
         ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold">Priority inbox</h2>
            {inboxItems.length > 0 && (
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {inboxItems.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Clock className="h-3.5 w-3.5" /> sorted by urgency
          </div>
        </header>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {inboxItems.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <div className="p-4 rounded-full bg-white/5 inline-block mb-3">
                <Sparkles className="h-7 w-7 text-white/30" />
              </div>
              <p className="text-sm text-white/60">All caught up — no urgent items.</p>
              <p className="text-xs text-white/40 mt-1">New offers, bookings, and ending auctions will appear here.</p>
            </div>
          ) : (
            inboxItems.map((item) => {
              const tagMap = { offer: "Offer", booking: "Booking", auction: "Auction" } as const;
              const iconMap = {
                offer: <DollarSign className="h-5 w-5 text-emerald-400" />,
                booking: <Calendar className="h-5 w-5 text-cyan-400" />,
                auction: <Gavel className="h-5 w-5 text-violet-400" />,
              } as const;
              const dotMap = {
                hot: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]",
                warm: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]",
                normal: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]",
              } as const;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all group"
                >
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotMap[item.urgency]}`} />
                  {item.avatarUrl ? (
                    <Image
                      src={item.avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                      {iconMap[item.kind]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
                      {tagMap[item.kind]}
                    </p>
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-white/50 truncate">{item.sub}</p>
                  </div>
                  {item.amount && (
                    <span className="hidden sm:inline text-sm font-bold text-emerald-400 shrink-0">
                      {item.amount}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Mobile-only: EXA Live Wall appears here after gigs */}
      <div className="lg:hidden">
        <LiveWallServer actorId={actor.id} actorType={actor.type} />
      </div>

      {/* ──────────────────────────────────────────────────────
          EXA BIDS — full-width
         ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-pink-500/5 to-transparent overflow-hidden">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-violet-400" />
            <h2 className="text-base font-semibold">Your EXA Bids</h2>
            {(modelAuctions?.length || 0) > 0 && (
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {modelAuctions?.length}
              </span>
            )}
          </div>
          <Link href="/bids/manage" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Manage <ArrowUpRight className="h-3 w-3" />
          </Link>
        </header>
        <div className="p-3">
          {(modelAuctions?.length || 0) > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {modelAuctions?.map((auction: any) => (
                <Link
                  key={auction.id}
                  href={auction.status === "draft" ? `/bids/${auction.id}/edit` : `/bids/${auction.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-violet-500/40 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center shrink-0">
                    <Gavel className="h-5 w-5 text-violet-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{auction.title}</p>
                    <p className="text-xs text-white/50">
                      {auction.bid_count || 0} bids
                      {auction.status === "active" && auction.ends_at && (
                        <> · ends {new Date(auction.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-amber-400">
                      {(auction.current_bid || auction.starting_price || 0).toLocaleString()}c
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        auction.status === "active"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0"
                      }
                    >
                      {auction.status === "active" ? "Live" : "Draft"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 rounded-full bg-violet-500/10 inline-block mb-3">
                <Gavel className="h-7 w-7 text-violet-400" />
              </div>
              <p className="text-sm text-white/70">No EXA Bids yet</p>
              <p className="text-xs text-white/40 mt-1 max-w-xs mx-auto">
                Let fans and brands compete in real-time bids for your exclusive content & experiences.
              </p>
              <Button asChild size="sm" className="mt-4 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white">
                <Link href="/bids/new">
                  <Plus className="h-4 w-4 mr-1" />
                  Create EXA Bid
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
          ACTIVITY — full-width
         ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <h3 className="text-sm font-semibold">Activity</h3>
          </div>
        </header>
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1">
          {activityFeed.length === 0 ? (
            <p className="col-span-full text-xs text-white/40 text-center py-4">No activity this week.</p>
          ) : (
            activityFeed.slice(0, 6).map((item) => {
              const timeAgo = getTimeAgo(item.createdAt);
              const href =
                item.type === "message" && item.conversationId
                  ? `/chats/${item.conversationId}`
                  : item.type === "follower" && item.actor?.username
                    ? `/${item.actor.username}`
                    : item.type === "tip"
                      ? "/wallet"
                      : "/followers";
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {item.actor?.avatar ? (
                    <Image
                      src={item.actor.avatar}
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      {item.type === "tip" ? (
                        <Coins className="h-4 w-4 text-amber-400" />
                      ) : item.type === "follower" ? (
                        <UserPlus className="h-4 w-4 text-pink-400" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">
                      <span className="font-semibold">{item.actor?.name || "Someone"}</span>{" "}
                      {item.type === "tip" && (
                        <span className="text-white/60">
                          tipped <span className="text-amber-400 font-semibold">{item.amount}c</span>
                        </span>
                      )}
                      {item.type === "follower" && <span className="text-white/60">followed you</span>}
                      {item.type === "message" && <span className="text-white/60">sent a message</span>}
                    </p>
                    {item.type === "message" && item.messagePreview && (
                      <p className="text-[11px] text-white/40 truncate">&ldquo;{item.messagePreview}&rdquo;</p>
                    )}
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0">{timeAgo}</span>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {topTippers.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400 fill-rose-400" />
              <h3 className="text-sm font-semibold">Top tippers · 7d</h3>
            </div>
          </header>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topTippers.map((t, i) => (
              <div key={`${t.actor?.name || "anon"}-${i}`} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03]">
                <span className={`w-5 text-center text-xs font-bold ${
                  i === 0 ? "text-amber-400" : i === 1 ? "text-white/70" : "text-amber-700"
                }`}>
                  {i + 1}
                </span>
                {t.actor?.avatar ? (
                  <Image
                    src={t.actor.avatar}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-white/40" />
                  </div>
                )}
                <span className="flex-1 text-xs font-medium truncate">{t.actor?.name || "Someone"}</span>
                <span className="text-xs font-bold text-amber-400">{t.amount}c</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tiny footer pad to clear bottom nav */}
      <div className="h-2" />
      </div>{/* end left column */}

      {/* ── RIGHT COLUMN: EXA Live Wall (desktop only) ── */}
      <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-2rem)]">
        <LiveWallServer actorId={actor.id} actorType={actor.type} compact />
      </aside>

      </div>{/* end 2-column layout */}
    </div>
  );
}

