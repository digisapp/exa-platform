import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";

const updateSetSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  coin_price: z.number().int().min(0).max(10000).optional(),
  status: z.enum(["draft", "live", "archived"]).optional(),
  cover_item_id: z.string().uuid().nullable().optional(),
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
      .from("content_sets")
      .select("id, model_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    if (existing.model_id !== modelId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = updateSetSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: set, error } = await service
      .from("content_sets")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Content set update error:", error);
      return NextResponse.json({ error: "Failed to update set" }, { status: 500 });
    }

    return NextResponse.json({ set });
  } catch (error) {
    console.error("Content set PATCH error:", error);
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

    // Verify ownership
    const { data: existing, error: fetchError } = await service
      .from("content_sets")
      .select("id, model_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    if (existing.model_id !== modelId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unlink items from this set
    await service
      .from("content_items")
      .update({ set_id: null, updated_at: new Date().toISOString() })
      .eq("set_id", id);

    // Delete the set
    const { error } = await service
      .from("content_sets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Content set delete error:", error);
      return NextResponse.json({ error: "Failed to delete set" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content set DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
