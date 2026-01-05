import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Users, MessageCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = {
  title: "Followers | EXA",
  description: "See who follows you on EXA",
};

export default async function FollowersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirect=/followers");
  }

  // Get actor ID
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor) {
    redirect("/signin");
  }

  // Only models can view followers
  if (actor.type !== "model" && actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get followers
  const { data: follows } = await (supabase
    .from("follows") as any)
    .select(`
      id,
      created_at,
      follower_id,
      actors!follows_follower_id_fkey (
        id,
        type,
        user_id
      )
    `)
    .eq("following_id", actor.id)
    .order("created_at", { ascending: false });

  // Get follower details based on their type
  const followerActors = follows?.map((f: any) => f.actors).filter(Boolean) || [];

  // Get fan details
  const fanActorIds = followerActors.filter((a: any) => a.type === "fan").map((a: any) => a.id);
  const { data: fans } = fanActorIds.length > 0
    ? await supabase.from("fans").select("id, display_name, avatar_url").in("id", fanActorIds)
    : { data: [] };
  const fansMap = new Map((fans || []).map((f: any) => [f.id, f]));

  // Get model details (models following models)
  const modelUserIds = followerActors.filter((a: any) => a.type === "model").map((a: any) => a.user_id);
  const { data: models } = modelUserIds.length > 0
    ? await supabase.from("models").select("user_id, username, first_name, last_name, profile_photo_url").in("user_id", modelUserIds)
    : { data: [] };
  const modelsMap = new Map((models || []).map((m: any) => [m.user_id, m]));

  // Get brand details
  const brandActorIds = followerActors.filter((a: any) => a.type === "brand").map((a: any) => a.id);
  const { data: brands } = brandActorIds.length > 0
    ? await (supabase.from("brands") as any).select("id, company_name, logo_url").in("id", brandActorIds)
    : { data: [] };
  const brandsMap = new Map((brands || []).map((b: any) => [b.id, b]));

  // Build enriched followers list
  const enrichedFollowers = follows?.map((follow: any) => {
    const followerActor = follow.actors;
    if (!followerActor) return null;

    let displayName = "Unknown";
    let avatarUrl = null;
    let profileUrl = null;
    const type = followerActor.type;

    if (type === "fan") {
      const fan = fansMap.get(followerActor.id) as { display_name?: string; avatar_url?: string } | undefined;
      displayName = fan?.display_name || "Anonymous Fan";
      avatarUrl = fan?.avatar_url;
    } else if (type === "model") {
      const model = modelsMap.get(followerActor.user_id) as { first_name?: string; last_name?: string; username?: string; profile_photo_url?: string } | undefined;
      displayName = model?.first_name
        ? `${model.first_name} ${model.last_name || ""}`.trim()
        : model?.username || "Model";
      avatarUrl = model?.profile_photo_url;
      profileUrl = model?.username ? `/${model.username}` : null;
    } else if (type === "brand") {
      const brand = brandsMap.get(followerActor.id) as { company_name?: string; logo_url?: string } | undefined;
      displayName = brand?.company_name || "Brand";
      avatarUrl = brand?.logo_url;
    }

    return {
      id: follow.id,
      actorId: followerActor.id,
      displayName,
      avatarUrl,
      profileUrl,
      type,
      followedAt: follow.created_at,
    };
  }).filter(Boolean) || [];

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "fan": return "Fan";
      case "model": return "Model";
      case "brand": return "Brand";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "fan": return "bg-amber-500/20 text-amber-500";
      case "model": return "bg-pink-500/20 text-pink-500";
      case "brand": return "bg-cyan-500/20 text-cyan-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-8 md:px-16 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">Followers</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            {enrichedFollowers.length} {enrichedFollowers.length === 1 ? "person" : "people"} following you
          </p>
        </div>

        {/* Followers List */}
        {enrichedFollowers.length > 0 ? (
          <div className="space-y-3">
            {enrichedFollowers.map((follower: any) => (
              <Card key={follower.id} className="hover:border-pink-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {follower.profileUrl ? (
                      <Link href={follower.profileUrl}>
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-500/30 hover:ring-pink-500/60 transition-all">
                          {follower.avatarUrl ? (
                            <Image
                              src={follower.avatarUrl}
                              alt={follower.displayName}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center text-lg font-bold">
                              {follower.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20">
                        {follower.avatarUrl ? (
                          <Image
                            src={follower.avatarUrl}
                            alt={follower.displayName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center text-lg font-bold">
                            {follower.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {follower.profileUrl ? (
                          <Link href={follower.profileUrl} className="font-medium hover:text-pink-500 transition-colors">
                            {follower.displayName}
                          </Link>
                        ) : (
                          <span className="font-medium">{follower.displayName}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(follower.type)}`}>
                          {getTypeLabel(follower.type)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Followed {formatDistanceToNow(new Date(follower.followedAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Message Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10"
                      asChild
                    >
                      <Link href={`/chats?new=${follower.actorId}`}>
                        <MessageCircle className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No followers yet</h2>
            <p className="text-muted-foreground mb-6">
              Share your profile to get more followers!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
