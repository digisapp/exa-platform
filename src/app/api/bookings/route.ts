import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Service type to rate field mapping
const SERVICE_RATE_FIELDS: Record<string, string> = {
  photoshoot_hourly: "photoshoot_hourly_rate",
  photoshoot_half_day: "photoshoot_half_day_rate",
  photoshoot_full_day: "photoshoot_full_day_rate",
  promo: "promo_hourly_rate",
  brand_ambassador: "brand_ambassador_daily_rate",
  private_event: "private_event_hourly_rate",
  social_companion: "social_companion_hourly_rate",
  meet_greet: "meet_greet_rate",
};

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

// GET - Fetch bookings for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const role = searchParams.get("role"); // 'model' or 'client'

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

    // Build query based on role
    let query = (supabase.from("bookings") as any).select(`
      *,
      model:models!bookings_model_id_fkey(
        id, username, first_name, last_name, profile_photo_url, city, state
      )
    `);

    // If user is a model and wants their bookings as a model
    if (role === "model" || actor.type === "model") {
      const { data: model } = await (supabase.from("models") as any)
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (model) {
        query = query.eq("model_id", model.id);
      }
    } else {
      // Get bookings as client
      query = query.eq("client_id", actor.id);
    }

    // Filter by status
    if (status) {
      if (status === "pending") {
        query = query.in("status", ["pending", "counter"]);
      } else if (status === "upcoming") {
        query = query.in("status", ["accepted", "confirmed"]).gte("event_date", new Date().toISOString().split("T")[0]);
      } else if (status === "past") {
        query = query.in("status", ["completed", "cancelled", "no_show", "declined"]);
      } else {
        query = query.eq("status", status);
      }
    }

    // Order by date
    query = query.order("created_at", { ascending: false });

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Failed to fetch bookings:", error);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    // Add client info for model view
    if (role === "model" || actor.type === "model") {
      for (const booking of bookings || []) {
        const { data: clientActor } = await supabase
          .from("actors")
          .select("id, type, user_id")
          .eq("id", booking.client_id)
          .single() as { data: { id: string; type: string; user_id: string } | null };

        if (clientActor) {
          if (clientActor.type === "fan") {
            const { data: fan } = await supabase
              .from("fans")
              .select("display_name, email, avatar_url")
              .eq("id", clientActor.id)
              .single() as { data: { display_name: string; email: string; avatar_url: string } | null };
            booking.client = fan;
          } else if (clientActor.type === "brand") {
            const { data: brand } = await supabase
              .from("brands")
              .select("company_name, contact_name, email, logo_url")
              .eq("id", clientActor.id)
              .single() as { data: { company_name: string; contact_name: string; email: string; logo_url: string } | null };
            booking.client = brand;
          }
        }
      }
    }

    return NextResponse.json({ bookings: bookings || [], serviceLabels: SERVICE_LABELS });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST - Create a new booking request
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
      modelId,
      serviceType,
      serviceDescription,
      eventDate,
      startTime,
      durationHours,
      locationName,
      locationAddress,
      locationCity,
      locationState,
      isRemote,
      clientNotes,
    } = body;

    // Validate required fields
    if (!modelId || !serviceType || !eventDate) {
      return NextResponse.json(
        { error: "Model, service type, and event date are required" },
        { status: 400 }
      );
    }

    // Get model to verify and get rate
    const { data: model } = await (supabase.from("models") as any)
      .select("*")
      .eq("id", modelId)
      .eq("is_approved", true)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Prevent booking yourself
    if (model.user_id === user.id) {
      return NextResponse.json({ error: "You cannot book yourself" }, { status: 400 });
    }

    // Get the rate for this service type
    const rateField = SERVICE_RATE_FIELDS[serviceType];
    let quotedRate = 0;

    if (rateField && model[rateField]) {
      quotedRate = model[rateField];
    } else if (serviceType === "other") {
      // For "other" service type, use lowest hourly rate or 0
      quotedRate = Math.min(
        model.photoshoot_hourly_rate || Infinity,
        model.promo_hourly_rate || Infinity,
        model.private_event_hourly_rate || Infinity,
        model.social_companion_hourly_rate || Infinity
      );
      if (quotedRate === Infinity) quotedRate = 0;
    }

    // Calculate total amount
    let totalAmount = quotedRate;
    if (durationHours && ["photoshoot_hourly", "promo", "private_event", "social_companion"].includes(serviceType)) {
      totalAmount = quotedRate * durationHours;
    }

    // Create booking
    const { data: booking, error } = await (supabase.from("bookings") as any)
      .insert({
        model_id: modelId,
        client_id: actor.id,
        service_type: serviceType,
        service_description: serviceDescription || null,
        event_date: eventDate,
        start_time: startTime || null,
        duration_hours: durationHours || null,
        location_name: locationName || null,
        location_address: locationAddress || null,
        location_city: locationCity || null,
        location_state: locationState || null,
        is_remote: isRemote || false,
        quoted_rate: quotedRate,
        total_amount: totalAmount,
        client_notes: clientNotes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create booking:", error);
      console.error("Booking data:", {
        modelId,
        clientId: actor.id,
        actorType: actor.type,
        userId: user.id,
        serviceType,
        eventDate
      });
      return NextResponse.json({
        error: error.message || "Failed to create booking",
        details: error.details || null,
        hint: error.hint || null
      }, { status: 500 });
    }

    // Create notification for model (don't fail if this errors)
    try {
      if (model.user_id) {
        const { data: modelActor } = await supabase
          .from("actors")
          .select("id")
          .eq("user_id", model.user_id)
          .single() as { data: { id: string } | null };

        if (modelActor) {
          await (supabase.from("notifications") as any).insert({
            actor_id: modelActor.id,
            type: "booking_request",
            title: "New Booking Request",
            body: `You have a new ${SERVICE_LABELS[serviceType] || serviceType} booking request for ${new Date(eventDate).toLocaleDateString()}`,
            data: {
              booking_id: booking.id,
              booking_number: booking.booking_number,
              service_type: serviceType,
              event_date: eventDate,
            },
          });
        }
      }
    } catch (notifError) {
      console.error("Failed to create notification:", notifError);
      // Don't fail the booking request if notification fails
    }

    return NextResponse.json({
      success: true,
      booking,
      message: "Booking request sent successfully",
    });
  } catch (error) {
    console.error("Booking create error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
