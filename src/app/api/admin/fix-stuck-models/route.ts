import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/fix-stuck-models
 * Fix models who have logins (user_id) but aren't approved
 * This is a one-time fix for models created before the bug was fixed
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createServiceRoleClient();

    // Find all models who have user_id but aren't approved
    const { data: stuckModels, error: fetchError } = await adminClient
      .from("models")
      .select("id, username, email, user_id, is_approved")
      .not("user_id", "is", null)
      .or("is_approved.is.null,is_approved.eq.false");

    if (fetchError) {
      console.error("Error fetching stuck models:", fetchError);
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
      .or("is_approved.is.null,is_approved.eq.false");

    if (updateError) {
      console.error("Error updating models:", updateError);
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
  } catch (error) {
    console.error("Fix stuck models error:", error);
    return NextResponse.json(
      { error: "Failed to fix stuck models" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/fix-stuck-models
 * Check how many models are stuck (without fixing them)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminClient = createServiceRoleClient();

    // Find all models who have user_id but aren't approved
    const { data: stuckModels, error: fetchError } = await adminClient
      .from("models")
      .select("id, username, email, user_id, is_approved")
      .not("user_id", "is", null)
      .or("is_approved.is.null,is_approved.eq.false");

    if (fetchError) {
      console.error("Error fetching stuck models:", fetchError);
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
  } catch (error) {
    console.error("Check stuck models error:", error);
    return NextResponse.json(
      { error: "Failed to check stuck models" },
      { status: 500 }
    );
  }
}
