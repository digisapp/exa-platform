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
import { BottomNav } from "@/components/layout/BottomNav";
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
  id, username, first_name, last_name, profile_photo_url, is_verified, is_featured,
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
  cpm_sort?: string;
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

  // Sort — always prioritize recently-active models at the top; nulls (never active) go last
  modelsQuery = modelsQuery.order("last_active_at", { ascending: false, nullsFirst: false });

  switch (params.sort) {
    case "followers":
      modelsQuery = modelsQuery.order("instagram_followers", { ascending: false, nullsFirst: false });
      break;
    default:
      modelsQuery = modelsQuery.order("created_at", { ascending: false });
  }

  // CPM sort — only applies when collabs filter is active
  if (params.collabs === "1") {
    const cpmCol = params.platform === "tiktok" ? "tiktok_cpm" : "instagram_cpm";
    if (params.cpm_sort === "cpm_low") {
      modelsQuery = modelsQuery.order(cpmCol, { ascending: true, nullsFirst: false });
    } else if (params.cpm_sort === "cpm_high") {
      modelsQuery = modelsQuery.order(cpmCol, { ascending: false, nullsFirst: false });
    }
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

  // Fetch the best hero-portrait photo for each model on this page.
  // This fixes the pre-existing grid crop issue: profile_photo_url is a
  // square face crop and aspect-[3/4] cards were losing the top/bottom of
  // every face. Uses the same high-res-portrait criteria as the profile-page
  // hero. Models without an eligible photo keep their profile_photo_url.
  const modelIdsOnPage = (models || []).map((m: any) => m.id);
  const heroByModel = new Map<string, string>();
  if (modelIdsOnPage.length > 0) {
    const { data: heroPhotos } = await (supabase as any)
      .from("content_items")
      .select("model_id, media_url, width, height")
      .in("model_id", modelIdsOnPage)
      .eq("media_type", "image")
      .eq("status", "portfolio")
      .not("width", "is", null)
      .gte("height", 1500)
      .order("height", { ascending: false })
      .limit(500);

    const resolveMediaUrl = (url: string) =>
      url.startsWith("http")
        ? url
        : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;

    for (const photo of heroPhotos || []) {
      // portrait-or-square only; take the first (highest-resolution) per model
      if (photo.height >= photo.width && !heroByModel.has(photo.model_id)) {
        heroByModel.set(photo.model_id, resolveMediaUrl(photo.media_url));
      }
    }
  }

  // Attach hero_portrait_url to each model before passing to the client grid
  const modelsWithHero = (models || []).map((m: any) => ({
    ...m,
    hero_portrait_url: heroByModel.get(m.id) || null,
  }));

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

      <main className={`container px-8 md:px-16 py-8 pb-24 md:pb-8 ${isFreeBrand || isFanWithoutCoins ? "blur-sm pointer-events-none select-none" : ""}`}>
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
            Directory
          </p>
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="exa-gradient-text">Models</span>
          </h1>
          {totalCount !== null && (
            totalCount > 0 ? (
              <p className="text-sm text-white/60 mt-1">
                Browse {totalCount.toLocaleString()} verified models worldwide
              </p>
            ) : (
              <p className="text-sm text-white/40 mt-1 italic">
                No models match these filters
              </p>
            )
          )}
        </div>

        {/* Featured Models */}
        {featured && featured.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-amber-500/40 blur-lg opacity-40" />
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/40">
                  <span className="text-lg leading-none">✨</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold">Handpicked</p>
                <h2 className="text-lg md:text-xl font-bold text-white">
                  <span className="exa-gradient-text">Featured Models</span>
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {featured.map((model) => (
                <ModelCard key={model.id} model={model} variant="compact" />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <Suspense fallback={<div className="h-24 rounded-2xl bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10 animate-pulse" />}>
          <ModelFilters />
        </Suspense>

        {/* Results */}
        <div className="mt-6">
          <ModelsGrid
            models={modelsWithHero}
            isLoggedIn={!!user}
            favoriteModelIds={favoriteModelIds}
            actorType={actorType}
            currentModelId={actorType === "model" ? actor?.id : undefined}
          />

          {/* Pagination — uses Next.js Link for client-side navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {hasPrevPage && (
                <Link
                  href={buildPageUrl(currentPage - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-white/80 hover:text-white text-sm font-semibold transition-all"
                >
                  ← Previous
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
                      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all ${
                        pageNum === currentPage
                          ? "bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-[0_0_14px_rgba(236,72,153,0.5)]"
                          : "text-white/60 hover:text-white hover:bg-white/10"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-white/80 hover:text-white text-sm font-semibold transition-all"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
        </p>
      </footer>

      {user && (
        <BottomNav
          user={{
            avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || profileData?.logo_url || undefined,
            name: displayName,
            email: user.email || "",
          }}
          actorType={actorType}
        />
      )}
    </div>
    </CoinBalanceProvider>
  );
}
