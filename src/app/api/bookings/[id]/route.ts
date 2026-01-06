import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingAcceptedEmail, sendBookingDeclinedEmail } from "@/lib/email";

// Service type labels
const SERVICE_LABELS: Record<string, string> = {
  photoshoot_hourly: "Photoshoot (Hourly)",
  photoshoot_half_day: "Photoshoot (Half-Day)",
  photoshoot_full_day: "Photoshoot (Full-Day)",
  promo: "Promo Modeling",
  brand_ambassador: "Brand Ambassador",
  private_event: "Private Event",
  social_companion: "Social Companion",
  meet_greet: "Meet & Greet",
  other: "Other",
};

// GET - Get single booking details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get booking
    const { data: booking, error } = await (supabase.from("bookings") as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch booking:", error);
      return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get model info separately
    if (booking.model_id) {
      const { data: model } = await (supabase.from("models") as any)
        .select("id, username, first_name, last_name, profile_photo_url, city, state, email, user_id")
        .eq("id", booking.model_id)
        .maybeSingle();
      booking.model = model;
    }

    // Get client info
    const { data: clientActor } = await (supabase
      .from("actors") as any)
      .select("id, type, user_id")
      .eq("id", booking.client_id)
      .maybeSingle();

    if (clientActor) {
      if (clientActor.type === "fan") {
        const { data: fan } = await (supabase
          .from("fans") as any)
          .select("display_name, email, avatar_url, phone")
          .eq("id", clientActor.id)
          .maybeSingle();
        if (fan) {
          booking.client = { ...fan, type: "fan" };
        }
      } else if (clientActor.type === "brand") {
        const { data: brand } = await (supabase
          .from("brands") as any)
          .select("company_name, contact_name, email, logo_url, phone")
          .eq("id", clientActor.id)
          .maybeSingle();
        if (brand) {
          booking.client = { ...brand, type: "brand" };
        }
      }
    }

    return NextResponse.json({ booking, serviceLabels: SERVICE_LABELS });
  } catch (error) {
    console.error("Booking fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

// PATCH - Update booking (accept, decline, counter, cancel, complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const debugInfo: any = {};
  try {
    const { id } = await params;
    debugInfo.bookingId = id;
    const supabase = await createClient();

    // Use service role client to bypass RLS for all operations
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Auth error", details: authError.message }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    debugInfo.userId = user.id;

    // Get actor
    const { data: actor, error: actorError } = await adminClient
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (actorError) {
      console.error("Actor fetch error:", actorError);
      return NextResponse.json({ error: "Failed to fetch actor", details: actorError.message }, { status: 500 });
    }

    if (!actor) {
      console.error("Actor not found for user:", user.id);
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }
    debugInfo.actor = actor;

    // Get existing booking
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (bookingError) {
      console.error("Failed to fetch booking:", bookingError);
      return NextResponse.json({ error: "Failed to fetch booking", details: bookingError.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    debugInfo.bookingStatus = booking.status;

    // Get model info separately
    if (booking.model_id) {
      const { data: model } = await adminClient
        .from("models")
        .select("id, user_id, username, first_name, last_name")
        .eq("id", booking.model_id)
        .maybeSingle();
      booking.model = model;
    }

    // Check permissions
    const isModel = booking.model?.user_id === user.id;
    const isClient = booking.client_id === actor.id;
    const isAdmin = actor.type === "admin";

    if (!isModel && !isClient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, responseNotes, counterAmount, counterNotes, cancellationReason } = body;

    let updateData: any = {};
    let notificationData: any = null;

    switch (action) {
      case "accept":
        if (!isModel && !isAdmin) {
          return NextResponse.json({ error: "Only model can accept" }, { status: 403 });
        }
        if (booking.status !== "pending" && booking.status !== "counter") {
          return NextResponse.json({ error: "Can only accept pending bookings" }, { status: 400 });
        }

        // Check if client has enough coins and escrow them
        const escrowAmount = booking.total_amount || 0;
        if (escrowAmount > 0) {
          // Get client's actor and balance
          const { data: clientActor } = await adminClient
            .from("actors")
            .select("id, type")
            .eq("id", booking.client_id)
            .maybeSingle();

          let clientBalance = 0;
          if (clientActor?.type === "fan") {
            const { data: fan } = await adminClient
              .from("fans")
              .select("coin_balance")
              .eq("id", clientActor.id)
              .maybeSingle();
            clientBalance = fan?.coin_balance || 0;
          } else if (clientActor?.type === "brand") {
            const { data: brand } = await adminClient
              .from("brands")
              .select("coin_balance")
              .eq("id", clientActor.id)
              .maybeSingle();
            clientBalance = brand?.coin_balance || 0;
          }

          if (clientBalance < escrowAmount) {
            // Auto-decline - client doesn't have enough coins
            await adminClient
              .from("bookings")
              .update({
                status: "declined",
                model_response_notes: "Auto-declined: Client has insufficient coins",
                responded_at: new Date().toISOString(),
              })
              .eq("id", id);

            // Notify client
            await adminClient.from("notifications").insert({
              actor_id: booking.client_id,
              type: "booking_declined",
              title: "Booking Declined - Insufficient Funds",
              body: `Your booking with ${booking.model?.first_name || booking.model?.username} was declined because you don't have enough coins. You need ${escrowAmount.toLocaleString()} coins but only have ${clientBalance.toLocaleString()}.`,
              data: { booking_id: id, booking_number: booking.booking_number },
            });

            return NextResponse.json({
              error: "Client has insufficient coins for this booking",
              clientBalance,
              required: escrowAmount,
            }, { status: 402 });
          }

          // Deduct coins from client (escrow)
          if (clientActor?.type === "fan") {
            await adminClient
              .from("fans")
              .update({ coin_balance: clientBalance - escrowAmount })
              .eq("id", clientActor.id);
          } else if (clientActor?.type === "brand") {
            await adminClient
              .from("brands")
              .update({ coin_balance: clientBalance - escrowAmount })
              .eq("id", clientActor.id);
          }

          // Log escrow transaction
          if (clientActor) {
            await adminClient.from("coin_transactions").insert({
              actor_id: clientActor.id,
              amount: -escrowAmount,
              action: "booking_escrow",
              metadata: {
                booking_id: id,
                booking_number: booking.booking_number,
                model_id: booking.model_id,
              },
            });
          }
        }

        updateData = {
          status: "accepted",
          model_response_notes: responseNotes,
          responded_at: new Date().toISOString(),
        };
        notificationData = {
          actor_id: booking.client_id,
          type: "booking_accepted",
          title: "Booking Accepted!",
          body: `${booking.model?.first_name || booking.model?.username} accepted your booking request for ${new Date(booking.event_date).toLocaleDateString()}`,
          data: { booking_id: id, booking_number: booking.booking_number },
        };
        break;

      case "decline":
        if (!isModel && !isAdmin) {
          return NextResponse.json({ error: "Only model can decline" }, { status: 403 });
        }
        if (booking.status !== "pending" && booking.status !== "counter") {
          return NextResponse.json({ error: "Can only decline pending bookings" }, { status: 400 });
        }
        updateData = {
          status: "declined",
          model_response_notes: responseNotes,
          responded_at: new Date().toISOString(),
        };
        notificationData = {
          actor_id: booking.client_id,
          type: "booking_declined",
          title: "Booking Declined",
          body: `${booking.model?.first_name || booking.model?.username} declined your booking request`,
          data: { booking_id: id, booking_number: booking.booking_number },
        };
        break;

      case "counter":
        if (!isModel && !isAdmin) {
          return NextResponse.json({ error: "Only model can counter" }, { status: 403 });
        }
        if (booking.status !== "pending") {
          return NextResponse.json({ error: "Can only counter pending bookings" }, { status: 400 });
        }
        if (!counterAmount) {
          return NextResponse.json({ error: "Counter amount required" }, { status: 400 });
        }
        updateData = {
          status: "counter",
          counter_amount: counterAmount,
          counter_notes: counterNotes,
          model_response_notes: responseNotes,
          responded_at: new Date().toISOString(),
        };
        notificationData = {
          actor_id: booking.client_id,
          type: "booking_counter",
          title: "Counter Offer Received",
          body: `${booking.model?.first_name || booking.model?.username} sent a counter offer of ${counterAmount.toLocaleString()} coins`,
          data: { booking_id: id, booking_number: booking.booking_number, counter_amount: counterAmount },
        };
        break;

      case "accept_counter":
        if (!isClient && !isAdmin) {
          return NextResponse.json({ error: "Only client can accept counter" }, { status: 403 });
        }
        if (booking.status !== "counter") {
          return NextResponse.json({ error: "No counter offer to accept" }, { status: 400 });
        }

        // Escrow the counter amount from client
        const counterEscrowAmount = booking.counter_amount || 0;
        if (counterEscrowAmount > 0) {
          // Get client's balance
          let counterClientBalance = 0;
          if (actor.type === "fan") {
            const { data: fan } = await adminClient
              .from("fans")
              .select("coin_balance")
              .eq("id", actor.id)
              .maybeSingle();
            counterClientBalance = fan?.coin_balance || 0;
          } else if (actor.type === "brand") {
            const { data: brand } = await adminClient
              .from("brands")
              .select("coin_balance")
              .eq("id", actor.id)
              .maybeSingle();
            counterClientBalance = brand?.coin_balance || 0;
          }

          if (counterClientBalance < counterEscrowAmount) {
            return NextResponse.json({
              error: `Insufficient coins. You need ${counterEscrowAmount.toLocaleString()} coins but only have ${counterClientBalance.toLocaleString()}.`,
              required: counterEscrowAmount,
              balance: counterClientBalance,
            }, { status: 402 });
          }

          // Deduct coins from client (escrow)
          if (actor.type === "fan") {
            await adminClient
              .from("fans")
              .update({ coin_balance: counterClientBalance - counterEscrowAmount })
              .eq("id", actor.id);
          } else if (actor.type === "brand") {
            await adminClient
              .from("brands")
              .update({ coin_balance: counterClientBalance - counterEscrowAmount })
              .eq("id", actor.id);
          }

          // Log escrow transaction
          await adminClient.from("coin_transactions").insert({
            actor_id: actor.id,
            amount: -counterEscrowAmount,
            action: "booking_escrow",
            metadata: {
              booking_id: id,
              booking_number: booking.booking_number,
              model_id: booking.model_id,
              counter_offer: true,
            },
          });
        }

        updateData = {
          status: "accepted",
          total_amount: booking.counter_amount,
        };
        // Notify model
        if (booking.model?.user_id) {
          const { data: modelActor } = await adminClient
            .from("actors")
            .select("id")
            .eq("user_id", booking.model.user_id)
            .maybeSingle();
          if (modelActor) {
            notificationData = {
              actor_id: modelActor.id,
              type: "counter_accepted",
              title: "Counter Offer Accepted",
              body: `Your counter offer of ${booking.counter_amount?.toLocaleString()} coins was accepted`,
              data: { booking_id: id, booking_number: booking.booking_number },
            };
          }
        }
        break;

      case "confirm":
        if (booking.status !== "accepted") {
          return NextResponse.json({ error: "Can only confirm accepted bookings" }, { status: 400 });
        }
        updateData = {
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        };
        break;

      case "cancel":
        if (!["pending", "accepted", "confirmed", "counter"].includes(booking.status)) {
          return NextResponse.json({ error: "Cannot cancel this booking" }, { status: 400 });
        }
        updateData = {
          status: "cancelled",
          cancelled_by: actor.id,
          cancellation_reason: cancellationReason,
          cancelled_at: new Date().toISOString(),
        };
        // Notify the other party
        const notifyActorId = isModel ? booking.client_id : null;
        if (isClient && booking.model?.user_id) {
          const { data: modelActor } = await adminClient
            .from("actors")
            .select("id")
            .eq("user_id", booking.model.user_id)
            .maybeSingle();
          if (modelActor) {
            notificationData = {
              actor_id: modelActor.id,
              type: "booking_cancelled",
              title: "Booking Cancelled",
              body: `Booking ${booking.booking_number} has been cancelled`,
              data: { booking_id: id, booking_number: booking.booking_number },
            };
          }
        } else if (notifyActorId) {
          notificationData = {
            actor_id: notifyActorId,
            type: "booking_cancelled",
            title: "Booking Cancelled",
            body: `${booking.model?.first_name || booking.model?.username} cancelled the booking`,
            data: { booking_id: id, booking_number: booking.booking_number },
          };
        }
        break;

      case "complete":
        if (!isModel && !isAdmin) {
          return NextResponse.json({ error: "Only model can mark complete" }, { status: 403 });
        }
        if (booking.status !== "confirmed") {
          return NextResponse.json({ error: "Can only complete confirmed bookings" }, { status: 400 });
        }
        updateData = {
          status: "completed",
          completed_at: new Date().toISOString(),
        };
        break;

      case "no_show":
        if (!isModel && !isAdmin) {
          return NextResponse.json({ error: "Only model can mark no-show" }, { status: 403 });
        }
        if (booking.status !== "confirmed") {
          return NextResponse.json({ error: "Can only mark confirmed bookings as no-show" }, { status: 400 });
        }
        updateData = {
          status: "no_show",
          completed_at: new Date().toISOString(),
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update booking using service role client to bypass RLS
    debugInfo.updateData = updateData;
    debugInfo.action = action;

    const { data: updatedBooking, error } = await adminClient
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update booking:", error, "updateData:", updateData);
      return NextResponse.json({
        error: "Failed to update booking",
        details: error.message,
        code: error.code,
        debug: debugInfo
      }, { status: 500 });
    }

    if (!updatedBooking) {
      console.error("No booking updated");
      return NextResponse.json({
        error: "Booking update failed",
        debug: debugInfo
      }, { status: 500 });
    }

    // Handle coin transfers based on action
    // Only process refunds/payments for bookings that had coins escrowed (accepted/confirmed status)
    const escrowAmount = booking.total_amount || 0;
    const wasEscrowed = ["accepted", "confirmed"].includes(booking.status);

    if (escrowAmount > 0) {
      if (action === "complete") {
        // Release coins to model
        const { data: modelRecord } = await adminClient
          .from("models")
          .select("coin_balance")
          .eq("id", booking.model_id)
          .maybeSingle();

        const modelBalance = modelRecord?.coin_balance || 0;
        await adminClient
          .from("models")
          .update({ coin_balance: modelBalance + escrowAmount })
          .eq("id", booking.model_id);

        // Get model's actor ID for transaction log
        const { data: modelActor } = await adminClient
          .from("actors")
          .select("id")
          .eq("user_id", booking.model?.user_id)
          .maybeSingle();

        if (modelActor) {
          await adminClient.from("coin_transactions").insert({
            actor_id: modelActor.id,
            amount: escrowAmount,
            action: "booking_payment",
            metadata: {
              booking_id: id,
              booking_number: booking.booking_number,
              client_id: booking.client_id,
            },
          });
        }
      } else if (action === "cancel" && wasEscrowed) {
        // Only refund if coins were already escrowed (booking was accepted/confirmed)
        try {
          const { data: clientActor } = await adminClient
            .from("actors")
            .select("id, type")
            .eq("id", booking.client_id)
            .maybeSingle();

          if (clientActor) {
            if (clientActor.type === "fan") {
              const { data: fan } = await adminClient
                .from("fans")
                .select("coin_balance")
                .eq("id", clientActor.id)
                .maybeSingle();
              if (fan) {
                await adminClient
                  .from("fans")
                  .update({ coin_balance: (fan.coin_balance || 0) + escrowAmount })
                  .eq("id", clientActor.id);
              }
            } else if (clientActor.type === "brand") {
              const { data: brand } = await adminClient
                .from("brands")
                .select("coin_balance")
                .eq("id", clientActor.id)
                .maybeSingle();
              if (brand) {
                await adminClient
                  .from("brands")
                  .update({ coin_balance: (brand.coin_balance || 0) + escrowAmount })
                  .eq("id", clientActor.id);
              }
            }

            await adminClient.from("coin_transactions").insert({
              actor_id: clientActor.id,
              amount: escrowAmount,
              action: "booking_refund",
              metadata: {
                booking_id: id,
                booking_number: booking.booking_number,
                reason: "Booking cancelled",
              },
            });
          }
        } catch (refundError) {
          console.error("Failed to process refund:", refundError);
          // Continue with cancellation even if refund fails - can be handled manually
        }
      }
      // Note: "decline" doesn't need refund since coins aren't escrowed until acceptance
    }

    // Send notification (don't fail if this errors)
    if (notificationData) {
      try {
        await adminClient.from("notifications").insert(notificationData);
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }

    // Send email to client for accept/decline actions (don't fail if this errors)
    if (action === "accept" || action === "decline") {
      try {
        // Get client info and email
        const { data: clientActorInfo } = await adminClient
          .from("actors")
          .select("id, type")
          .eq("id", booking.client_id)
          .maybeSingle();

        let clientEmail: string | null = null;
        let clientName = "there";

        if (clientActorInfo?.type === "fan") {
          const { data: fan } = await adminClient
            .from("fans")
            .select("email, display_name")
            .eq("id", clientActorInfo.id)
            .maybeSingle();
          clientEmail = fan?.email;
          clientName = fan?.display_name || "there";
        } else if (clientActorInfo?.type === "brand") {
          const { data: brand } = await adminClient
            .from("brands")
            .select("email, company_name, contact_name")
            .eq("id", clientActorInfo.id)
            .maybeSingle();
          clientEmail = brand?.email;
          clientName = brand?.company_name || brand?.contact_name || "there";
        }

        if (clientEmail) {
          const modelName = booking.model?.first_name || booking.model?.username || "The model";
          const modelUsername = booking.model?.username || "";

          if (action === "accept") {
            await sendBookingAcceptedEmail({
              to: clientEmail,
              clientName,
              modelName,
              modelUsername,
              serviceType: SERVICE_LABELS[booking.service_type] || booking.service_type,
              eventDate: booking.event_date,
              totalAmount: booking.total_amount || 0,
              bookingNumber: booking.booking_number,
            });
          } else if (action === "decline") {
            await sendBookingDeclinedEmail({
              to: clientEmail,
              clientName,
              modelName,
              serviceType: SERVICE_LABELS[booking.service_type] || booking.service_type,
              eventDate: booking.event_date,
              bookingNumber: booking.booking_number,
              reason: responseNotes || undefined,
            });
          }
        }
      } catch (emailError) {
        console.error("Failed to send booking email:", emailError);
        // Don't fail the booking update if email fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: `Booking ${action}ed successfully`,
    });
  } catch (error: any) {
    console.error("Booking update error:", error, "Debug:", debugInfo);
    return NextResponse.json({
      error: "Failed to update booking",
      message: error?.message || "Unknown error",
      debug: debugInfo
    }, { status: 500 });
  }
}

// DELETE - Delete a booking (only pending bookings by client or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor
    const { data: actor } = await (supabase.from("actors") as any)
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Use service role client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get booking
    const { data: booking, error: fetchError } = await adminClient
      .from("bookings")
      .select("id, status, client_id, model_id")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check permissions - only client who made the booking or admin can delete
    const isClient = booking.client_id === actor.id;
    const isAdmin = actor.type === "admin";

    if (!isClient && !isAdmin) {
      return NextResponse.json({ error: "Only the client or admin can delete this booking" }, { status: 403 });
    }

    // Only allow deleting pending bookings
    if (booking.status !== "pending") {
      return NextResponse.json({
        error: "Can only delete pending bookings. Use cancel for accepted bookings."
      }, { status: 400 });
    }

    // Delete the booking
    const { error: deleteError } = await adminClient
      .from("bookings")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Delete booking error:", deleteError);
      return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Booking deleted" });
  } catch (error) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
