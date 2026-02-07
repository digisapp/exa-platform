import { createClient } from "@/lib/supabase/server";
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

    // Get the fan record
    const { data: fan, error: fanError } = await supabase
      .from("fans")
      .select("id, user_id, email, display_name, coin_balance")
      .eq("id", fanId)
      .single();

    if (fanError || !fan || !fan.user_id) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    const fanUserId = fan.user_id;

    // Update the actor type from 'fan' to 'model'
    const { error: actorError } = await supabase
      .from("actors")
      .update({ type: "model" })
      .eq("user_id", fanUserId)
      .eq("type", "fan");

    if (actorError) {
      console.error("Error updating actor:", actorError);
      throw actorError;
    }

    // Create a basic model profile
    const username = (fan.display_name || fan.email?.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) + Math.random().toString(36).slice(2, 6);

    const { error: modelError } = await supabase.from("models")
      .insert({
        user_id: fanUserId as string,
        email: fan.email ?? "",
        username: username,
        first_name: fan.display_name || "New",
        last_name: "Model",
        is_approved: true, // Auto-approve since admin initiated conversion
        coin_balance: fan.coin_balance || 0,
      });

    if (modelError) {
      console.error("Error creating model:", modelError);
      // Try to rollback actor change
      await supabase
        .from("actors")
        .update({ type: "fan" })
        .eq("user_id", fanUserId);
      throw modelError;
    }

    // Delete the fan record
    await supabase
      .from("fans")
      .delete()
      .eq("id", fanId);

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.FAN_CONVERTED_TO_MODEL,
      targetType: "fan",
      targetId: fanId,
      oldValues: { type: "fan", user_id: fanUserId, email: fan.email },
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
