import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

// DELETE - Revoke an assignment
export const DELETE = withAuth<{ id: string; assignmentId: string }>(
  async ({ params }) => {
    const { id: itemId, assignmentId } = params;

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
      logger.error("Failed to revoke assignment", error);
      return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
