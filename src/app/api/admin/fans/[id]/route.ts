import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";

const fanPatchSchema = z.object({
  is_suspended: z.boolean().optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .transform((val) => val.toLowerCase().trim())
    .optional(),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less")
    .transform((val) => val.trim())
    .optional(),
});

// PATCH - Update fan (suspend/unsuspend, edit username/display_name)
export const PATCH = withAuth<{ id: string }>(
  async ({ request, params, user, supabase }) => {
    const { id: fanId } = params;

    const body = await request.json();
    const parsed = fanPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { is_suspended, username, display_name } = parsed.data;

    // If username is being changed, check availability
    if (username) {
      const [
        { data: existingModel },
        { data: existingFan },
        { data: existingBrand },
      ] = await Promise.all([
        supabase.from("models").select("id").eq("username", username).single(),
        supabase.from("fans").select("id").eq("username", username).neq("id", fanId).single(),
        supabase.from("brands").select("id").eq("username", username).single(),
      ]);

      if (existingModel || existingFan || existingBrand) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (is_suspended !== undefined) updateData.is_suspended = is_suspended;
    if (username) updateData.username = username;
    if (display_name) updateData.display_name = display_name;

    const { error } = await (supabase.from("fans") as any)
      .update(updateData)
      .eq("id", fanId);

    if (error) {
      console.error("Error updating fan:", error);
      throw error;
    }

    // Log the admin action
    const action = is_suspended !== undefined
      ? (is_suspended ? AdminActions.FAN_SUSPENDED : AdminActions.FAN_UNSUSPENDED)
      : AdminActions.FAN_UPDATED;

    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action,
      targetType: "fan",
      targetId: fanId,
      newValues: { ...parsed.data },
    });

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);

// DELETE - Delete fan
export const DELETE = withAuth<{ id: string }>(
  async ({ params, user, supabase }) => {
    const { id: fanId } = params;

    // Get the fan's user_id first
    const { data: fan, error: fanError } = await supabase
      .from("fans")
      .select("id, user_id")
      .eq("id", fanId)
      .single();

    if (fanError || !fan) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    // Soft-delete, never hard-delete. coin_transactions.actor_id is ON DELETE
    // RESTRICT (migration 20260612000004), so hard-deleting any fan who ever
    // transacted throws; soft-delete also preserves the ledger and lets the
    // account be restored. Mirrors the model delete route.
    const serviceClient = createServiceRoleClient();

    const { error: deleteError } = await (serviceClient.from("fans") as any)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", fanId);

    if (deleteError) {
      console.error("Error deleting fan:", deleteError);
      throw deleteError;
    }

    // Deactivate the actor
    if (fan.user_id) {
      const { error: actorError } = await (serviceClient.from("actors") as any)
        .update({ deactivated_at: new Date().toISOString() })
        .eq("user_id", fan.user_id)
        .eq("type", "fan");
      if (actorError) {
        console.error("Error deactivating fan actor:", actorError);
        throw actorError;
      }

      // Revoke the login: ban the auth user so refresh-token renewal and new
      // sign-ins fail (existing access tokens die at expiry, and the
      // assertNotSuspended deleted_at gate blocks spend/message routes in the
      // meantime). Best-effort — the soft delete above is the source of
      // truth. The restore route lifts the ban with ban_duration "none".
      const { error: banError } = await serviceClient.auth.admin.updateUserById(
        fan.user_id,
        { ban_duration: "87600h" } // ~10 years
      );
      if (banError) {
        console.error("Error banning deleted fan's auth user:", banError);
      }
    }

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.FAN_DELETED,
      targetType: "fan",
      targetId: fanId,
      oldValues: { user_id: fan.user_id },
    });

    return NextResponse.json({
      success: true,
      message: "Fan deleted successfully"
    });
  },
  { requireType: "admin", rateLimit: "general" }
);
