import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
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

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// PATCH - Update fan (suspend/unsuspend, edit username/display_name)
export async function PATCH(
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

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
  } catch (error: unknown) {
    console.error("Update fan error:", error);
    const message = error instanceof Error ? error.message : "Failed to update fan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Delete fan
export async function DELETE(
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

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the fan's user_id first
    const { data: fan, error: fanError } = await supabase
      .from("fans")
      .select("id, user_id")
      .eq("id", fanId)
      .single();

    if (fanError || !fan) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    // Delete the fan record
    const { error: deleteError } = await supabase
      .from("fans")
      .delete()
      .eq("id", fanId);

    if (deleteError) {
      console.error("Error deleting fan:", deleteError);
      throw deleteError;
    }

    // Also delete the actor if it exists
    if (fan.user_id) {
      await supabase
        .from("actors")
        .delete()
        .eq("user_id", fan.user_id)
        .eq("type", "fan");
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
  } catch (error: unknown) {
    console.error("Delete fan error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete fan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
