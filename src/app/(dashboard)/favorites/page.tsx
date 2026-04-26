import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart, Users } from "lucide-react";
import { ModelCard } from "@/components/models/model-card";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorites | EXA",
  description: "Your favorite models on EXA",
};

export default async function FavoritesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirect=/favorites");
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

  // Get favorite models
  const { data: favorites } = await (supabase
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

  // Get the user_ids from the favorited actors
  const userIds = favorites?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];

  // Get the model profiles
  const { data: favoritedModels } = userIds.length > 0
    ? await supabase
        .from("models")
        .select("*")
        .in("user_id", userIds)
        .eq("is_approved", true)
    : { data: [] };

  // Create a map of user_id to model for ordering
  const modelsByUserId = new Map(
    (favoritedModels || []).map((m: any) => [m.user_id, m])
  );

  // Order models by the original follow order
  const orderedModels = userIds
    .map((userId: string) => modelsByUserId.get(userId))
    .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
            <Heart className="h-6 w-6 text-pink-500 fill-pink-500" />
          </div>
          <h1 className="text-3xl font-bold">Favs</h1>
        </div>
        <p className="text-sm text-white/50 ml-[52px]">
          {orderedModels.length} {orderedModels.length === 1 ? "model" : "models"}
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
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 ring-1 ring-pink-500/20 mb-4">
            <Heart className="h-8 w-8 text-pink-500/50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
          <p className="text-white/50 text-sm mb-6">
            Browse models and tap the heart icon to save them here.
          </p>
          <Link
            href="/models"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-sm font-semibold text-white shadow-[0_0_18px_rgba(236,72,153,0.4)] transition-all"
          >
            <Users className="h-4 w-4" />
            Browse Models
          </Link>
        </div>
      )}
    </div>
  );
}
