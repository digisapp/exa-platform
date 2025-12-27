import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { opportunityId } = await request.json();

    if (!opportunityId) {
      return NextResponse.json({ error: "Opportunity ID required" }, { status: 400 });
    }

    // Get the model's ID (models are linked by user_id, not actor)
    const { data: model } = await (supabase
      .from("models") as any)
      .select("id, is_approved")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    if (!model.is_approved) {
      return NextResponse.json({ error: "Your profile must be approved to apply" }, { status: 403 });
    }

    // Check if already applied
    const { data: existingApp } = await (supabase
      .from("opportunity_applications") as any)
      .select("id, status")
      .eq("opportunity_id", opportunityId)
      .eq("model_id", model.id)
      .single();

    if (existingApp) {
      return NextResponse.json({
        error: "You have already applied to this gig",
        status: existingApp.status
      }, { status: 400 });
    }

    // Check if opportunity is still open
    const { data: opportunity } = await (supabase
      .from("opportunities") as any)
      .select("id, status, spots, spots_filled")
      .eq("id", opportunityId)
      .single();

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    if (opportunity.status !== "open") {
      return NextResponse.json({ error: "This gig is no longer accepting applications" }, { status: 400 });
    }

    if (opportunity.spots && opportunity.spots_filled >= opportunity.spots) {
      return NextResponse.json({ error: "This gig is full" }, { status: 400 });
    }

    // Create application
    const { data: application, error } = await (supabase
      .from("opportunity_applications") as any)
      .insert({
        opportunity_id: opportunityId,
        model_id: model.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating application:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
      }
    });
  } catch (error) {
    console.error("Apply to gig error:", error);
    return NextResponse.json(
      { error: "Failed to apply to gig" },
      { status: 500 }
    );
  }
}
