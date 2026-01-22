import { createClient } from "@/lib/supabase/server";
import { getActorId, getActorInfo, getModelId } from "@/lib/ids";
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

    // Use helper to get actor ID
    const actorId = user ? await getActorId(supabase, user.id) : null;

    // Get premium content (only paid content with coin_price > 0)
    const { data: content, error } = await supabase
      .from("premium_content")
      .select("id, title, description, media_type, preview_url, coin_price, unlock_count, created_at")
      .eq("model_id", modelId)
      .eq("is_active", true)
      .gt("coin_price", 0)
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

    // Determine which content IDs are unlocked
    const unlockedContentIds = (content || [])
      .filter((item: { id: string; coin_price: number }) => {
        const isFree = item.coin_price === 0;
        return isFree || unlockedIds.includes(item.id) || isOwner;
      })
      .map((item: { id: string }) => item.id);

    // Batch fetch all media_urls for unlocked content in a single query
    const mediaUrlMap = new Map<string, string>();
    if (unlockedContentIds.length > 0) {
      const { data: mediaUrls } = await supabase
        .from("premium_content")
        .select("id, media_url")
        .in("id", unlockedContentIds);

      mediaUrls?.forEach((item: { id: string; media_url: string }) => {
        mediaUrlMap.set(item.id, item.media_url);
      });
    }

    // Add unlocked status and media_url from the batch lookup
    const contentWithStatus = (content || []).map((item: {
      id: string;
      title: string | null;
      description: string | null;
      media_type: string;
      preview_url: string | null;
      coin_price: number;
      unlock_count: number | null;
      created_at: string | null;
    }) => {
      const isFree = item.coin_price === 0;
      const isUnlocked = isFree || unlockedIds.includes(item.id) || isOwner;

      return {
        ...item,
        isUnlocked,
        mediaUrl: isUnlocked ? mediaUrlMap.get(item.id) || null : null,
      };
    });

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

    // Use helpers to get actor info and model ID
    const actorInfo = await getActorInfo(supabase, user.id);

    if (!actorInfo || (actorInfo.type !== "model" && actorInfo.type !== "admin")) {
      return NextResponse.json(
        { error: "Only models can create content" },
        { status: 403 }
      );
    }

    const modelId = await getModelId(supabase, user.id);

    if (!modelId) {
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
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

    // Allow free content (coinPrice = 0) or paid content (coinPrice >= 1)
    if (coinPrice < 0) {
      return NextResponse.json(
        { error: "Price cannot be negative" },
        { status: 400 }
      );
    }

    // Use media URL as preview if no preview provided (will be blurred by frontend)
    const finalPreviewUrl = previewUrl || mediaUrl;

    const { data: content, error } = await (supabase
      .from("premium_content") as any)
      .insert({
        model_id: modelId,
        title: title || null,
        description: description || null,
        media_url: mediaUrl,
        media_type: mediaType,
        preview_url: finalPreviewUrl,
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

    // Use helper to get model ID
    const modelId = await getModelId(supabase, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model not found" }, { status: 400 });
    }

    // Verify ownership and delete
    const { error } = await supabase
      .from("premium_content")
      .delete()
      .eq("id", contentId)
      .eq("model_id", modelId);

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
