import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// GET - Get user's favorites
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor ID
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get follows with actor user_ids (following_id refs actors, not models directly)
    const { data: follows, error } = await (supabase
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

    if (error) {
      logger.error("Get favorites error", error);
      throw error;
    }

    // Resolve actor user_ids to model profiles
    const userIds = (follows || [])
      .map((f: any) => f.actors?.user_id)
      .filter(Boolean);

    if (userIds.length === 0) {
      return NextResponse.json({ favorites: [] }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const { data: models } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url, city, state, points_cached, is_approved")
      .in("user_id", userIds)
      .eq("is_approved", true);

    // Preserve follow order and attach favorited_at timestamp
    const modelsByUserId = new Map((models || []).map((m: any) => [m.user_id, m]));
    const followedUserIdsByActorUserId = new Map(
      (follows || []).map((f: any) => [f.actors?.user_id, f.created_at])
    );
    const favoriteModels = userIds
      .map((userId: string) => {
        const model = modelsByUserId.get(userId);
        if (!model) return null;
        return { ...model, favorited_at: followedUserIdsByActorUserId.get(userId) };
      })
      .filter(Boolean);

    return NextResponse.json({ favorites: favoriteModels }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    logger.error("Get favorites error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { modelId } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: "modelId required" },
        { status: 400 }
      );
    }

    // Get actor ID
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get the model's actor ID and actor type in parallel
    const [modelResult, actorTypeResult] = await Promise.all([
      supabase.from("models").select("user_id").eq("id", modelId).single(),
      supabase.from("actors").select("type").eq("id", actor.id).single(),
    ]);

    const model = modelResult.data;
    if (!model || !model.user_id) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const { data: modelActor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", model.user_id)
      .single();

    if (!modelActor) {
      return NextResponse.json({ error: "Model actor not found" }, { status: 404 });
    }

    // Prevent self-favorite
    if (actor.id === modelActor.id) {
      return NextResponse.json(
        { error: "Cannot favorite yourself" },
        { status: 400 }
      );
    }

    // Check if already favorited (select follower_id since follows has no id column)
    const { data: existingFavorite } = await (supabase
      .from("follows") as any)
      .select("follower_id")
      .eq("follower_id", actor.id)
      .eq("following_id", modelActor.id)
      .single();

    const isNewFavorite = !existingFavorite;

    // Insert favorite (using follows table)
    const { error: insertError } = await supabase
      .from("follows")
      .upsert(
        { follower_id: actor.id, following_id: modelActor.id },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true }
      );

    if (insertError) {
      logger.error("Favorite insert error", insertError);
      throw insertError;
    }

    // Send notification to model if this is a new favorite
    if (isNewFavorite) {
      // Get follower info for notification (already fetched above)
      const followerActor = actorTypeResult.data;

      let followerName = "Someone";
      if (followerActor?.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("display_name, username")
          .eq("id", actor.id)
          .single();
        followerName = fan?.display_name || fan?.username || "A fan";
      } else if (followerActor?.type === "brand") {
        const { data: brand } = await supabase
          .from("brands")
          .select("company_name")
          .eq("id", actor.id)
          .single();
        followerName = brand?.company_name || "A brand";
      }

      // Create notification for the model
      await supabase.from("notifications").insert({
        user_id: model.user_id,
        type: "new_follower",
        title: "New Favorite",
        message: `${followerName} added you to their favorites!`,
        action_url: "/followers",
        related_user_id: user.id,
      });
    }

    // Get updated favorite count for this model
    const { count: favoriteCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", modelActor.id);

    return NextResponse.json({
      success: true,
      favoriteCount: favoriteCount || 0,
    });
  } catch (error) {
    logger.error("Add favorite error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove from favorites
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { modelId } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: "modelId required" },
        { status: 400 }
      );
    }

    // Get actor ID
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get the model's actor ID
    const { data: model } = await supabase
      .from("models")
      .select("user_id")
      .eq("id", modelId)
      .single();

    if (!model || !model.user_id) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const { data: modelActor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", model.user_id)
      .single();

    if (!modelActor) {
      return NextResponse.json({ error: "Model actor not found" }, { status: 404 });
    }

    // Delete favorite
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", actor.id)
      .eq("following_id", modelActor.id);

    if (deleteError) {
      logger.error("Remove favorite error", deleteError);
      throw deleteError;
    }

    // Get updated favorite count
    const { count: favoriteCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", modelActor.id);

    return NextResponse.json({
      success: true,
      favoriteCount: favoriteCount || 0,
    });
  } catch (error) {
    logger.error("Remove favorite error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
