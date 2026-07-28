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
import { GigsFeed } from "@/components/gigs/GigsFeed";
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
  Flame,
  Sparkles,
  Heart,
  Plane,
} from "lucide-react";
import { ConfirmSpotButton } from "@/components/travel/ConfirmSpotButton";
import { FanDashboard } from "./FanDashboard";
import { BrandDashboard } from "./BrandDashboard";
import { LiveWallServer } from "@/components/live-wall/LiveWallServer";
import { ProfilePhotoBanner } from "@/components/dashboard/ProfilePhotoBanner";
import { AvailabilityToggle } from "@/components/dashboard/AvailabilityToggle";
import { NudgeSlot } from "@/components/dashboard/NudgeSlot";
import { PayoutSetupPrompt } from "@/components/dashboard/PayoutSetupPrompt";
import { PushNudgeCard } from "@/components/dashboard/PushNudgeCard";
import { MODEL_EARNING_ACTIONS, PAYOUT_NUDGE_MIN_COINS } from "@/lib/coin-config";
import { SpotlightAdmirers } from "@/components/dashboard/SpotlightAdmirers";
import { CastingReadiness } from "@/components/dashboard/CastingReadiness";
import { computeCastingReadiness } from "@/lib/casting-readiness";
import { WelcomeBackPulse } from "@/components/dashboard/WelcomeBackPulse";
import { computeWelcomeBackPulse } from "@/lib/welcome-back";
import { getHeroPortrait } from "@/lib/hero-portrait";

