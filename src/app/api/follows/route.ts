import { createClient } from "@/lib/supabase/server";
import { getActorId, getModelIdFromActorId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";

// GET - Check follow status and get counts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const targetActorId = searchParams.get("targetActorId");

    if (!targetActorId) {
      return NextResponse.json(
        { error: "targetActorId required" },
        { status: 400 }
      );
    }

    // Get current user's actor ID (if logged in)
    const { data: { user } } = await supabase.auth.getUser();
    let isFollowing = false;

    if (user) {
      const actorId = await getActorId(supabase, user.id);
      if (actorId) {
        const { data: follow } = await (supabase
          .from("follows") as any)
          .select("follower_id")
          .eq("follower_id", actorId)
          .eq("following_id", targetActorId)
          .single();
        isFollowing = !!follow;
      }
    }

    // Get follower count
    const { count: followerCount } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetActorId);

    // Get following count
    const { count: followingCount } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("follower_id", targetActorId);

    return NextResponse.json({
      isFollowing,
      followerCount: followerCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error) {
    console.error("Get follows error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Follow a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetActorId } = await request.json();
    if (!targetActorId) {
      return NextResponse.json(
        { error: "targetActorId required" },
        { status: 400 }
      );
    }

    // Get current user's actor ID
    const actorId = await getActorId(supabase, user.id);
    if (!actorId) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Prevent self-follow
    if (actorId === targetActorId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if target exists
    const { data: targetActor } = await supabase
      .from("actors")
      .select("id")
      .eq("id", targetActorId)
      .single();

    if (!targetActor) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Insert follow (ignore if already following)
    const { error: insertError } = await (supabase
      .from("follows") as any)
      .upsert(
        { follower_id: actorId, following_id: targetActorId },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true }
      );

    if (insertError) {
      console.error("Follow insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to follow" },
        { status: 500 }
      );
    }

    // Award points to the person being followed (+1)
    const targetModelId = await getModelIdFromActorId(supabase, targetActorId);
    if (targetModelId) {
      await (supabase.rpc as any)("award_points", {
        p_model_id: targetModelId,
        p_action: "new_follower",
        p_points: 1,
        p_metadata: { follower_actor_id: actorId },
      });
    }

    // Get updated follower count
    const { count: followerCount } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetActorId);

    return NextResponse.json({
      success: true,
      followerCount: followerCount || 0,
    });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetActorId = searchParams.get("targetActorId");

    if (!targetActorId) {
      return NextResponse.json(
        { error: "targetActorId required" },
        { status: 400 }
      );
    }

    // Get current user's actor ID
    const actorId = await getActorId(supabase, user.id);
    if (!actorId) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Delete follow
    const { error: deleteError } = await (supabase
      .from("follows") as any)
      .delete()
      .eq("follower_id", actorId)
      .eq("following_id", targetActorId);

    if (deleteError) {
      console.error("Unfollow error:", deleteError);
      return NextResponse.json(
        { error: "Failed to unfollow" },
        { status: 500 }
      );
    }

    // Get updated follower count
    const { count: followerCount } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetActorId);

    return NextResponse.json({
      success: true,
      followerCount: followerCount || 0,
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
