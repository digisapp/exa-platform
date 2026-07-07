import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const respondOfferSchema = z.object({
  status: z.enum(["accepted", "declined"]),
  notes: z.string().trim().max(2000).optional().nullable(),
});

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
      .single();

    if (!actor || actor.type !== "model") {
      return NextResponse.json({ error: "Only models can respond to offers" }, { status: 403 });
    }

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id, username")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get offer
    const { data: offer } = await supabase
      .from("offers")
      .select("id, title, brand_id, status, spots, spots_filled, event_date")
      .eq("id", offerId)
      .single();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Get existing response
    const { data: existingResponse } = await supabase
      .from("offer_responses")
      .select("id, status")
      .eq("offer_id", offerId)
      .eq("model_id", model.id)
      .single();

    if (!existingResponse) {
      return NextResponse.json({ error: "You were not invited to this offer" }, { status: 403 });
    }

    const parsed = respondOfferSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { status, notes } = parsed.data;

    // Accepting requires an open, non-expired offer with spots left.
    // Declining is always allowed so models can clear stale invites.
    if (status === "accepted") {
      if (offer.status !== "open") {
        return NextResponse.json({ error: "This offer is no longer open" }, { status: 400 });
      }

      if (offer.event_date && offer.event_date < new Date().toISOString().split("T")[0]) {
        return NextResponse.json(
          { error: "This offer has expired (the event date has passed)" },
          { status: 400 }
        );
      }

    }

    const previousStatus = existingResponse.status;

    if (status === "accepted") {
      // Claim the spot atomically: accept_offer_spot locks the offer row,
      // re-checks capacity, increments spots_filled, and marks the response
      // accepted in one transaction — two models racing for the last spot
      // can't both get it, and a double-submit can't double-increment.
      const { data: claimData, error: claimError } = await adminClient.rpc("accept_offer_spot", {
        p_offer_id: offerId,
        p_response_id: existingResponse.id,
      });
      const claim = claimData as {
        success?: boolean;
        error?: string;
        spots_filled?: number;
        total_spots?: number;
      } | null;

      if (claimError) throw claimError;
      if (!claim?.success) {
        return NextResponse.json(
          { error: claim?.error === "All spots have been filled"
              ? "Sorry, all spots have been filled"
              : claim?.error || "Failed to accept offer" },
          { status: 400 }
        );
      }

      if (notes !== undefined) {
        await adminClient
          .from("offer_responses")
          .update({ notes })
          .eq("id", existingResponse.id);
      }

      // Auto-close the offer when all spots are filled
      if (claim.total_spots && (claim.spots_filled ?? 0) >= claim.total_spots) {
        await adminClient
          .from("offers")
          .update({ status: "closed" })
          .eq("id", offerId);
      }
    } else {
      const { error: updateError } = await adminClient
        .from("offer_responses")
        .update({
          status,
          notes,
          responded_at: new Date().toISOString(),
        })
        .eq("id", existingResponse.id);

      if (updateError) throw updateError;

      if (previousStatus === "accepted") {
        await adminClient.rpc("decrement_offer_spots_filled", { p_offer_id: offerId });
      }
    }

    // Notify brand via chat
    try {
      // Find or create conversation
      const { data: existingConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", actor.id);

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
        const { data: newConv } = await adminClient
          .from("conversations")
          .insert({ type: "direct" })
          .select()
          .single();
        if (newConv) {
          conversationId = newConv.id;
          await adminClient.from("conversation_participants").insert([
            { conversation_id: conversationId, actor_id: actor.id },
            { conversation_id: conversationId, actor_id: offer.brand_id },
          ]);
        }
      }

      if (conversationId) {
        const modelName = `@${model.username}`;
        const message = status === "accepted"
          ? `${modelName} has accepted your offer "${offer.title}"!`
          : `${modelName} has declined your offer "${offer.title}".`;

        await adminClient.from("messages").insert({
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
