import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { ModelFilters } from "@/components/models/model-filters";
import { ModelCard } from "@/components/models/model-card";
import { ModelsGrid } from "@/components/models/models-grid";
import { BrandPaywallWrapper } from "@/components/brands/BrandPaywallWrapper";
import { FanCoinGateWrapper } from "@/components/fans/FanCoinGate";
import { escapeIlike } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Browse Models",
  description: "Browse and book professional models for photoshoots, events, and brand collaborations on EXA Models.",
  openGraph: {
    title: "Browse Models",
    description: "Browse and book professional models for photoshoots, events, and brand collaborations on EXA Models.",
  },
};

// Cache model list for 2 minutes - balance between freshness and performance
export const revalidate = 120;

// Only select fields needed for model cards
const MODEL_CARD_FIELDS = `
  id, username, first_name, profile_photo_url, is_verified, is_featured,
  last_active_at, reliability_score, show_location, city, state, height,
  show_measurements, instagram_followers, tiktok_followers, focus_tags
`;

interface SearchParams {
  q?: string;
  state?: string;
  level?: string;
  sort?: string;
  focus?: string;
  height?: string;
  collabs?: string;
  platform?: string;
  cpm?: string;
  engagement?: string;
  ig_followers?: string;
  tt_followers?: string;
  page?: string;
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Require authentication - guests cannot view models
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirect=/models");
  }

  // Check actor type - models cannot access this page
  const { data: actorCheck } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single() as { data: { type: string } | null };

  if (actorCheck?.type === "model") {
    redirect("/dashboard");
  }

  // Helper to apply all active filters to a query
  function applyFilters(q: any): any {
    if (params.q) {
      q = q.or(`username.ilike.%${escapeIlike(params.q)}%,first_name.ilike.%${escapeIlike(params.q)}%,last_name.ilike.%${escapeIlike(params.q)}%`);
    }
    if (params.state) q = q.eq("state", params.state);
    if (params.level === "verified") q = q.eq("is_verified", true);
    else if (params.level === "featured") q = q.eq("is_featured", true);
    if (params.focus) q = q.contains("focus_tags", [params.focus]);
    if (params.collabs === "1") {
      q = q.eq("open_to_collabs", true);
      // Platform filter — require the platform's rate to be set
      if (params.platform === "instagram") q = q.not("instagram_collab_rate", "is", null);
      else if (params.platform === "tiktok") q = q.not("tiktok_collab_rate", "is", null);
      // CPM filter — uses the stored CPM column for the selected (or default instagram) platform
      const cpmCol = params.platform === "tiktok" ? "tiktok_cpm" : "instagram_cpm";
      if (params.cpm) {
        const cpmRanges: Record<string, [number, number]> = {
          under5:  [0,     5],
          "5to15": [5,    15],
          "15to30":[15,   30],
          "30plus":[30, 9999],
        };
        const range = cpmRanges[params.cpm];
        if (range) q = q.gte(cpmCol, range[0]).lte(cpmCol, range[1]);
      }
      // Engagement rate filter (Instagram only for now)
      if (params.engagement) {
        q = q.gte("instagram_engagement_rate", parseFloat(params.engagement));
      }
    }
    if (params.height) {
      const heightPatterns: Record<string, string[]> = {
        under54:  ["4'%", "5'0%", "5'1\"", "5'1", "5'2%", "5'3%"],
        "54up":   ["5'4%", "5'5%", "5'6%", "5'7%", "5'8%", "5'9%", "5'10%", "5'11%", "6'%"],
        "57up":   ["5'7%", "5'8%", "5'9%", "5'10%", "5'11%", "6'%"],
        "510up":  ["5'10%", "5'11%", "6'%"],
      };
      const patterns = heightPatterns[params.height];
      if (patterns) q = q.or(patterns.map(p => `height.ilike.${p}`).join(","));
    }
    const followerMinMap: Record<string, number> = {
      "1k": 1_000, "10k": 10_000, "50k": 50_000,
      "100k": 100_000, "500k": 500_000, "1m": 1_000_000,
    };
    if (params.ig_followers && followerMinMap[params.ig_followers]) {
      q = q.gte("instagram_followers", followerMinMap[params.ig_followers]);
    }
    if (params.tt_followers && followerMinMap[params.tt_followers]) {
      q = q.gte("tiktok_followers", followerMinMap[params.tt_followers]);
    }
    return q;
  }

  // Pagination
  const PAGE_SIZE = 40;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Build models query with specific fields instead of SELECT *
  let modelsQuery = applyFilters(
    supabase.from("models").select(MODEL_CARD_FIELDS).eq("is_approved", true).is("deleted_at", null).not("profile_photo_url", "is", null)
  );

  // Sort — always prioritize live models (active in last 5 min) at the top
  modelsQuery = modelsQuery.order("last_active_at", { ascending: false, nullsFirst: true });

  switch (params.sort) {
    case "followers":
      modelsQuery = modelsQuery.order("instagram_followers", { ascending: false, nullsFirst: false });
      break;
    case "cpm_low":
      modelsQuery = modelsQuery.order(params.platform === "tiktok" ? "tiktok_cpm" : "instagram_cpm", { ascending: true, nullsFirst: false });
      break;
    case "cpm_high":
      modelsQuery = modelsQuery.order(params.platform === "tiktok" ? "tiktok_cpm" : "instagram_cpm", { ascending: false, nullsFirst: false });
      break;
    case "name":
      modelsQuery = modelsQuery.order("first_name", { ascending: true });
      break;
    default:
      modelsQuery = modelsQuery.order("created_at", { ascending: false });
  }

  modelsQuery = modelsQuery.range(offset, offset + PAGE_SIZE - 1);

  // Run independent queries in parallel (#1: parallelize DB queries)
  const [
    { data: models },
    { count: totalCount },
    { data: featured },
    { data: actor },
  ] = await Promise.all([
    // Models for current page
    modelsQuery as Promise<{ data: any[] | null; error: any }>,
    // Count query — same filters, no range/sort
    applyFilters(
      supabase.from("models").select("*", { count: "exact", head: true }).eq("is_approved", true).is("deleted_at", null).not("profile_photo_url", "is", null)
    ) as Promise<{ count: number | null }>,
    // Featured models
    (supabase
      .from("models") as any)
      .select("id, username, first_name, profile_photo_url")
      .eq("is_featured", true)
      .eq("is_approved", true)
      .is("deleted_at", null)
      .not("profile_photo_url", "is", null)
      .limit(5) as Promise<{ data: any[] | null }>,
    // Actor info
    (supabase
      .from("actors") as any)
      .select("id, type")
      .eq("user_id", user.id)
      .single() as Promise<{ data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null }>,
  ]);

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Now run actor-dependent queries in parallel
  let favoriteModelIds: string[] = [];
  const actorType: "model" | "fan" | "brand" | "admin" | null = actor?.type || null;
  let profileData: any = null;
  let coinBalance = 0;

  if (actor) {
    // Profile query and favorites query are independent — run in parallel
    const [profileResult, favoritesResult] = await Promise.all([
      // Profile info based on actor type
      actor.type === "model" || actor.type === "admin"
        ? (supabase.from("models") as any).select("username, first_name, last_name, profile_photo_url, coin_balance").eq("user_id", user.id).single() as Promise<{ data: any }>
        : actor.type === "fan"
          ? (supabase.from("fans") as any).select("display_name, avatar_url, coin_balance").eq("id", actor.id).single() as Promise<{ data: any }>
          : (supabase.from("brands") as any).select("company_name, logo_url, coin_balance, subscription_tier, subscription_status").eq("id", actor.id).single() as Promise<{ data: any }>,
      // Favorites
      (supabase.from("follows") as any)
        .select("following_id, actor:actors!follows_following_id_fkey(user_id)")
        .eq("follower_id", actor.id) as Promise<{ data: { following_id: string; actor: { user_id: string } | null }[] | null }>,
    ]);

    profileData = profileResult.data;
    coinBalance = profileData?.coin_balance ?? 0;

    // Resolve favorite model IDs
    if (favoritesResult.data && favoritesResult.data.length > 0) {
      const userIds = favoritesResult.data
        .map((f) => f.actor?.user_id)
        .filter(Boolean) as string[];

      if (userIds.length > 0) {
        const { data: favModels } = await supabase
          .from("models")
          .select("id")
          .in("user_id", userIds);

        favoriteModelIds = favModels?.map((m: any) => m.id) || [];
      }
    }
  }

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : actorType === "brand"
      ? profileData?.company_name
      : profileData?.first_name
        ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
        : profileData?.username || undefined;

  // Check if brand has active subscription
  const isFreeBrand = actorType === "brand" &&
    (!profileData?.subscription_tier || profileData.subscription_tier === "free") &&
    profileData?.subscription_status !== "active";

  // Check if fan has minimum coin balance (50 coins required)
  const MIN_FAN_COINS = 50;
  const isFanWithoutCoins = actorType === "fan" && coinBalance < MIN_FAN_COINS;

  // Build pagination URL helper
  const buildPageUrl = (page: number) => {
    const p = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
      )
    );
    p.set("page", String(page));
    return `/models?${p.toString()}`;
  };

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
    <div className="min-h-screen bg-background">
      <Navbar
        user={user ? {
          id: user.id,
          email: user.email || "",
          avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || profileData?.logo_url || undefined,
          name: displayName,
          username: profileData?.username || undefined,
        } : undefined}
        actorType={actorType}
      />

      {/* Paywall for free brands */}
      {isFreeBrand && <BrandPaywallWrapper />}

      {/* Coin gate for fans without minimum balance */}
      {isFanWithoutCoins && <FanCoinGateWrapper currentBalance={coinBalance} />}

      <main className={`container px-8 md:px-16 py-8 ${isFreeBrand || isFanWithoutCoins ? "blur-sm pointer-events-none select-none" : ""}`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Models</h1>
        </div>

        {/* Featured Models */}
        {featured && featured.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span> Featured Models
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {featured.map((model) => (
                <ModelCard key={model.id} model={model} variant="compact" />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <Suspense fallback={<div className="h-24 animate-pulse bg-muted rounded-lg" />}>
          <ModelFilters />
        </Suspense>

        {/* Results */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted-foreground">
              {totalCount || 0} models found
              {totalPages > 1 && (
                <span className="ml-1">
                  (page {currentPage} of {totalPages})
                </span>
              )}
            </p>
          </div>

          <ModelsGrid
            models={models || []}
            isLoggedIn={!!user}
            favoriteModelIds={favoriteModelIds}
            actorType={actorType}
          />

          {/* Pagination — uses Next.js Link for client-side navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {hasPrevPage && (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium"
                >
                  Previous
                </Link>
              )}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={buildPageUrl(pageNum)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        pageNum === currentPage
                          ? "bg-pink-500 text-white"
                          : "hover:bg-muted"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
              {hasNextPage && (
                <Link
                  href={buildPageUrl(currentPage + 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
    </CoinBalanceProvider>
  );
}
