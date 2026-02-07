import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
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

interface SearchParams {
  q?: string;
  state?: string;
  level?: string;
  sort?: string;
  focus?: string;
  height?: string;
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

  // Build query - only show models with profile pictures
  let query = supabase
    .from("models")
    .select("*")
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null);

  // Search
  if (params.q) {
    query = query.or(`username.ilike.%${escapeIlike(params.q)}%,first_name.ilike.%${escapeIlike(params.q)}%,last_name.ilike.%${escapeIlike(params.q)}%`);
  }

  // Filter by state
  if (params.state) {
    query = query.eq("state", params.state);
  }

  // Filter by verified status
  if (params.level === 'verified') {
    query = query.eq("is_verified", true);
  } else if (params.level === 'featured') {
    query = query.eq("is_featured", true);
  }

  // Filter by focus
  if (params.focus) {
    query = query.contains("focus_tags", [params.focus]);
  }

  // Filter by height range
  // Note: 5'1 patterns must be exact to avoid matching 5'10/5'11
  if (params.height) {
    const heightPatterns: Record<string, string[]> = {
      // For under 5'4: use exact matches for 5'0-5'3 to avoid 5'1 matching 5'10/5'11
      under54: ["4'%", "5'0%", "5'1\"", "5'1", "5'2%", "5'3%"],
      "54up": ["5'4%", "5'5%", "5'6%", "5'7%", "5'8%", "5'9%", "5'10%", "5'11%", "6'%"],
      "57up": ["5'7%", "5'8%", "5'9%", "5'10%", "5'11%", "6'%"],
      "510up": ["5'10%", "5'11%", "6'%"],
    };
    const patterns = heightPatterns[params.height];
    if (patterns) {
      const orConditions = patterns.map(p => `height.ilike.${p}`).join(",");
      query = query.or(orConditions);
    }
  }

  // Sort
  switch (params.sort) {
    case "followers":
      query = query.order("instagram_followers", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "name":
      query = query.order("first_name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  // Pagination
  const PAGE_SIZE = 40;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Get total count for pagination
  const countQuery = supabase
    .from("models")
    .select("*", { count: "exact", head: true })
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null);

  const { count: totalCount } = await countQuery;

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: models } = await query as { data: any[] | null; error: any };
  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Get featured models (only with profile pictures)
  const { data: featured } = await supabase
    .from("models")
    .select("*")
    .eq("is_featured", true)
    .eq("is_approved", true)
    .not("profile_photo_url", "is", null)
    .limit(5) as { data: any[] | null };

  // Get current user info for favorites and navbar
  let favoriteModelIds: string[] = [];
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

  // Get actor ID and type
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

  actorType = actor?.type || null;

  if (actor) {
    // Get profile info based on actor type
    if (actor.type === "model" || actor.type === "admin") {
      const { data } = await supabase
        .from("models")
        .select("username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    } else if (actor.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    } else if (actor.type === "brand") {
      const { data } = await (supabase
        .from("brands") as any)
        .select("company_name, logo_url, coin_balance, subscription_tier, subscription_status")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }

    // Get favorites with actor info in single query (optimized from 3 queries to 2)
    const { data: favorites } = await (supabase
      .from("follows") as any)
      .select("following_id, actor:actors!follows_following_id_fkey(user_id)")
      .eq("follower_id", actor.id) as { data: { following_id: string; actor: { user_id: string } | null }[] | null };

    if (favorites && favorites.length > 0) {
      const userIds = favorites
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {hasPrevPage && (
                <a
                  href={`/models?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
                    ),
                    page: String(currentPage - 1),
                  }).toString()}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium"
                >
                  Previous
                </a>
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
                    <a
                      key={pageNum}
                      href={`/models?${new URLSearchParams({
                        ...Object.fromEntries(
                          Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
                        ),
                        page: String(pageNum),
                      }).toString()}`}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        pageNum === currentPage
                          ? "bg-pink-500 text-white"
                          : "hover:bg-muted"
                      }`}
                    >
                      {pageNum}
                    </a>
                  );
                })}
              </div>
              {hasNextPage && (
                <a
                  href={`/models?${new URLSearchParams({
                    ...Object.fromEntries(
                      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
                    ),
                    page: String(currentPage + 1),
                  }).toString()}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
    </CoinBalanceProvider>
  );
}
