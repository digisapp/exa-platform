import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

// POST /api/offers/[id]/checkin - Brand marks model as checked-in or no-show
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor and verify brand/admin
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "brand" && actor.type !== "admin")) {
      return NextResponse.json({ error: "Only brands can check in models" }, { status: 403 });
    }

    // Verify offer belongs to brand
    const { data: offer } = await (supabase
      .from("offers") as any)
      .select("id, brand_id, event_date")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (actor.type === "brand" && offer.brand_id !== actor.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const { response_id, action } = body;

    if (!response_id || !["checkin", "noshow"].includes(action)) {
      return NextResponse.json({
        error: "response_id and action (checkin/noshow) required"
      }, { status: 400 });
    }

    // Verify response exists and belongs to this offer
    const { data: response } = await (supabase
      .from("offer_responses") as any)
      .select("id, model_id, status")
      .eq("id", response_id)
      .eq("offer_id", offerId)
      .single();

    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    // Only allow check-in for confirmed/accepted responses
    if (!["confirmed", "accepted"].includes(response.status)) {
      return NextResponse.json({
        error: "Can only check in confirmed or accepted models"
      }, { status: 400 });
    }

    // Update based on action
    if (action === "checkin") {
      const { error: updateError } = await (adminClient
        .from("offer_responses") as any)
        .update({
          checked_in_at: new Date().toISOString(),
          no_show: false,
        })
        .eq("id", response_id);

      if (updateError) throw updateError;
    } else if (action === "noshow") {
      const { error: updateError } = await (adminClient
        .from("offer_responses") as any)
        .update({
          no_show: true,
          checked_in_at: null,
        })
        .eq("id", response_id);

      if (updateError) throw updateError;
    }

    // The trigger will automatically recalculate the model's reliability score

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Error checking in:", error);
    return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
  }
}

// DELETE /api/offers/[id]/checkin - Reset check-in status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "brand" && actor.type !== "admin")) {
      return NextResponse.json({ error: "Only brands can modify check-in status" }, { status: 403 });
    }

    const { data: offer } = await (supabase
      .from("offers") as any)
      .select("id, brand_id")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (actor.type === "brand" && offer.brand_id !== actor.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get("response_id");

    if (!responseId) {
      return NextResponse.json({ error: "response_id required" }, { status: 400 });
    }

    // Reset check-in status
    const { error: updateError } = await (adminClient
      .from("offer_responses") as any)
      .update({
        checked_in_at: null,
        no_show: false,
      })
      .eq("id", responseId)
      .eq("offer_id", offerId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting check-in:", error);
    return NextResponse.json({ error: "Failed to reset check-in" }, { status: 500 });
  }
}
