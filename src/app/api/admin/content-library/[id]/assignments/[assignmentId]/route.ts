import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

async function verifyAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// DELETE - Revoke an assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: itemId, assignmentId } = await params;
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

    // Verify assignment exists and belongs to this item
    const { data: assignment } = await adminClient.from("content_assignments" as any)
      .select("id, library_item_id")
      .eq("id", assignmentId)
      .eq("library_item_id", itemId)
      .maybeSingle() as { data: any };

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const { error } = await adminClient.from("content_assignments" as any)
      .delete()
      .eq("id", assignmentId) as { error: any };

    if (error) {
      console.error("Failed to revoke assignment:", error);
      return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
