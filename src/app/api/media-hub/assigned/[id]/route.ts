import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// GET - Get a specific assigned library item with files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryItemId } = await params;
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

    // Verify brand has assignment for this item
    const { data: assignment } = await adminClient.from("content_assignments" as any)
      .select("id, notes, assigned_at")
      .eq("library_item_id", libraryItemId)
      .eq("recipient_actor_id", actor.id)
      .maybeSingle() as { data: any };

    if (!assignment) {
      return NextResponse.json({ error: "Content not found or not assigned to you" }, { status: 403 });
    }

    // Get library item
    const { data: item } = await adminClient.from("content_library" as any)
      .select("id, title, description, created_at")
      .eq("id", libraryItemId)
      .maybeSingle() as { data: any };

    if (!item) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Get files
    const { data: files } = await adminClient.from("content_library_files" as any)
      .select("*")
      .eq("library_item_id", libraryItemId)
      .order("created_at", { ascending: true }) as { data: any };

    return NextResponse.json({
      item: {
        ...item,
        notes: assignment.notes,
        assignedAt: assignment.assigned_at,
        files: files || [],
      },
    });
  } catch (error) {
    console.error("Fetch assigned item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
