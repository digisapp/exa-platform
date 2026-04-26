import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { FavoritesGrid } from "./FavoritesGrid";
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
      </div>

      {/* Live grid — client component manages count + instant removal */}
      <FavoritesGrid initialModels={orderedModels} />
    </div>
  );
}
