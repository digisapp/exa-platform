import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";

const createSetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  coin_price: z.number().int().min(0).max(10000).optional(),
});

export async function GET(_request: NextRequest) {
  try {
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

    // Fetch sets
    const { data: sets, error } = await service
      .from("content_sets")
      .select("*")
      .eq("model_id", modelId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Content sets query error:", error);
      return NextResponse.json({ error: "Failed to fetch sets" }, { status: 500 });
    }

    // Get item counts per set
    const setIds = (sets || []).map((s: any) => s.id);
    const itemCounts: Record<string, number> = {};

    if (setIds.length > 0) {
      const { data: counts, error: countError } = await service
        .from("content_items")
        .select("set_id")
        .in("set_id", setIds);

      if (!countError && counts) {
        for (const row of counts) {
          itemCounts[row.set_id] = (itemCounts[row.set_id] || 0) + 1;
        }
      }
    }

    const setsWithCounts = (sets || []).map((s: any) => ({
      ...s,
      item_count: itemCounts[s.id] || 0,
    }));

    return NextResponse.json({ sets: setsWithCounts });
  } catch (error) {
    console.error("Content sets GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = createSetSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: set, error } = await service
      .from("content_sets")
      .insert({ ...parsed.data, model_id: modelId })
      .select()
      .single();

    if (error) {
      console.error("Content set insert error:", error);
      return NextResponse.json({ error: "Failed to create set" }, { status: 500 });
    }

    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    console.error("Content sets POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
