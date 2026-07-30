import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/fix-stuck-models
 * Fix models who have logins (user_id) but aren't approved
 * This is a one-time fix for models created before the bug was fixed
 */
export const POST = withAuth(
  async () => {
    // Use admin client to bypass RLS
    const adminClient = createServiceRoleClient();

    // Find all models who have user_id but aren't approved
    const { data: stuckModels, error: fetchError } = await adminClient
      .from("models")
      .select("id, username, email, user_id, is_approved")
      .not("user_id", "is", null)
      .is("deleted_at", null)
      .or("is_approved.is.null,is_approved.eq.false");

    if (fetchError) {
      logger.error("Error fetching stuck models", fetchError);
      return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
    }

    if (!stuckModels || stuckModels.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No stuck models found",
        fixed: 0,
      });
    }

    // Approve all stuck models
    const { error: updateError } = await adminClient
      .from("models")
      .update({ is_approved: true })
      .not("user_id", "is", null)
      .is("deleted_at", null) // never resurrect soft-deleted accounts
      .or("is_approved.is.null,is_approved.eq.false");

    if (updateError) {
      logger.error("Error updating models", updateError);
      return NextResponse.json({ error: "Failed to update models" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${stuckModels.length} stuck model(s)`,
      fixed: stuckModels.length,
      models: stuckModels.map(m => ({
        id: m.id,
        username: m.username,
        email: m.email,
      })),
    });
  },
  { requireType: "admin" }
);

/**
 * GET /api/admin/fix-stuck-models
 * Check how many models are stuck (without fixing them)
 */
export const GET = withAuth(
  async () => {
    // Use admin client to bypass RLS
    const adminClient = createServiceRoleClient();

    // Find all models who have user_id but aren't approved
    const { data: stuckModels, error: fetchError } = await adminClient
      .from("models")
      .select("id, username, email, user_id, is_approved")
      .not("user_id", "is", null)
      .is("deleted_at", null)
      .or("is_approved.is.null,is_approved.eq.false");

    if (fetchError) {
      logger.error("Error fetching stuck models", fetchError);
      return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
    }

    return NextResponse.json({
      count: stuckModels?.length || 0,
      models: stuckModels?.map(m => ({
        id: m.id,
        username: m.username,
        email: m.email,
        is_approved: m.is_approved,
      })) || [],
    });
  },
  { requireType: "admin" }
);
