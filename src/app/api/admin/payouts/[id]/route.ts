import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { z } from "zod";

const payoutSchema = z.object({
  status: z.enum(["completed", "failed", "processing"]),
  notes: z.string().optional(),
});

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
    const parsed = payoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { status, notes } = parsed.data;

    // Validate status transition
    const { data: currentWithdrawal, error: fetchError } = await (supabase
      .from("withdrawal_requests") as any)
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError || !currentWithdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ["processing", "completed", "failed"],
      processing: ["completed", "failed"],
      completed: [],
      failed: ["processing"],
    };

    const currentStatus = currentWithdrawal.status as string;
    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "${status}". Allowed transitions: ${allowed.length > 0 ? allowed.join(", ") : "none"}` },
        { status: 400 }
      );
    }

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
