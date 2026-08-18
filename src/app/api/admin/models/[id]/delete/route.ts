import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { withAuth } from "@/lib/auth/with-auth";

export const DELETE = withAuth<{ id: string }>(
  async ({ params, user, supabase }) => {
    const { id: modelId } = params;

    // Service client: email/first_name/last_name not column-granted to client roles (Phase B2 lockdown)
    const serviceClient = createServiceRoleClient();

    // Get the model's data first (for audit logging)
    const { data: model, error: modelError } = await serviceClient
      .from("models")
      .select("id, user_id, email, username, first_name, last_name")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Soft-delete, never hard-delete. The money FKs (coin_transactions.actor_id,
    // withdrawal_requests/payoneer_payouts.model_id) are ON DELETE RESTRICT since
    // migration 20260612000004, so a hard delete throws for any model who ever
    // transacted — exactly the accounts admins act on. Soft-delete also keeps the
    // account restorable via /api/admin/models/[id]/restore (the inverse of this).
    const { error: deleteError } = await (serviceClient.from("models") as any)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: "admin_deleted",
        is_approved: false,
      })
      .eq("id", modelId);

    if (deleteError) {
      console.error("Error deleting model:", deleteError);
      throw deleteError;
    }

    // Deactivate the actor (mirrors the restore route, which clears deactivated_at)
    if (model.user_id) {
      const { error: actorError } = await (serviceClient.from("actors") as any)
        .update({ deactivated_at: new Date().toISOString() })
        .eq("user_id", model.user_id)
        .eq("type", "model");
      if (actorError) {
        console.error("Error deactivating model actor:", actorError);
        throw actorError;
      }
    }

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.MODEL_DELETED,
      targetType: "model",
      targetId: modelId,
      oldValues: {
        email: model.email,
        username: model.username,
        first_name: model.first_name,
        last_name: model.last_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Model deleted successfully"
    });
  },
  { requireType: "admin", rateLimit: "general" }
);
