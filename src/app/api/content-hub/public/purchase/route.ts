import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getActorId } from "@/lib/ids";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// Extract storage path from either a raw path or an expired signed URL
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url;
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

async function toSignedUrl(
  rawUrl: string | null | undefined
): Promise<string | null> {
  if (!rawUrl) return null;
  const path = extractStoragePath(rawUrl);
  if (!path) return null;
  const service = createServiceRoleClient();
  const { data } = await service.storage
    .from("portfolio")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase: any = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: financial tier
    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "financial",
      user.id
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const actorId = await getActorId(supabase, user.id);
    if (!actorId) {
      return NextResponse.json(
        { error: "Actor profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { itemId, setId } = body;

    if (!itemId && !setId) {
      return NextResponse.json(
        { error: "Either itemId or setId is required" },
        { status: 400 }
      );
    }

    const service: any = createServiceRoleClient();

    if (itemId) {
      // Purchase a single content item
      const { data, error } = await service.rpc("unlock_content_item", {
        p_buyer_id: actorId,
        p_item_id: itemId,
      });

      if (error) {
        console.error("Error unlocking content item:", error);
        return NextResponse.json(
          { error: error.message || "Failed to unlock content" },
          { status: 400 }
        );
      }

      // Fetch the item media_url and generate a fresh signed URL
      const { data: item } = await service
        .from("content_items")
        .select("media_url")
        .eq("id", itemId)
        .single();

      const signedMediaUrl = item ? await toSignedUrl(item.media_url) : null;

      return NextResponse.json({
        success: true,
        ...data,
        mediaUrl: signedMediaUrl,
      });
    }

    // Purchase a content set
    const { data, error } = await service.rpc("unlock_content_set", {
      p_buyer_id: actorId,
      p_set_id: setId,
    });

    if (error) {
      console.error("Error unlocking content set:", error);
      return NextResponse.json(
        { error: error.message || "Failed to unlock set" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Content purchase error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
