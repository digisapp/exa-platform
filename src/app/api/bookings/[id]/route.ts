import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    // Get booking with model info
    const { data: booking, error } = await (supabase.from("bookings") as any)
      .select(`
        *,
        model:models!bookings_model_id_fkey(
          id, username, first_name, last_name, profile_photo_url,
          city, state, email, user_id
        )
      `)
      .eq("id", id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get client info
    const { data: clientActor } = await supabase
      .from("actors")
      .select("id, type, user_id")
      .eq("id", booking.client_id)
      .single() as { data: { id: string; type: string; user_id: string } | null };

    if (clientActor) {
      if (clientActor.type === "fan") {
        const { data: fan } = await supabase
          .from("fans")
          .select("display_name, email, avatar_url, phone")
          .eq("id", clientActor.id)
          .single() as { data: { display_name: string; email: string; avatar_url: string; phone: string } | null };
        if (fan) {
          booking.client = { ...fan, type: "fan" as const };
        }
      } else if (clientActor.type === "brand") {
        const { data: brand } = await supabase
          .from("brands")
          .select("company_name, contact_name, email, logo_url, phone")
          .eq("id", clientActor.id)
          .single() as { data: { company_name: string; contact_name: string; email: string; logo_url: string; phone: string } | null };
        if (brand) {
          booking.client = { ...brand, type: "brand" as const };
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
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get existing booking
    const { data: booking } = await (supabase.from("bookings") as any)
      .select(`
        *,
        model:models!bookings_model_id_fkey(id, user_id, username, first_name, last_name)
      `)
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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
          body: `${booking.model?.first_name || booking.model?.username} sent a counter offer of $${counterAmount}`,
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
        updateData = {
          status: "accepted",
          total_amount: booking.counter_amount,
        };
        // Notify model
        if (booking.model?.user_id) {
          const { data: modelActor } = await supabase
            .from("actors")
            .select("id")
            .eq("user_id", booking.model.user_id)
            .single() as { data: { id: string } | null };
          if (modelActor) {
            notificationData = {
              actor_id: modelActor.id,
              type: "counter_accepted",
              title: "Counter Offer Accepted",
              body: `Your counter offer of $${booking.counter_amount} was accepted`,
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
          const { data: modelActor } = await supabase
            .from("actors")
            .select("id")
            .eq("user_id", booking.model.user_id)
            .single() as { data: { id: string } | null };
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

    // Update booking
    const { data: updatedBooking, error } = await (supabase.from("bookings") as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update booking:", error);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    // Send notification
    if (notificationData) {
      await (supabase.from("notifications") as any).insert(notificationData);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: `Booking ${action}ed successfully`,
    });
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
