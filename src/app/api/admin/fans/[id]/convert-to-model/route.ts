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

// POST - Convert fan to model
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fanId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createServiceRoleClient();

    // Fetch just enough for the 404 check and the audit log — the actual
    // conversion is a single atomic RPC below. (Service client: fan rows
    // aren't readable through RLS.)
    const { data: fan, error: fanError } = await (adminClient
      .from("fans") as any)
      .select("id, user_id, email")
      .eq("id", fanId)
      .single() as { data: { id: string; user_id: string | null; email: string | null } | null; error: unknown };

    if (fanError || !fan || !fan.user_id) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    // All wallet/role mutations happen atomically in the service-role-only
    // RPC (migration 20260712100003): reactivate-or-create the model wallet,
    // ADD the fan's stored balance to it (never overwrite — a re-converted
    // model keeps her earnings), zero the fan wallet, flip the actor to
    // model (clearing deactivated_at), and SOFT-delete the fan row with
    // deleted_reason 'converted_to_model' (the fan restore route 409s on
    // that reason). The actor row is preserved (only its type flips), so the
    // ledger (coin_transactions.actor_id) keeps following this user — only
    // the stored balance moves.
    const { data, error: rpcError } = await (adminClient.rpc as any)(
      "convert_fan_wallet_to_model",
      { p_user_id: fan.user_id }
    );

    if (rpcError) {
      console.error("Convert to model RPC error:", rpcError);
      throw rpcError;
    }

    const result = data as {
      success?: boolean;
      error?: string;
      model_id?: string;
      username?: string | null;
      migrated_coins?: number;
    } | null;

    if (!result?.success) {
      const message = result?.error || "Failed to convert fan to model";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const username = result.username ?? "";

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.FAN_CONVERTED_TO_MODEL,
      targetType: "fan",
      targetId: fanId,
      oldValues: { type: "fan", user_id: fan.user_id, email: fan.email },
      newValues: { type: "model", username },
    });

    return NextResponse.json({
      success: true,
      message: "Fan converted to model successfully",
      username,
    });
  } catch (error: unknown) {
    console.error("Convert to model error:", error);
    const message = error instanceof Error ? error.message : "Failed to convert to model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
