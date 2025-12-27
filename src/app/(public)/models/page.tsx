import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ModelCard } from "@/components/models/model-card";
import { ModelFilters } from "@/components/models/model-filters";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-6 md:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Model Directory</h1>
          </div>
          <p className="text-muted-foreground">
            Discover talented models from around the world
          </p>
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

          {models && models.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {models.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No models found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
