import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendBrandApprovalEmail } from "@/lib/email";
import { z } from "zod";

const brandPatchSchema = z.object({ is_verified: z.boolean() }).strict();

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
    const parsed = brandPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { is_verified } = parsed.data;

    // Use service role client to bypass RLS for brand updates
    const adminClient = createServiceRoleClient();

    // Fetch brand before updating so we can send approval email
    const { data: brand } = await adminClient
      .from("brands")
      .select("email, company_name, is_verified")
      .eq("id", id)
      .single();

    const { error } = await adminClient
      .from("brands")
      .update({
        is_verified: is_verified ?? false,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    // Send approval email when brand is newly verified
    if (is_verified && brand && !brand.is_verified && brand.email) {
      try {
        await sendBrandApprovalEmail({
          to: brand.email,
          companyName: brand.company_name || "Brand",
        });
      } catch (emailError) {
        console.error("Failed to send brand approval email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
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

    // Use service role client to bypass RLS for brand deletes
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient
      .from("brands")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.BRAND_DELETED,
      targetType: "brand",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
