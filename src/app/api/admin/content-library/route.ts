import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const createLibraryItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
});

async function verifyAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// POST - Create a new library item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    if (!(await verifyAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createLibraryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, description } = parsed.data;

    const { data: item, error } = await adminClient.from("content_library" as any)
      .insert({
        title,
        description: description || null,
        uploaded_by: user.id,
      })
      .select()
      .single() as { data: any; error: any };

    if (error || !item) {
      console.error("Failed to create library item:", error);
      return NextResponse.json({ error: "Failed to create library item" }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Create library item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - List library items with enrichment
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    if (!(await verifyAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = adminClient.from("content_library" as any)
      .select("id, title, description, uploaded_by, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data: items, error } = await query.limit(100) as { data: any[]; error: any };

    if (error) {
      console.error("Failed to fetch library items:", error);
      return NextResponse.json({ error: "Failed to fetch library items" }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Batch-fetch file counts and sizes
    const itemIds = items.map((i: any) => i.id);

    const { data: files } = await adminClient.from("content_library_files" as any)
      .select("library_item_id, size_bytes")
      .in("library_item_id", itemIds) as { data: any };

    const fileCounts: Record<string, { count: number; totalSize: number }> = {};
    (files || []).forEach((f: any) => {
      if (!fileCounts[f.library_item_id]) {
        fileCounts[f.library_item_id] = { count: 0, totalSize: 0 };
      }
      fileCounts[f.library_item_id].count++;
      fileCounts[f.library_item_id].totalSize += f.size_bytes || 0;
    });

    // Batch-fetch assignment counts
    const { data: assignments } = await adminClient.from("content_assignments" as any)
      .select("library_item_id")
      .in("library_item_id", itemIds) as { data: any };

    const assignCounts: Record<string, number> = {};
    (assignments || []).forEach((a: any) => {
      assignCounts[a.library_item_id] = (assignCounts[a.library_item_id] || 0) + 1;
    });

    const enriched = items.map((item: any) => ({
      ...item,
      fileCount: fileCounts[item.id]?.count || 0,
      totalSize: fileCounts[item.id]?.totalSize || 0,
      assignmentCount: assignCounts[item.id] || 0,
    }));

    return NextResponse.json({ items: enriched });
  } catch (error) {
    console.error("Fetch library items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
