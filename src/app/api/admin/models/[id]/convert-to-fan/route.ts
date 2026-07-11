import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the model, including its stored balance so it carries over to the fan
    // wallet. The actor row is preserved (only its type flips), so the ledger
    // (coin_transactions.actor_id) keeps following this user; only the stored
    // balance needs moving from models.coin_balance → fans.coin_balance.
    const { data: model, error: modelError } = await (supabase
      .from("models") as any)
      .select("id, user_id, first_name, last_name, email, coin_balance, total_coins_purchased")
      .eq("id", modelId)
      .single();

    if (modelError || !model || !model.user_id) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // All writes go through the service role: the model row soft-delete and the
    // actor type flip must both succeed, and hard-deleting the model would hit
    // the ON DELETE RESTRICT money FKs (migration 20260612000004).
    const serviceClient = createServiceRoleClient();

    // Check if fan already exists for this user
    const { data: existingFan } = await serviceClient
      .from("fans")
      .select("id")
      .eq("user_id", model.user_id)
      .single();

    if (existingFan) {
      // User already had a fan wallet (same actor) — just make sure it's active.
      // The actor's spendable balance already lives on this row, so nothing to move.
      const { error: fanUpdateError } = await (serviceClient.from("fans") as any)
        .update({ deleted_at: null })
        .eq("id", existingFan.id);
      if (fanUpdateError) {
        console.error("Error reactivating fan:", fanUpdateError);
        throw fanUpdateError;
      }
    } else {
      // Create fan record, carrying the model's coin balance over.
      const { error: fanError } = await (serviceClient.from("fans") as any)
        .insert({
          user_id: model.user_id,
          display_name: model.first_name
            ? `${model.first_name} ${model.last_name || ""}`.trim()
            : null,
          email: model.email,
          coin_balance: model.coin_balance || 0,
          total_coins_purchased: model.total_coins_purchased || 0,
        });

      if (fanError) {
        console.error("Error creating fan:", fanError);
        throw fanError;
      }
    }

    // Update actor type from model to fan
    const { error: actorError } = await (serviceClient
      .from("actors") as any)
      .update({ type: "fan" })
      .eq("user_id", model.user_id)
      .eq("type", "model");

    if (actorError) {
      console.error("Error updating actor:", actorError);
      throw actorError;
    }

    // Soft-delete the (now orphaned) model row so it drops out of model lists but
    // its history and money FKs stay intact.
    const { error: deleteError } = await (serviceClient.from("models") as any)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: "converted_to_fan",
        is_approved: false,
      })
      .eq("id", modelId);

    if (deleteError) {
      console.error("Error soft-deleting model:", deleteError);
      throw deleteError;
    }

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.MODEL_CONVERTED_TO_FAN,
      targetType: "model",
      targetId: modelId,
      oldValues: { type: "model", user_id: model.user_id, email: model.email },
      newValues: { type: "fan" },
    });

    return NextResponse.json({
      success: true,
      message: "Model converted to fan successfully"
    });
  } catch (error: unknown) {
    console.error("Convert to fan error:", error);
    const message = error instanceof Error ? error.message : "Failed to convert model to fan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
