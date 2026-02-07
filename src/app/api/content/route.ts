import { createClient } from "@/lib/supabase/server";
import { getActorId, getActorInfo, getModelId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Zod schema for content creation validation
const createContentSchema = z.object({
  title: z.string().max(200, "Title is too long").optional().nullable(),
  description: z.string().max(1000, "Description is too long").optional().nullable(),
  mediaUrl: z.string().url("Invalid media URL"),
  mediaType: z.enum(["image", "video"], { message: "Media type must be image or video" }),
  previewUrl: z.string().url("Invalid preview URL").optional().nullable(),
  coinPrice: z.number().int("Price must be a whole number").min(0, "Price cannot be negative").max(10000, "Price is too high"),
});

// Get premium content for a model
export async function GET(request: NextRequest) {
  try {
    // as any needed: nullable field mismatches with typed query results and RPC parameters
    const supabase: any = await createClient();
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

    // Rate limit check (use IP for unauthenticated, user ID for authenticated)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user?.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

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

    // Batch fetch media_urls via secure RPC (only returns URLs for unlocked/owned content)
    const mediaUrlMap = new Map<string, string>();
    if (unlockedContentIds.length > 0) {
      const { data: mediaUrls } = await supabase.rpc(
        "get_unlocked_media_urls",
        {
          p_content_ids: unlockedContentIds,
          p_buyer_id: actorId,
        }
      );

      (mediaUrls || []).forEach((item: { content_id: string; media_url: string }) => {
        mediaUrlMap.set(item.content_id, item.media_url);
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
    // as any needed: nullable field mismatches with typed query results and RPC parameters
    const supabase: any = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
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

    // Validate request body with Zod schema
    const validationResult = createContentSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { title, description, mediaUrl, mediaType, previewUrl, coinPrice } = validationResult.data;

    // Use media URL as preview if no preview provided (will be blurred by frontend)
    const finalPreviewUrl = previewUrl || mediaUrl;

    const { data: content, error } = await supabase
      .from("premium_content")
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
  } catch (err) {
    console.error("Content creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete premium content (models only)
export async function DELETE(request: NextRequest) {
  try {
    // as any needed: nullable field mismatches with typed query results and RPC parameters
    const supabase: any = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
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
