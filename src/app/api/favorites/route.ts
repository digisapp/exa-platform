import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

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

    // Get favorites with model details
    // Note: as any needed because follows FK points to actors, not models directly
    const { data: favorites, error } = await (supabase
      .from("follows") as any)
      .select(`
        created_at,
        following_id,
        models!follows_following_id_fkey (
          id,
          username,
          first_name,
          last_name,
          profile_photo_url,
          city,
          state,
          points_cached,
          is_approved
        )
      `)
      .eq("follower_id", actor.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get favorites error:", error);
      throw error;
    }

    // Filter to only approved models and format response
    const favoriteModels = (favorites || [])
      .filter((f: any) => f.models?.is_approved)
      .map((f: any) => ({
        ...f.models,
        favorited_at: f.created_at,
      }));

    return NextResponse.json({ favorites: favoriteModels });
  } catch (error) {
    console.error("Get favorites error:", error);
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

    // Prevent self-favorite
    if (actor.id === modelActor.id) {
      return NextResponse.json(
        { error: "Cannot favorite yourself" },
        { status: 400 }
      );
    }

    // Check if already favorited (as any needed: follows has no "id" column in types)
    const { data: existingFavorite } = await (supabase
      .from("follows") as any)
      .select("id")
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
      console.error("Favorite insert error:", insertError);
      throw insertError;
    }

    // Send notification to model if this is a new favorite
    if (isNewFavorite) {
      // Get follower info for notification
      const { data: followerActor } = await supabase
        .from("actors")
        .select("type")
        .eq("id", actor.id)
        .single();

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
    console.error("Add favorite error:", error);
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
      console.error("Remove favorite error:", deleteError);
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
    console.error("Remove favorite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
