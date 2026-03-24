import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { getModelId } from "@/lib/ids";
import { z } from "zod";

const createItemSchema = z.object({
  media_url: z.string().min(1, "media_url is required"),
  media_type: z.enum(["image", "video"]),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  preview_url: z.string().optional(),
  status: z.enum(["private", "portfolio", "exclusive"]).default("private"),
  coin_price: z.number().int().min(0).max(10000).default(0),
  tags: z.array(z.string()).optional(),
  publish_at: z.string().datetime().optional(),
  set_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mediaType = searchParams.get("media_type");
    const setId = searchParams.get("set_id");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";

    let query = service
      .from("content_items")
      .select("*")
      .eq("model_id", modelId);

    if (status) query = query.eq("status", status);
    if (mediaType) query = query.eq("media_type", mediaType);
    if (setId) query = query.eq("set_id", setId);
    if (tag) query = query.contains("tags", [tag]);
    if (search) query = query.ilike("title", `%${search}%`);

    const validSorts = ["created_at", "unlock_count", "coin_price"];
    const sortField = validSorts.includes(sort) ? sort : "created_at";
    query = query.order(sortField, { ascending: order === "asc" });

    const { data: items, error } = await query;

    if (error) {
      console.error("Content items query error:", error);
      return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error("Content items GET error:", error);
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

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    const rawBody = await request.json();
    const parsed = createItemSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: item, error } = await service
      .from("content_items")
      .insert({ ...parsed.data, model_id: modelId })
      .select()
      .single();

    if (error) {
      console.error("Content item insert error:", error);
      return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Content items POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
