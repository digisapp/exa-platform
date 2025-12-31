import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendModelApprovalEmail, sendModelRejectionEmail } from "@/lib/email";

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
    const { is_approved } = body;

    if (typeof is_approved !== "boolean") {
      return NextResponse.json({ error: "Invalid is_approved value" }, { status: 400 });
    }

    // Get current model data before update
    const { data: model } = await (supabase
      .from("models") as any)
      .select("email, first_name, last_name, username, is_approved")
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

    // Send email notification if status changed and model has email
    if (statusChanged && model.email) {
      const modelName = model.first_name
        ? `${model.first_name}${model.last_name ? ' ' + model.last_name : ''}`
        : model.username;

      try {
        if (is_approved) {
          // Model was just approved
          await sendModelApprovalEmail({
            to: model.email,
            modelName,
            username: model.username,
          });
          console.log(`Approval email sent to ${model.email}`);
        } else {
          // Model was just rejected/hidden
          await sendModelRejectionEmail({
            to: model.email,
            modelName,
          });
          console.log(`Rejection email sent to ${model.email}`);
        }
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error("Failed to send notification email:", emailError);
      }
    }

    return NextResponse.json({ success: true, emailSent: statusChanged && !!model.email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
