import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

// POST - Restore a soft-deleted fan (mirrors /api/admin/models/[id]/restore)
export const POST = withAuth<{ id: string }>(
  async ({ params }) => {
    const { id: fanId } = params;

    const serviceClient = createServiceRoleClient();

    // Get the fan to restore
    const { data: fan } = await serviceClient
      .from("fans")
      .select("id, user_id, deleted_at, deleted_reason, purged_at")
      .eq("id", fanId)
      .single() as { data: { id: string; user_id: string | null; deleted_at: string | null; deleted_reason: string | null; purged_at: string | null } | null };

    if (!fan) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    if (!fan.deleted_at) {
      return NextResponse.json({ error: "Fan is not deleted" }, { status: 400 });
    }

    if (fan.purged_at) {
      return NextResponse.json({ error: "Fan data has been purged and cannot be restored" }, { status: 400 });
    }

    // Mirror of the model-restore guard: fan→model conversion (RPC
    // convert_fan_wallet_to_model, 20260712100003) soft-deletes the fan row
    // with this reason after moving its balance to the model wallet.
    // Restoring it would resurrect a zeroed fan wallet next to the active
    // model account.
    if (fan.deleted_reason === "converted_to_model") {
      return NextResponse.json(
        { error: "This fan was converted to a model account. Use model-to-fan conversion to bring them back instead of restoring." },
        { status: 409 }
      );
    }

    // Lift the auth ban BEFORE clearing deleted_at, so a failure here leaves
    // the fan deleted and the whole restore cleanly retryable. The admin
    // delete route bans the auth user (ban_duration) to revoke their session;
    // "none" clears it and is a harmless no-op for never-banned users
    // (e.g. self-deleted fans).
    if (fan.user_id) {
      const { error: unbanError } = await serviceClient.auth.admin.updateUserById(
        fan.user_id,
        { ban_duration: "none" }
      );
      if (unbanError) {
        console.error("Error lifting fan auth ban:", unbanError);
        return NextResponse.json({ error: "Failed to restore fan login" }, { status: 500 });
      }
    }

    // Restore fan
    const { error: fanError } = await (serviceClient
      .from("fans") as any)
      .update({
        deleted_at: null,
        deleted_reason: null,
      })
      .eq("id", fanId);

    if (fanError) throw fanError;

    // Reactivate actor (the delete route only deactivates fan-type actors,
    // so mirror that scope here)
    if (fan.user_id) {
      await (serviceClient
        .from("actors") as any)
        .update({ deactivated_at: null })
        .eq("user_id", fan.user_id)
        .eq("type", "fan");
    }

    return NextResponse.json({ success: true });
  },
  { requireType: "admin" }
);