// Earned-this-month KPI: sum ledger rows for the current CALENDAR month,
// filtered to MODEL_EARNING_ACTIONS (a model's own `purchase` rows and
// fan-spend actions must not inflate "earned"; negative clawback reversals
// net out — no amount filter, per the coin-config contract).
//
// Deliberately NOT get_earnings_summary: that RPC self-authorizes on
// auth.uid() (20260708000003), which is NULL under this page's service-role
// client, so it silently returns an empty set — and it also counts every
// positive action incl. purchases over a rolling month, which is a
// different number. Paged in 1000s because PostgREST max_rows silently
// truncates any larger response.
async function sumEarningsThisMonth(admin: any, actorId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const PAGE = 1000;
  let total = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (admin.from("coin_transactions") as any)
      .select("amount")
      .eq("actor_id", actorId)
      .in("action", MODEL_EARNING_ACTIONS as unknown as string[])
      .gte("created_at", monthStart)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    total += data.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
    if (data.length < PAGE) break;
  }
  return total;
}

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

  // Unapproved models (e.g. imported profiles signed in before review)
  // wait on the pending page like every other applicant.
  if (!model.is_approved) redirect("/pending-approval");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { data: allBookings },
    { data: rawPortfolioPhotos },
    { count: followerCount },
    { count: views30d },
    earningsThisMonth,
    { count: bankAccountCount },
    { data: payoneerAccount },
    castingReadiness,
    welcomeBack,
    { count: weekSpotlightLikes },
    { count: recentKnocks },
  ] = await Promise.all([
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
    // Identity header stats
    (adminClient.from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", actor.id),
    (adminClient.from("profile_views") as any)
      .select("*", { count: "exact", head: true })
      .eq("model_id", model.id)
      .gte("view_date", thirtyDaysAgo.toISOString().split("T")[0]),
    // Earned-this-month KPI (identity header, taps to /wallet)
    sumEarningsThisMonth(adminClient, actor.id),
    // Payout-nudge eligibility: is any payout method on file?
    // (bank_accounts + payoneer_accounts queries were removed in #73 —
    // re-added here as cheap aggregates; zelle_info rides on the model row.)
    // Only worth asking when the balance clears the nudge threshold — below
    // it the nudge never renders, so skip both queries.
    (model.coin_balance || 0) >= PAYOUT_NUDGE_MIN_COINS
      ? (adminClient.from("bank_accounts") as any)
          .select("id", { count: "exact", head: true })
          .eq("model_id", model.id)
      : Promise.resolve({ count: 0 }),
    (model.coin_balance || 0) >= PAYOUT_NUDGE_MIN_COINS
      ? (adminClient.from("payoneer_accounts") as any)
          .select("id, can_receive_payments")
          .eq("model_id", model.id)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Runway Ready meter — model row already loaded above, pass it through
    computeCastingReadiness(adminClient, model.id, model),
    // Welcome-back pulse — model.last_active_at is still the PREVIOUS visit
    // here (only the client-side ActivityTracker bumps it, after hydration).
    // Short-circuits to null with zero queries when the gap is < 14 days.
    computeWelcomeBackPulse(adminClient, {
      modelId: model.id,
      actorId: actor.id,
      lastActiveAt: model.last_active_at ?? null,
    }),
    // Spotlight likes, AGGREGATE ONLY (weekly; all-time fetched below) —
    // fan-side Spotlight markets right-swipes as anonymous, so no identities
    // ever reach this page. Service client: top_model_votes has no
    // model-facing read path worth relying on, and resolving anything
    // further would cross fans RLS. Same query shape as welcome-back.ts /
    // weekly-digest.
    (adminClient.from("top_model_votes") as any)
      .select("id", { count: "exact", head: true })
      .eq("model_id", model.id)
      .eq("vote_type", "like")
      .gte("created_at", weekAgo.toISOString()),
    // Knocks in the last 14 days — drives the demand-triggered
    // "Available for calls" pill (see identityExtra below).
    (adminClient.from("call_knocks") as any)
      .select("id", { count: "exact", head: true })
      .eq("model_id", model.id)
      .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  // All-time Spotlight likes back the Admirers card, which only renders on a
  // non-zero week — skip the full-table count for the (typical) zero week.
  let allTimeSpotlightLikes = 0;
  if ((weekSpotlightLikes || 0) > 0) {
    const { count } = await (adminClient.from("top_model_votes") as any)
      .select("id", { count: "exact", head: true })
      .eq("model_id", model.id)
      .eq("vote_type", "like");
    allTimeSpotlightLikes = count || 0;
  }

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
      offers!inner (
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
    .eq("offers.status", "open")
    .or(`event_date.is.null,event_date.gte.${new Date().toISOString().split("T")[0]}`, {
      referencedTable: "offers",
    })
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

  // Upcoming EXA Travel trips the model is accepted to (for the trips strip)
  const { data: upcomingTripApps } = await (supabase
    .from("gig_applications") as any)
    .select("id, confirmed_at, gig:gigs!inner(id, slug, title, type, status, start_at, end_at, location_city, location_state)")
    .eq("model_id", model.id)
    .eq("status", "accepted")
    .eq("gig.type", "travel")
    .neq("gig.status", "cancelled");
  const upcomingTrips = (upcomingTripApps || [])
    .filter((a: any) => a.gig?.start_at && new Date(a.gig.end_at || a.gig.start_at) >= new Date())
    .sort((a: any, b: any) => new Date(a.gig.start_at).getTime() - new Date(b.gig.start_at).getTime());

  // Get model's auctions for the priority inbox
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
      .in("action", ["tip_received", "live_wall_tip_received"])
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false }),
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
    // Batched: one .in() with every id fails outright past ~300 UUIDs (16KB
    // URL limit), which would empty the priority inbox for a model with 300+
    // conversations.
    const idBatches: string[][] = [];
    for (let i = 0; i < conversationIds.length; i += 200) {
      idBatches.push(conversationIds.slice(i, i + 200));
    }
    const batchResults = await Promise.all(
      idBatches.map((batch) =>
        (adminClient.from("messages") as any)
          .select("id, conversation_id, sender_id, content, created_at, is_system")
          .in("conversation_id", batch)
          .neq("sender_id", actor.id)
          .eq("is_system", false)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20)
      )
    );
    const messages = batchResults
      .flatMap((r: any) => r.data || [])
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20);

    recentMessages = (messages || []).filter((msg: any) => {
      const lastRead = lastReadMap.get(msg.conversation_id);
      return !lastRead || new Date(msg.created_at) > new Date(lastRead);
    }).slice(0, 10);
  }

  // Enrich activity data with user info
  const tipSenderIds = (recentTips || [])
    .map((t: any) => t.metadata?.sender_id || t.metadata?.tipper_actor_id)
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
        ? (adminClient.from("models") as any).select("id, user_id, username, profile_photo_url").in("user_id", activityModelUserIds)
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
            name: matchedModel.username,
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
      actor: activityActorsMap.get(tip.metadata?.sender_id || tip.metadata?.tipper_actor_id) || null,
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
  // TOP TIPPERS · 7d
  // ============================================
  const tipperTotals = new Map<string, number>();
  for (const tip of recentTips || []) {
    const sid = tip.metadata?.sender_id || tip.metadata?.tipper_actor_id;
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
        ? `$${(o.compensation_amount / 100).toLocaleString()}`
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
    if (a.status === "draft") {
      inboxItems.push({
        id: `auction-${a.id}`,
        kind: "auction",
        urgency: "normal",
        title: a.title,
        sub: "Draft · finish & publish",
        href: `/bids/${a.id}/edit`,
        sortKey: 100_000,
      });
      continue;
    }
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

  // Priority inbox placement: an item in the inbox (offer, booking, bid) is
  // money waiting and outranks browsing gigs, so it renders above Gigs for
  // You. Only rendered when non-empty (see the guard at the call site) — an
  // empty inbox is hidden entirely, not shown as a hollow shell, so the
  // section below always assumes at least one item.
  const priorityInboxSection = (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
      <header className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-rose-400" />
          <h2 className="text-base font-semibold">Priority inbox</h2>
          <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {inboxItems.length}
          </span>
        </div>
        {/* Auction management links surface here only once the model is
            actually running auctions */}
        {(modelAuctions?.length || 0) > 0 && (
          <div className="flex items-center gap-3">
            <Link href="/bids/manage" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Manage bids <ArrowUpRight className="h-3 w-3" />
            </Link>
            <Link href="/bids/new" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Create EXA Bid
            </Link>
          </div>
        )}
      </header>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {inboxItems.map((item) => {
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
                  <span className="text-sm font-bold text-emerald-400 shrink-0">
                    {item.amount}
                  </span>
                )}
                <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
        })}
      </div>
    </section>
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════════
          DESKTOP: 2-column layout — main content left, chats right
          MOBILE: single column, chats appear after gigs
         ══════════════════════════════════════════════════════ */}
      <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-6">

      {/* ── LEFT COLUMN: all dashboard sections ── */}
      <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────
          PROFILE PHOTOS — full-width top row
         ────────────────────────────────────────────────────── */}
      <ProfilePhotoBanner
        username={model.username || ""}
        displayName={displayName}
        profilePhotoUrl={model.profile_photo_url || null}
        heroPhotoUrl={heroSource?.url ?? model.profile_photo_url ?? null}
        portfolioPhotos={portfolioPhotos}
        followerCount={followerCount || 0}
        views30d={views30d || 0}
        earningsThisMonth={earningsThisMonth || 0}
        identityExtra={
          // Demand-triggered (2026-07-28): the pill only occupies the
          // identity header when it has something to say — availability is
          // already on (needs an off switch) or a fan knocked in the last
          // 14 days (the moment worth converting). Permanent placement had
          // converted 4 of 1,401 models; the toggle stays reachable at
          // Settings → Rates for everyone else. Writes via the
          // service-role /api/model/availability route.
          model.available_for_calls || (recentKnocks || 0) > 0 ? (
            <AvailabilityToggle
              initialAvailable={!!model.available_for_calls}
              recentKnocks={recentKnocks || 0}
            />
          ) : undefined
        }
      />

      {/* ──────────────────────────────────────────────────────
          NUDGE SLOT — at most ONE of the cards inside renders per page
          view (declutter convention: the owner deleted nudge piles
          twice). Child order = priority: payout money beats push. Each
          card still runs its own client checks (localStorage snooze,
          Notification.permission) and only claims the slot when it
          would actually show, so a snoozed payout card lets push win.
         ────────────────────────────────────────────────────── */}
      <NudgeSlot>
        {/* PAYOUT NUDGE v2 — single dismissible row, only when there is
            real money (>= first-cashout minimum) AND no payout method on
            file. Eligibility resolved here server-side; the component only
            handles dismissal (14-day localStorage snooze). Not a repeat of
            #73's mistake: no identity/pending states re-implemented — it
            just points at /wallet, which owns all of that. */}
        {(model.coin_balance || 0) >= PAYOUT_NUDGE_MIN_COINS &&
          !model.zelle_info &&
          (bankAccountCount || 0) === 0 &&
          !payoneerAccount?.can_receive_payments && (
            <PayoutSetupPrompt
              coins={model.coin_balance || 0}
              needsIdentity={!model.identity_verified_at}
            />
          )}
        {/* PUSH NUDGE — only for models with money on the books (earned
            this month OR live balance — cheapest proxy for "has ever
            earned", both already computed above). The component itself
            requires push support + permission still undecided + not
            snoozed before claiming the slot. */}
        {((earningsThisMonth || 0) > 0 || (model.coin_balance || 0) > 0) && (
          <PushNudgeCard />
        )}
      </NudgeSlot>

      {/* ──────────────────────────────────────────────────────
          WELCOME BACK — only for genuinely returning models
          (away >= 14 days AND something happened meanwhile)
         ────────────────────────────────────────────────────── */}
      {welcomeBack && (
        <WelcomeBackPulse username={model.username || ""} data={welcomeBack} />
      )}

      {/* ──────────────────────────────────────────────────────
          UPCOMING TRIPS — accepted EXA Travel trips; unconfirmed
          spots need action so this sits above the Runway Ready meter
         ────────────────────────────────────────────────────── */}
      {upcomingTrips.length > 0 && (
        <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-violet-400" />
              <h3 className="text-sm font-semibold">Upcoming trips</h3>
            </div>
            <Link href="/trips" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              My Trips <ArrowUpRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="p-3 space-y-2">
            {upcomingTrips.slice(0, 2).map((app: any) => (
              <div
                key={app.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03]"
              >
                <div className="flex-1 min-w-0">
                  <Link href={`/travel/${app.gig.slug}`} className="text-sm font-medium text-white hover:text-violet-300 truncate block">
                    {app.gig.title}
                  </Link>
                  <p className="text-xs text-white/50">
                    {[app.gig.location_city, app.gig.location_state].filter(Boolean).join(", ")}
                    {app.gig.start_at &&
                      ` · ${new Date(app.gig.start_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </p>
                </div>
                {app.confirmed_at ? (
                  <span className="text-xs font-semibold text-emerald-400 shrink-0">✓ Confirmed</span>
                ) : (
                  <ConfirmSpotButton applicationId={app.id} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────────────────
          RUNWAY READY — the single onboarding/readiness meter
          (absorbed the old GettingStartedChecklist, 2026-07-22)
         ────────────────────────────────────────────────────── */}
      <CastingReadiness
        score={castingReadiness.score}
        items={castingReadiness.items}
        username={model.username || ""}
      />

      {/* ──────────────────────────────────────────────────────
          PRIORITY INBOX — only rendered when there's money waiting
          (offer, booking, or auction bid). When empty it's hidden
          entirely rather than shown as a hollow shell.
         ────────────────────────────────────────────────────── */}
      {inboxItems.length > 0 && priorityInboxSection}

      {/* ──────────────────────────────────────────────────────
          SPOTLIGHT ADMIRERS — aggregate-only likes card + thank-you
          blast CTA. Promoted above gigs (2026-07-28): Spotlight likes
          are the platform's highest-frequency positive signal (~415
          models/month), so on a quiet marketplace week this is often
          the only good news the page has. Still renders nothing on a
          zero week (declutter).
         ────────────────────────────────────────────────────── */}
      {(weekSpotlightLikes || 0) > 0 && (
        <SpotlightAdmirers
          weekLikes={weekSpotlightLikes || 0}
          allTimeLikes={allTimeSpotlightLikes || 0}
        />
      )}

      {/* ──────────────────────────────────────────────────────
          GIGS FOR YOU — full-width when there ARE open gigs. With
          zero open gigs this hero was the loudest element on the page
          telling every model "nothing here" every visit — same
          hollow-shell treatment as the Priority inbox above.
         ────────────────────────────────────────────────────── */}
      {(gigs?.length || 0) > 0 && (
        <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
          <GigsFeed
            gigs={gigs || []}
            modelApplications={modelApplications || []}
            isApproved={model.is_approved}
          />
        </section>
      )}

      {/* Mobile-only: EXA Live Wall appears here after gigs. Kept even
          on quiet weeks: the wall self-collapses to a one-line gig
          teaser after 7 quiet days and gig heartbeats revive it, so it
          manages its own footprint. */}
      <div className="lg:hidden" data-live-wall>
        <LiveWallServer actorId={actor.id} actorType={actor.type} />
      </div>

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
            <div className="col-span-full flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-4 px-3 text-center">
              <p className="text-sm text-white/60">
                No activity this week — share your profile to get tips, follows, and messages.
              </p>
              {model.username && (
                <Link
                  href={`/${model.username}`}
                  className="text-sm text-pink-400 hover:text-pink-300 flex items-center gap-1 shrink-0"
                >
                  View your profile <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
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
                        <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
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
                      {item.type === "follower" && <span className="text-white/60">became a fan</span>}
                      {item.type === "message" && <span className="text-white/60">sent a message</span>}
                    </p>
                    {item.type === "message" && item.messagePreview && (
                      <p className="text-[11px] text-white/50 truncate">&ldquo;{item.messagePreview}&rdquo;</p>
                    )}
                  </div>
                  <span className="text-[11px] text-white/50 shrink-0">{timeAgo}</span>
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
      <aside
        className="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-6rem)]"
        data-live-wall
      >
        <LiveWallServer actorId={actor.id} actorType={actor.type} compact />
      </aside>

      </div>{/* end 2-column layout */}
    </div>
  );
}

