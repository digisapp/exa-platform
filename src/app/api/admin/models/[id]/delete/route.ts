import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function DELETE(
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

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get the model's data first (for audit logging)
    const { data: model, error: modelError } = await supabase
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
    const serviceClient = createServiceRoleClient();

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
  } catch (error: unknown) {
    console.error("Delete model error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
