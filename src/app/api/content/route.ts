import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Get premium content for a model
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID required" },
        { status: 400 }
      );
    }

    // Get current user to check if they've unlocked content
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let actorId: string | null = null;
    if (user) {
      const { data: actor } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", user.id)
        .single() as { data: { id: string } | null };
      actorId = actor?.id || null;
    }

    // Get premium content
    const { data: content, error } = await supabase
      .from("premium_content")
      .select("id, title, description, media_type, preview_url, coin_price, unlock_count, created_at")
      .eq("model_id", modelId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching content:", error);
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    // If user is logged in, check which content they've unlocked
    let unlockedIds: string[] = [];
    if (actorId) {
      const { data: unlocks } = await supabase
        .from("content_unlocks")
        .select("content_id")
        .eq("buyer_id", actorId);

      unlockedIds = unlocks?.map((u: { content_id: string }) => u.content_id) || [];
    }

    // Check if the viewer is the model themselves
    const isOwner = actorId === modelId;

    // Add unlocked status and full media_url if unlocked or owner
    const contentWithStatus = await Promise.all(
      (content || []).map(async (item: {
        id: string;
        title: string | null;
        description: string | null;
        media_type: string;
        preview_url: string | null;
        coin_price: number;
        unlock_count: number;
        created_at: string;
      }) => {
        const isUnlocked = unlockedIds.includes(item.id) || isOwner;

        // If unlocked, get the full media_url
        let mediaUrl = null;
        if (isUnlocked) {
          const { data: fullContent } = await supabase
            .from("premium_content")
            .select("media_url")
            .eq("id", item.id)
            .single() as { data: { media_url: string } | null };
          mediaUrl = fullContent?.media_url;
        }

        return {
          ...item,
          isUnlocked,
          mediaUrl,
        };
      })
    );

    return NextResponse.json({ content: contentWithStatus });
  } catch (error) {
    console.error("Content fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create new premium content (models only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor and verify they're a model
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "model" && actor.type !== "admin")) {
      return NextResponse.json(
        { error: "Only models can create premium content" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, mediaUrl, mediaType, previewUrl, coinPrice } = body;

    if (!mediaUrl || !mediaType) {
      return NextResponse.json(
        { error: "Media URL and type required" },
        { status: 400 }
      );
    }

    if (!coinPrice || coinPrice < 1) {
      return NextResponse.json(
        { error: "Price must be at least 1 coin" },
        { status: 400 }
      );
    }

    const { data: content, error } = await (supabase
      .from("premium_content") as any)
      .insert({
        model_id: actor.id,
        title: title || null,
        description: description || null,
        media_url: mediaUrl,
        media_type: mediaType,
        preview_url: previewUrl || null,
        coin_price: coinPrice,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating content:", error);
      return NextResponse.json(
        { error: "Failed to create content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Content creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete premium content (models only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("id");

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID required" },
        { status: 400 }
      );
    }

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Verify ownership and delete
    const { error } = await supabase
      .from("premium_content")
      .delete()
      .eq("id", contentId)
      .eq("model_id", actor.id);

    if (error) {
      console.error("Error deleting content:", error);
      return NextResponse.json(
        { error: "Failed to delete content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
