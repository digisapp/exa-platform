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

    // Get the model's user_id
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("id, user_id, first_name, last_name, email")
      .eq("id", modelId)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Check if fan already exists for this user
    const { data: existingFan } = await supabase
      .from("fans")
      .select("id")
      .eq("user_id", model.user_id)
      .single();

    if (!existingFan) {
      // Create fan record
      const { error: fanError } = await supabase
        .from("fans")
        .insert({
          user_id: model.user_id,
          display_name: model.first_name
            ? `${model.first_name} ${model.last_name || ""}`.trim()
            : null,
          email: model.email,
          coin_balance: 0,
        });

      if (fanError) {
        console.error("Error creating fan:", fanError);
        throw fanError;
      }
    }

    // Update actor type from model to fan
    const { error: actorError } = await supabase
      .from("actors")
      .update({ type: "fan" })
      .eq("user_id", model.user_id)
      .eq("type", "model");

    if (actorError) {
      console.error("Error updating actor:", actorError);
      throw actorError;
    }

    // Delete the model record
    const { error: deleteError } = await supabase
      .from("models")
      .delete()
      .eq("id", modelId);

    if (deleteError) {
      console.error("Error deleting model:", deleteError);
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
