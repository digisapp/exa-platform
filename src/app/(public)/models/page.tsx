import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ModelFilters } from "@/components/models/model-filters";
import { ModelCard } from "@/components/models/model-card";
import { Users } from "lucide-react";
import { ModelsGrid } from "@/components/models/models-grid";

interface SearchParams {
  q?: string;
  state?: string;
  level?: string;
  sort?: string;
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

  // Get current user info for favorites
  const { data: { user } } = await supabase.auth.getUser();
  let favoriteModelIds: string[] = [];

  if (user) {
    // Get actor ID
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (actor) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-8 md:px-16 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Models</h1>
          </div>
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
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
