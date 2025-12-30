import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes, modelId, coins } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
      updateData.processed_at = new Date().toISOString();
      updateData.processed_by = actor.id;
      if (notes) {
        updateData.admin_notes = notes;
      }
    }

    if (status === "processing") {
      updateData.processed_at = new Date().toISOString();
      updateData.processed_by = actor.id;
    }

    if (status === "failed") {
      updateData.failure_reason = notes;
      updateData.processed_by = actor.id;

      // Refund coins to model
      if (modelId && coins) {
        const { error: refundError } = await supabase
          .from("models")
          .update({
            coin_balance: supabase.rpc("increment_coin_balance", {
              row_id: modelId,
              amount: coins,
            }),
          })
          .eq("id", modelId);

        // Alternative: direct SQL update
        const { error: updateError } = await supabase.rpc("refund_withdrawal", {
          p_model_id: modelId,
          p_coins: coins,
        });

        // Fallback: simple update
        if (updateError) {
          const { data: model } = await supabase
            .from("models")
            .select("coin_balance")
            .eq("id", modelId)
            .single();

          if (model) {
            await supabase
              .from("models")
              .update({ coin_balance: model.coin_balance + coins })
              .eq("id", modelId);
          }
        }
      }
    }

    // Update withdrawal request
    const { error } = await supabase
      .from("withdrawal_requests")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating withdrawal:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
