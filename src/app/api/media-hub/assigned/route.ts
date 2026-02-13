import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// GET - List content assigned to the current brand
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get assignments for this brand
    const { data: assignments, error } = await adminClient.from("content_assignments" as any)
      .select("id, library_item_id, notes, assigned_at")
      .eq("recipient_actor_id", actor.id)
      .order("assigned_at", { ascending: false }) as { data: any[]; error: any };

    if (error) {
      console.error("Failed to fetch assignments:", error);
      return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Fetch library items
    const itemIds = assignments.map((a: any) => a.library_item_id);

    const { data: libraryItems } = await adminClient.from("content_library" as any)
      .select("id, title, description, created_at")
      .in("id", itemIds) as { data: any };

    const itemMap: Record<string, any> = {};
    (libraryItems || []).forEach((i: any) => { itemMap[i.id] = i; });

    // Fetch file counts
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

    // Combine
    const items = assignments.map((a: any) => ({
      assignmentId: a.id,
      libraryItemId: a.library_item_id,
      notes: a.notes,
      assignedAt: a.assigned_at,
      title: itemMap[a.library_item_id]?.title || "Untitled",
      description: itemMap[a.library_item_id]?.description || null,
      fileCount: fileCounts[a.library_item_id]?.count || 0,
      totalSize: fileCounts[a.library_item_id]?.totalSize || 0,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Fetch assigned content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
