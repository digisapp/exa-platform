import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Users } from "lucide-react";
import { ModelCard } from "@/components/models/model-card";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorites | EXA",
  description: "Your favorite models on EXA",
};

export default async function FollowingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirect=/following");
  }

  // Get actor ID
  const { data: actor } = await supabase
    .from("actors")
    .select("id")
    .eq("user_id", user.id)
    .single() as { data: { id: string } | null };

  if (!actor) {
    redirect("/signin");
  }

  // Get followed models
  const { data: follows } = await (supabase
    .from("follows") as any)
    .select(`
      created_at,
      following_id,
      actors!follows_following_id_fkey (
        user_id
      )
    `)
    .eq("follower_id", actor.id)
    .order("created_at", { ascending: false });

  // Get the user_ids from the followed actors
  const userIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];

  // Get the model profiles
  const { data: followedModels } = userIds.length > 0
    ? await supabase
        .from("models")
        .select("*")
        .in("user_id", userIds)
        .eq("is_approved", true)
    : { data: [] };

  // Create a map of user_id to model for ordering
  const modelsByUserId = new Map(
    (followedModels || []).map((m: any) => [m.user_id, m])
  );

  // Order models by the original follow order
  const orderedModels = userIds
    .map((userId: string) => modelsByUserId.get(userId))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-8 md:px-16 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Favorites</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            {orderedModels.length} favorite {orderedModels.length === 1 ? "model" : "models"}
          </p>
        </div>

        {/* Grid */}
        {orderedModels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {orderedModels.map((model: any) => (
              <ModelCard
                key={model.id}
                model={model}
                showFavorite={true}
                isLoggedIn={true}
                isFavorited={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">
              Discover models and click the heart icon to add them to your favorites.
            </p>
            <Link
              href="/models"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Browse Models
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
