import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateItemSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["private", "portfolio", "exclusive"]).optional(),
  coin_price: z.number().int().min(0).max(10000).optional(),
  tags: z.array(z.string()).optional().nullable(),
  publish_at: z.string().datetime().optional().nullable(),
  set_id: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await service
      .from("content_items")
      .select("id, model_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existing.model_id !== modelId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = updateItemSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: item, error } = await service
      .from("content_items")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Content item update error", error);
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    logger.error("Content item PATCH error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    // Verify ownership and get media_url for cleanup
    const { data: existing, error: fetchError } = await service
      .from("content_items")
      .select("id, model_id, media_url")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (existing.model_id !== modelId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from content_items
    const { error } = await service
      .from("content_items")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Content item delete error", error);
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }

    // Clean up matching media_assets record
    if (existing.media_url) {
      await service
        .from("media_assets")
        .delete()
        .eq("model_id", modelId)
        .or(`url.eq.${existing.media_url},photo_url.eq.${existing.media_url},storage_path.eq.${existing.media_url}`);
    }

    // Clean up storage file
    if (existing.media_url) {
      const storagePath = existing.media_url.startsWith("http")
        ? existing.media_url.split("/portfolio/").pop()
        : existing.media_url;
      if (storagePath) {
        await service.storage.from("portfolio").remove([storagePath]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Content item DELETE error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
