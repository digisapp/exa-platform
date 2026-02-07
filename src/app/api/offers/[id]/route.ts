import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

// GET /api/offers/[id] - Get single offer with responses
export async function GET(
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

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get offer
    const { data: offer } = await (supabase
      .from("offers") as any)
      .select(`
        *,
        brand:actors!brand_id(
          id,
          brands:brands(id, company_name, logo_url)
        ),
        list:brand_lists(id, name)
      `)
      .eq("id", id)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check access
    if (actor.type === "brand" && offer.brand_id !== actor.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // For brands, include full response details with model info
    if (actor.type === "brand" || actor.type === "admin") {
      const { data: responses } = await (supabase
        .from("offer_responses") as any)
        .select(`
          *,
          model:models(id, username, first_name, last_name, profile_photo_url, city, state, reliability_score)
        `)
        .eq("offer_id", id)
        .order("responded_at", { ascending: false, nullsFirst: false });

      return NextResponse.json({ offer, responses: responses || [] });
    }

    // For models, just include their own response
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (model) {
      const { data: myResponse } = await (supabase
        .from("offer_responses") as any)
        .select("*")
        .eq("offer_id", id)
        .eq("model_id", model.id)
        .single();

      return NextResponse.json({ offer, my_response: myResponse });
    }

    return NextResponse.json({ offer });
  } catch (error) {
    console.error("Error fetching offer:", error);
    return NextResponse.json({ error: "Failed to fetch offer" }, { status: 500 });
  }
}

// PATCH /api/offers/[id] - Update offer (brand only)
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

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "brand" && actor.type !== "admin")) {
      return NextResponse.json({ error: "Only brands can update offers" }, { status: 403 });
    }

    // Verify offer belongs to brand
    const { data: offer } = await (supabase
      .from("offers") as any)
      .select("id, brand_id")
      .eq("id", id)
      .single();

    if (!offer || (actor.type !== "admin" && offer.brand_id !== actor.id)) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const body = await request.json();

    // Handle response status update
    if (body.update_response) {
      const { id: responseId, status: responseStatus } = body.update_response;

      if (!responseId || !responseStatus) {
        return NextResponse.json({ error: "Response ID and status required" }, { status: 400 });
      }

      // Get current response to check previous status
      const { data: currentResponse } = await (supabase
        .from("offer_responses") as any)
        .select("status")
        .eq("id", responseId)
        .eq("offer_id", id)
        .single();

      if (!currentResponse) {
        return NextResponse.json({ error: "Response not found" }, { status: 404 });
      }

      const previousStatus = currentResponse.status;

      // Update response
      const { error: updateError } = await (adminClient
        .from("offer_responses") as any)
        .update({
          status: responseStatus,
          responded_at: new Date().toISOString(),
        })
        .eq("id", responseId);

      if (updateError) throw updateError;

      // Update spots_filled if status changed to/from accepted/confirmed
      const wasAccepted = ["accepted", "confirmed"].includes(previousStatus);
      const isAccepted = ["accepted", "confirmed"].includes(responseStatus);

      if (isAccepted && !wasAccepted) {
        await adminClient.rpc("increment_offer_spots_filled", { p_offer_id: id });
      } else if (!isAccepted && wasAccepted) {
        await adminClient.rpc("decrement_offer_spots_filled", { p_offer_id: id });
      }

      return NextResponse.json({ success: true });
    }

    // Handle offer field updates
    const allowedFields = [
      "title", "description", "location_name", "location_city", "location_state",
      "event_date", "event_time", "compensation_type", "compensation_amount",
      "compensation_description", "spots", "status"
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedOffer, error } = await (adminClient
      .from("offers") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ offer: updatedOffer });
  } catch (error) {
    console.error("Error updating offer:", error);
    return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
  }
}

// DELETE /api/offers/[id] - Delete offer (brand only)
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

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || (actor.type !== "brand" && actor.type !== "admin")) {
      return NextResponse.json({ error: "Only brands can delete offers" }, { status: 403 });
    }

    // Verify offer belongs to brand
    const { data: offer } = await (supabase
      .from("offers") as any)
      .select("id, brand_id")
      .eq("id", id)
      .single();

    if (!offer || offer.brand_id !== actor.id) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Delete responses first
    await (adminClient.from("offer_responses") as any)
      .delete()
      .eq("offer_id", id);

    // Delete offer
    const { error } = await (adminClient
      .from("offers") as any)
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return NextResponse.json({ error: "Failed to delete offer" }, { status: 500 });
  }
}
