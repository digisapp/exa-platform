import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

    // Use Supabase nested select with count aggregation:
    // PostgREST converts `content_items(count)` into a single LEFT JOIN + GROUP BY,
    // avoiding the prior pattern of fetching every set_id row to JS-count them.
    const { data: sets, error } = await service
      .from("content_sets")
      .select("*, content_items(count)")
      .eq("model_id", modelId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Content sets query error", error);
      return NextResponse.json({ error: "Failed to fetch sets" }, { status: 500 });
    }

    const setsWithCounts = (sets || []).map((s: any) => {
      const { content_items, ...rest } = s;
      return {
        ...rest,
        item_count: Array.isArray(content_items) ? content_items[0]?.count ?? 0 : 0,
      };
    });

    return NextResponse.json(
      { sets: setsWithCounts },
      { headers: { "Cache-Control": "private, max-age=10" } },
    );
  } catch (error) {
    logger.error("Content sets GET error", error);
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
      logger.error("Content set insert error", error);
      return NextResponse.json({ error: "Failed to create set" }, { status: 500 });
    }

    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    logger.error("Content sets POST error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
