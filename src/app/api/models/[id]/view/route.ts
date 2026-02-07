import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const { id: modelId } = await context.params;

    if (!modelId) {
      return NextResponse.json({ error: "Model ID required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();

    // Get model to check ownership
    const { data: model } = await supabase
      .from("models")
      .select("id, user_id, is_approved, profile_views")
      .eq("id", modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Don't count views from the model themselves
    if (user && model.user_id === user.id) {
      return NextResponse.json({ success: true, counted: false, reason: "owner" });
    }

    // Only count views for approved models
    if (!model.is_approved) {
      return NextResponse.json({ success: true, counted: false, reason: "not_approved" });
    }

    // Increment profile views
    const { error } = await supabase
      .from("models")
      .update({ profile_views: (model.profile_views || 0) + 1 })
      .eq("id", modelId);

    if (error) {
      console.error("Failed to increment views:", error);
      return NextResponse.json({ error: "Failed to track view" }, { status: 500 });
    }

    return NextResponse.json({ success: true, counted: true });
  } catch (error) {
    console.error("View tracking error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
