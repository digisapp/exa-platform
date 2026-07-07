import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// GET - List the current user's followers with display details.
// RLS hides other users' actors/fans rows from the browser client, so the
// enrichment has to happen server-side with the service role client.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const service = createServiceRoleClient();

    const { data: actor } = await (service.from("actors") as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    const { data: follows, error: followsError } = await (service.from("follows") as any)
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

    if (followsError) {
      logger.error("[Model Followers] Failed to fetch follows", followsError);
      return NextResponse.json({ error: "Failed to load followers" }, { status: 500 });
    }

    const followerActors = (follows || []).map((f: any) => f.actors).filter(Boolean);

    const fanActorIds = followerActors.filter((a: any) => a.type === "fan").map((a: any) => a.id);
    const { data: fans } = fanActorIds.length > 0
      ? await (service.from("fans") as any).select("id, display_name, avatar_url").in("id", fanActorIds)
      : { data: [] };
    const fansMap = new Map((fans || []).map((f: any) => [f.id, f]));

    const modelUserIds = followerActors.filter((a: any) => a.type === "model").map((a: any) => a.user_id);
    const { data: models } = modelUserIds.length > 0
      ? await (service.from("models") as any).select("user_id, username, profile_photo_url").in("user_id", modelUserIds)
      : { data: [] };
    const modelsMap = new Map((models || []).map((m: any) => [m.user_id, m]));

    const brandActorIds = followerActors.filter((a: any) => a.type === "brand").map((a: any) => a.id);
    const { data: brands } = brandActorIds.length > 0
      ? await (service.from("brands") as any).select("id, company_name, logo_url").in("id", brandActorIds)
      : { data: [] };
    const brandsMap = new Map((brands || []).map((b: any) => [b.id, b]));

    const followers = (follows || []).map((follow: any) => {
      const followerActor = follow.actors;
      if (!followerActor) return null;

      let displayName = "Unknown";
      let avatarUrl = null;
      let profileUrl = null;
      const type = followerActor.type;

      if (type === "fan") {
        const fan = fansMap.get(followerActor.id) as any;
        displayName = fan?.display_name || "Anonymous Fan";
        avatarUrl = fan?.avatar_url || null;
      } else if (type === "model") {
        const model = modelsMap.get(followerActor.user_id) as any;
        displayName = model?.username || "Model";
        avatarUrl = model?.profile_photo_url || null;
        profileUrl = model?.username ? `/${model.username}` : null;
      } else if (type === "brand") {
        const brand = brandsMap.get(followerActor.id) as any;
        displayName = brand?.company_name || "Brand";
        avatarUrl = brand?.logo_url || null;
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
    }).filter(Boolean);

    return NextResponse.json({ followers });
  } catch (error) {
    logger.error("[Model Followers] Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
