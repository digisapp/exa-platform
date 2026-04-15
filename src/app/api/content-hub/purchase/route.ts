import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { getActorId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";

const purchaseSchema = z
  .object({
    item_id: z.string().uuid().optional(),
    set_id: z.string().uuid().optional(),
  })
  .refine((data) => data.item_id || data.set_id, {
    message: "Either item_id or set_id is required",
  });

function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url;
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const service: any = createServiceRoleClient();
    const actorId = await getActorId(service, user.id);

    if (!actorId) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = purchaseSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { item_id, set_id } = parsed.data;

    if (item_id) {
      const { data: rpcData, error: rpcError } = await service.rpc("unlock_content_item", {
        p_buyer_id: actorId,
        p_item_id: item_id,
      });

      if (rpcError) {
        logger.error("Unlock item RPC error", rpcError);
        const msg = rpcError.message || "Failed to unlock item";
        if (msg.includes("nsufficient")) {
          return NextResponse.json({ error: msg }, { status: 402 });
        }
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      // Generate a signed URL for the purchased media
      let signedUrl: string | null = null;
      const { data: item } = await service
        .from("content_items")
        .select("media_url")
        .eq("id", item_id)
        .single();

      if (item?.media_url) {
        const storagePath = extractStoragePath(item.media_url);
        if (storagePath) {
          const { data: signed } = await service.storage
            .from("portfolio")
            .createSignedUrl(storagePath, 3600);
          signedUrl = signed?.signedUrl || null;
        }
      }

      return NextResponse.json({ success: true, purchase: rpcData, signed_url: signedUrl });
    }

    if (set_id) {
      const { data: rpcData, error: rpcError } = await service.rpc("unlock_content_set", {
        p_buyer_id: actorId,
        p_set_id: set_id,
      });

      if (rpcError) {
        logger.error("Unlock set RPC error", rpcError);
        const msg = rpcError.message || "Failed to unlock set";
        if (msg.includes("nsufficient")) {
          return NextResponse.json({ error: msg }, { status: 402 });
        }
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      return NextResponse.json({ success: true, purchase: rpcData });
    }

    return NextResponse.json({ error: "Either item_id or set_id is required" }, { status: 400 });
  } catch (error) {
    logger.error("Content purchase error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
