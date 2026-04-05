import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendModelApprovalEmail } from "@/lib/email";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const modelPatchSchema = z.object({
  is_approved: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country_code: z.string().max(10).nullable().optional(),
  height: z.string().max(20).nullable().optional(),
  dob: z.string().nullable().optional(),
  bust: z.string().max(20).nullable().optional(),
  waist: z.string().max(20).nullable().optional(),
  hips: z.string().max(20).nullable().optional(),
  dress_size: z.string().max(20).nullable().optional(),
  shoe_size: z.string().max(20).nullable().optional(),
  hair_color: z.string().max(50).nullable().optional(),
  eye_color: z.string().max(50).nullable().optional(),
  instagram_name: z.string().max(100).nullable().optional(),
  instagram_followers: z.number().int().min(0).nullable().optional(),
  tiktok_username: z.string().max(100).nullable().optional(),
  tiktok_followers: z.number().int().min(0).nullable().optional(),
  availability_status: z.string().max(50).nullable().optional(),
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

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

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
    const updates = parsed.data;
    const { is_approved } = updates;

    // Get current model data before update
    const { data: model } = await (supabase
      .from("models")
      .select("email, first_name, last_name, username, is_approved, user_id, preferred_language") as any)
      .eq("id", id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Check if approval status is actually changing
    const statusChanged = is_approved !== undefined && model.is_approved !== is_approved;

    // Normalize empty strings to null for nullable fields
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      updatePayload[key] = value === "" ? null : value;
    }

    // Update the model
    const { error } = await supabase
      .from("models")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw error;

    // Update actor type based on approval status (only if approval changed)
    if (statusChanged && model.user_id) {
      const newActorType = is_approved ? "model" : "fan";
      const { error: actorError } = await supabase
        .from("actors")
        .update({ type: newActorType })
        .eq("user_id", model.user_id);

      if (actorError) {
        console.error("Error updating actor type:", actorError);
      }
    }

    // Send approval email only (never send rejection emails)
    if (statusChanged && is_approved && model.email) {
      const email = model.email;
      const modelName: string = model.first_name
        ? `${model.first_name}${model.last_name ? ' ' + model.last_name : ''}`
        : model.username || "Model";

      try {
        await sendModelApprovalEmail({
          to: email,
          modelName,
          username: model.username || "",
          language: (model as any).preferred_language || "en",
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
