import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendModelApprovalEmail } from "@/lib/email";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { z } from "zod";

const modelPatchSchema = z.object({
  is_approved: z.boolean(),
});

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = modelPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { is_approved } = parsed.data;

    // Get current model data before update
    const { data: model } = await (supabase
      .from("models") as any)
      .select("email, first_name, last_name, username, is_approved, user_id")
      .eq("id", id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Check if approval status is actually changing
    const statusChanged = model.is_approved !== is_approved;

    // Update the model
    const { error } = await (supabase
      .from("models") as any)
      .update({ is_approved, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Update actor type based on approval status
    if (model.user_id) {
      const newActorType = is_approved ? "model" : "fan";
      const { error: actorError } = await (supabase
        .from("actors") as any)
        .update({ type: newActorType })
        .eq("user_id", model.user_id);

      if (actorError) {
        console.error("Error updating actor type:", actorError);
      }
    }

    // Send approval email only (never send rejection emails)
    if (statusChanged && is_approved && model.email) {
      const modelName = model.first_name
        ? `${model.first_name}${model.last_name ? ' ' + model.last_name : ''}`
        : model.username;

      try {
        await sendModelApprovalEmail({
          to: model.email,
          modelName,
          username: model.username,
        });
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error("Failed to send approval email:", emailError);
      }
    }

    // Log the admin action
    if (statusChanged) {
      await logAdminAction({
        supabase,
        adminUserId: user.id,
        action: is_approved ? AdminActions.MODEL_APPROVED : AdminActions.MODEL_REJECTED,
        targetType: "model",
        targetId: id,
        oldValues: { is_approved: model.is_approved },
        newValues: { is_approved },
      });
    }

    return NextResponse.json({ success: true, emailSent: statusChanged && !!model.email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
