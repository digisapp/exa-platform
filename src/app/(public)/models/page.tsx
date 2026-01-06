import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { ModelFilters } from "@/components/models/model-filters";
import { ModelCard } from "@/components/models/model-card";
import { ModelsGrid } from "@/components/models/models-grid";
import { BrandPaywallWrapper } from "@/components/brands/BrandPaywallWrapper";

interface SearchParams {
  q?: string;
  state?: string;
  level?: string;
  sort?: string;
  focus?: string;
  height?: string;
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("models")
    .select("*")
    .eq("is_approved", true);

  // Search
  if (params.q) {
    query = query.or(`username.ilike.%${params.q}%,first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%`);
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
  if (params.height) {
    const heightPatterns: Record<string, string[]> = {
      petite: ["4'%", "5'0%", "5'1%", "5'2%"],
      short: ["5'3%", "5'4%", "5'5%"],
      average: ["5'6%", "5'7%", "5'8%"],
      tall: ["5'9%", "5'10%", "5'11%"],
      vtall: ["6'%"],
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

  // Limit
  query = query.limit(500);

  const { data: models, error } = await query as { data: any[] | null; error: any };

  // Get featured models
  const { data: featured } = await supabase
    .from("models")
    .select("*")
    .eq("is_featured", true)
    .eq("is_approved", true)
    .limit(5) as { data: any[] | null };

  // Get current user info for favorites and navbar
  const { data: { user } } = await supabase.auth.getUser();
  let favoriteModelIds: string[] = [];
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

  if (user) {
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

      // Get favorites
      const { data: favorites } = await (supabase
        .from("follows") as any)
        .select("following_id")
        .eq("follower_id", actor.id);

      if (favorites) {
        // Get model IDs from actor IDs
        const actorIds = favorites.map((f: any) => f.following_id);
        const { data: modelActors } = await supabase
          .from("actors")
          .select("id, user_id")
          .in("id", actorIds);

        if (modelActors) {
          const userIds = modelActors.map((a: any) => a.user_id);
          const { data: favModels } = await supabase
            .from("models")
            .select("id")
            .in("user_id", userIds);

          favoriteModelIds = favModels?.map((m: any) => m.id) || [];
        }
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

  return (
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
        coinBalance={coinBalance}
      />

      {/* Paywall for free brands */}
      {isFreeBrand && <BrandPaywallWrapper />}

      <main className={`container px-8 md:px-16 py-8 ${isFreeBrand ? "blur-sm pointer-events-none select-none" : ""}`}>
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
              {models?.length || 0} models found
            </p>
          </div>

          <ModelsGrid
            models={models || []}
            isLoggedIn={!!user}
            favoriteModelIds={favoriteModelIds}
            actorType={actorType}
          />
        </div>
      </main>
    </div>
  );
}
