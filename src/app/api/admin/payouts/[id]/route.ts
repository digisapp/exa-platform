import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes } = body;

    // Use database functions for proper accounting
    if (status === "completed") {
      // Complete withdrawal - removes from withheld balance
      const { error: completeError } = await (supabase.rpc as any)("complete_withdrawal", {
        p_withdrawal_id: id,
      });

      if (completeError) {
        console.error("Error completing withdrawal:", completeError);
        return NextResponse.json({ error: completeError.message }, { status: 500 });
      }

      // Add admin notes if provided
      if (notes) {
        await (supabase
          .from("withdrawal_requests") as any)
          .update({
            admin_notes: notes,
            processed_by: actor.id,
          })
          .eq("id", id);
      }
    } else if (status === "failed") {
      // Cancel/reject withdrawal - refunds to available balance
      const { error: cancelError } = await (supabase.rpc as any)("cancel_withdrawal", {
        p_withdrawal_id: id,
      });

      if (cancelError) {
        console.error("Error cancelling withdrawal:", cancelError);
        return NextResponse.json({ error: cancelError.message }, { status: 500 });
      }

      // Update with failure reason
      await (supabase
        .from("withdrawal_requests") as any)
        .update({
          status: "failed",
          failure_reason: notes,
          processed_by: actor.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } else if (status === "processing") {
      // Just update status to processing
      const { error } = await (supabase
        .from("withdrawal_requests") as any)
        .update({
          status: "processing",
          processed_at: new Date().toISOString(),
          processed_by: actor.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating withdrawal:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Log the admin action
    const actionMap: Record<string, string> = {
      completed: AdminActions.PAYOUT_APPROVED,
      failed: AdminActions.PAYOUT_REJECTED,
      processing: AdminActions.PAYOUT_PROCESSING,
    };
    if (actionMap[status]) {
      await logAdminAction({
        supabase,
        adminUserId: user.id,
        action: actionMap[status],
        targetType: "withdrawal",
        targetId: id,
        newValues: { status, notes },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payout update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
