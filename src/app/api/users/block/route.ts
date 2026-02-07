import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// POST - Block a user
export async function POST(request: NextRequest) {
  try {
    // as any needed: RPC functions not fully in generated types
    const supabase: any = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "blocking", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { actorId, reason } = await request.json();

    if (!actorId) {
      return NextResponse.json(
        { error: "Actor ID is required" },
        { status: 400 }
      );
    }

    // Get current user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Block the user
    const { data: result, error } = await supabase.rpc("block_user", {
      p_blocker_id: actor.id,
      p_blocked_id: actorId,
      p_reason: reason || null,
    });

    if (error) {
      console.error("Block user error:", error);
      return NextResponse.json(
        { error: "Failed to block user" },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || "Failed to block user" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, blockId: result.block_id });
  } catch (error) {
    console.error("Block user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    // as any needed: RPC functions not fully in generated types
    const supabase: any = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get("actorId");

    if (!actorId) {
      return NextResponse.json(
        { error: "Actor ID is required" },
        { status: 400 }
      );
    }

    // Get current user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Unblock the user
    const { data: result, error } = await supabase.rpc("unblock_user", {
      p_blocker_id: actor.id,
      p_blocked_id: actorId,
    });

    if (error) {
      console.error("Unblock user error:", error);
      return NextResponse.json(
        { error: "Failed to unblock user" },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || "Failed to unblock user" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unblock user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get list of blocked users
export async function GET() {
  try {
    // as any needed: RPC functions not fully in generated types
    const supabase: any = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Get blocked users
    const { data: blockedUsers, error } = await supabase.rpc(
      "get_blocked_users",
      { p_actor_id: actor.id }
    );

    if (error) {
      console.error("Get blocked users error:", error);
      return NextResponse.json(
        { error: "Failed to get blocked users" },
        { status: 500 }
      );
    }

    // Get details for blocked actors
    if (blockedUsers && blockedUsers.length > 0) {
      const actorIds = blockedUsers.map((b: any) => b.blocked_actor_id);

      const { data: actorDetails } = await supabase
        .from("actors")
        .select("id, type")
        .in("id", actorIds) as { data: any[] | null };

      // Get model details for model actors
      const modelActorIds = actorDetails
        ?.filter((a) => a.type === "model")
        .map((a) => a.id) || [];

      let modelDetails: any[] = [];
      if (modelActorIds.length > 0) {
        const { data: models } = await supabase
          .from("models")
          .select("id, username, first_name, last_name, profile_photo_url")
          .in("id", modelActorIds);
        modelDetails = models || [];
      }

      // Merge details
      const enrichedBlocks = blockedUsers.map((block: any) => {
        const actorDetail = actorDetails?.find(
          (a) => a.id === block.blocked_actor_id
        );
        const modelDetail = modelDetails.find(
          (m) => m.id === block.blocked_actor_id
        );

        return {
          ...block,
          actorType: actorDetail?.type,
          username: modelDetail?.username,
          displayName: modelDetail
            ? `${modelDetail.first_name || ""} ${modelDetail.last_name || ""}`.trim() ||
              modelDetail.username
            : "User",
          profilePhoto: modelDetail?.profile_photo_url,
        };
      });

      return NextResponse.json({ blockedUsers: enrichedBlocks });
    }

    return NextResponse.json({ blockedUsers: [] });
  } catch (error) {
    console.error("Get blocked users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
