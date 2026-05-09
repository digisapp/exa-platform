import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function requireAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin" ? actor : null;
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  category: z.string().trim().max(40).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  modelId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await requireAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await _request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.category !== undefined) update.category = parsed.data.category;
    if (parsed.data.tags !== undefined) update.tags = parsed.data.tags.map((t) => t.toLowerCase());
    if (parsed.data.modelId !== undefined) update.model_id = parsed.data.modelId;
    if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;
    if (parsed.data.isFeatured !== undefined) update.is_featured = parsed.data.isFeatured;
    if (parsed.data.sortOrder !== undefined) update.sort_order = parsed.data.sortOrder;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const adminDb = createServiceRoleClient();
    const { data, error } = await (adminDb as any)
      .from("exa_stickers")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      logger.error("[Admin Stickers] PATCH error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ sticker: data });
  } catch (error) {
    logger.error("[Admin Stickers] PATCH route error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await requireAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminDb = createServiceRoleClient();

    const { data: existing } = await (adminDb as any)
      .from("exa_stickers")
      .select("storage_path")
      .eq("id", id)
      .single();

    const { error } = await (adminDb as any)
      .from("exa_stickers")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("[Admin Stickers] Delete error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing?.storage_path) {
      await adminDb.storage.from("stickers").remove([existing.storage_path]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[Admin Stickers] DELETE route error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
