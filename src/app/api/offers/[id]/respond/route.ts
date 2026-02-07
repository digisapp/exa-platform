import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

// POST /api/offers/[id]/respond - Model responds to offer (accept/decline)
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

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get actor and verify model
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "model") {
      return NextResponse.json({ error: "Only models can respond to offers" }, { status: 403 });
    }

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id, username, first_name")
      .eq("user_id", user.id)
      .single() as { data: { id: string; username: string; first_name: string | null } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get offer
    const { data: offer } = await (supabase
      .from("offers") as any)
      .select("id, title, brand_id, status, spots, spots_filled")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (offer.status !== "open") {
      return NextResponse.json({ error: "This offer is no longer open" }, { status: 400 });
    }

    // Get existing response
    const { data: existingResponse } = await (supabase
      .from("offer_responses") as any)
      .select("id, status")
      .eq("offer_id", offerId)
      .eq("model_id", model.id)
      .single();

    if (!existingResponse) {
      return NextResponse.json({ error: "You were not invited to this offer" }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'accepted' or 'declined'" }, { status: 400 });
    }

    // Check if accepting and spots are full
    if (status === "accepted" && offer.spots_filled >= offer.spots) {
      return NextResponse.json({ error: "Sorry, all spots have been filled" }, { status: 400 });
    }

    const previousStatus = existingResponse.status;

    // Update response
    const { error: updateError } = await (adminClient
      .from("offer_responses") as any)
      .update({
        status,
        notes,
        responded_at: new Date().toISOString(),
      })
      .eq("id", existingResponse.id);

    if (updateError) throw updateError;

    // Update spots_filled
    if (status === "accepted" && previousStatus !== "accepted") {
      await adminClient.rpc("increment_offer_spots_filled", { p_offer_id: offerId });
    } else if (previousStatus === "accepted" && status !== "accepted") {
      await adminClient.rpc("decrement_offer_spots_filled", { p_offer_id: offerId });
    }

    // Notify brand via chat
    try {
      // Find or create conversation
      const { data: existingConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", actor.id) as { data: { conversation_id: string }[] | null };

      let conversationId: string | null = null;

      if (existingConvs) {
        for (const cp of existingConvs) {
          const { data: hasBrand } = await supabase
            .from("conversation_participants")
            .select("actor_id")
            .eq("conversation_id", cp.conversation_id)
            .eq("actor_id", offer.brand_id)
            .single();
          if (hasBrand) {
            conversationId = cp.conversation_id;
            break;
          }
        }
      }

      if (!conversationId) {
        const { data: newConv } = await (adminClient
          .from("conversations") as any)
          .insert({ type: "direct" })
          .select()
          .single();
        if (newConv) {
          conversationId = newConv.id;
          await (adminClient.from("conversation_participants") as any).insert([
            { conversation_id: conversationId, actor_id: actor.id },
            { conversation_id: conversationId, actor_id: offer.brand_id },
          ]);
        }
      }

      if (conversationId) {
        const modelName = model.first_name || `@${model.username}`;
        const message = status === "accepted"
          ? `${modelName} has accepted your offer "${offer.title}"!`
          : `${modelName} has declined your offer "${offer.title}".`;

        await (adminClient.from("messages") as any).insert({
          conversation_id: conversationId,
          sender_id: actor.id,
          content: message,
          is_system: true,
        });
      }
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Error responding to offer:", error);
    return NextResponse.json({ error: "Failed to respond to offer" }, { status: 500 });
  }
}
