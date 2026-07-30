import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { withAuth } from "@/lib/auth/with-auth";
import { sendBrandApprovalEmail } from "@/lib/email";
import { z } from "zod";

const brandPatchSchema = z.object({ is_verified: z.boolean() }).strict();

export const PATCH = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id } = params;

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
  },
  { requireType: "admin", rateLimit: "general" }
);

export const DELETE = withAuth<{ id: string }>(
  async ({ params, user, supabase }) => {
    const { id } = params;

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
  },
  { requireType: "admin", rateLimit: "general" }
);
