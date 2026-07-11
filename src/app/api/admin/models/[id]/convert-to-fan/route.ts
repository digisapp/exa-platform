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

    // Fetch just enough for the 404 check and the audit log — the actual
    // conversion is a single atomic RPC below.
    const { data: model, error: modelError } = await (supabase
      .from("models") as any)
      .select("id, user_id, email")
      .eq("id", modelId)
      .single();

    if (modelError || !model || !model.user_id) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // All wallet/role mutations happen atomically in the service-role-only
    // RPC (migration 20260711100002): reactivate-or-create the fan wallet,
    // ADD the model's stored balance to it, zero the model wallet, flip the
    // actor to fan (clearing deactivated_at), and soft-delete the model row
    // with deleted_reason 'converted_to_fan'. The actor row is preserved
    // (only its type flips), so the ledger (coin_transactions.actor_id)
    // keeps following this user — only the stored balance moves.
    const serviceClient = createServiceRoleClient();
    const { data, error: rpcError } = await (serviceClient.rpc as any)(
      "convert_model_wallet_to_fan",
      { p_model_id: modelId }
    );

    if (rpcError) {
      console.error("Convert to fan RPC error:", rpcError);
      throw rpcError;
    }

    const result = data as {
      success?: boolean;
      error?: string;
      fan_id?: string;
      migrated_coins?: number;
    } | null;

    if (!result?.success) {
      const message = result?.error || "Failed to convert model to fan";
      if (message === "Model not found") {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }
      return NextResponse.json({ error: message }, { status: 500 });
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
