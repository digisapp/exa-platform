import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendBookingRequestEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Zod schema for booking creation validation
const createBookingSchema = z.object({
  modelId: z.string().uuid("Invalid model ID"),
  serviceType: z.enum([
    "photoshoot_hourly",
    "photoshoot_half_day",
    "photoshoot_full_day",
    "promo",
    "brand_ambassador",
    "private_event",
    "social_companion",
    "meet_greet",
    "other"
  ], { message: "Invalid service type" }),
  serviceDescription: z.string().max(1000, "Description is too long").optional().nullable(),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().max(50, "Start time is too long").optional().nullable(),
  durationHours: z.number().min(0.5, "Minimum duration is 30 minutes").max(24, "Maximum duration is 24 hours").optional().nullable(),
  locationName: z.string().max(200, "Location name is too long").optional().nullable(),
  locationAddress: z.string().max(500, "Address is too long").optional().nullable(),
  locationCity: z.string().max(100, "City is too long").optional().nullable(),
  locationState: z.string().max(100, "State is too long").optional().nullable(),
  isRemote: z.boolean().default(false),
  clientNotes: z.string().max(2000, "Notes are too long").optional().nullable(),
});

// Admin client for bypassing RLS on specific queries
const adminClient = createServiceRoleClient();

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get actor
    const { data: actor, error: actorError } = await (supabase
      .from("actors") as any)
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (actorError) {
      console.error("Actor fetch error:", actorError);
      return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }

    if (!actor) {
      return NextResponse.json({ bookings: [], serviceLabels: SERVICE_LABELS });
    }

    // For models, get their model ID
    let modelId: string | null = null;
    if (role === "model" || actor.type === "model") {
      const { data: model } = await (supabase.from("models") as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!model) {
        return NextResponse.json({ bookings: [], serviceLabels: SERVICE_LABELS });
      }
      modelId = model.id;
    }

    // Use adminClient to bypass RLS - user is already authenticated above
    let bookings: any[] = [];

    if (modelId) {
      const { data, error } = await (adminClient.from("bookings") as any)
        .select("*")
        .eq("model_id", modelId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Bookings query error (model):", error);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
      }
      bookings = data || [];
    } else {
      const { data, error } = await (adminClient.from("bookings") as any)
        .select("*")
        .eq("client_id", actor.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Bookings query error (client):", error);
        return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
      }
      bookings = data || [];
    }

    // Filter by status in JS instead of SQL to avoid potential issues
    if (status === "pending") {
      bookings = bookings.filter(b => ["pending", "counter"].includes(b.status));
    } else if (status === "upcoming") {
      const today = new Date().toISOString().split("T")[0];
      bookings = bookings.filter(b => ["accepted", "confirmed"].includes(b.status) && b.event_date >= today);
    } else if (status === "past") {
      bookings = bookings.filter(b => ["completed", "cancelled", "no_show", "declined"].includes(b.status));
    } else if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    // Enrich bookings with model and client info using batch queries (avoiding N+1)
    if (bookings.length > 0) {
      // Collect unique IDs
      const modelIds = [...new Set(bookings.map(b => b.model_id).filter(Boolean))];
      const clientIds = [...new Set(bookings.map(b => b.client_id).filter(Boolean))];

      // Batch fetch all models
      const modelsMap = new Map<string, any>();
      if (modelIds.length > 0) {
        const { data: models } = await (adminClient.from("models") as any)
          .select("id, username, first_name, last_name, profile_photo_url, city, state")
          .in("id", modelIds);
        (models || []).forEach((m: any) => modelsMap.set(m.id, m));
      }

      // Batch fetch all client actors
      const actorsMap = new Map<string, any>();
      if (clientIds.length > 0) {
        const { data: actors } = await (adminClient.from("actors") as any)
          .select("id, type")
          .in("id", clientIds);
        (actors || []).forEach((a: any) => actorsMap.set(a.id, a));
      }

      // Separate fan and brand IDs
      const fanIds = clientIds.filter(id => actorsMap.get(id)?.type === "fan");
      const brandIds = clientIds.filter(id => actorsMap.get(id)?.type === "brand");

      // Batch fetch fans and brands
      const fansMap = new Map<string, any>();
      const brandsMap = new Map<string, any>();

      if (fanIds.length > 0) {
        const { data: fans } = await (adminClient.from("fans") as any)
          .select("id, display_name, email, avatar_url")
          .in("id", fanIds);
        (fans || []).forEach((f: any) => fansMap.set(f.id, f));
      }

      if (brandIds.length > 0) {
        const { data: brands } = await (adminClient.from("brands") as any)
          .select("id, company_name, contact_name, email, logo_url")
          .in("id", brandIds);
        (brands || []).forEach((b: any) => brandsMap.set(b.id, b));
      }

      // Map data back to bookings
      for (const booking of bookings) {
        if (booking.model_id) {
          booking.model = modelsMap.get(booking.model_id) || null;
        }
        if (booking.client_id) {
          const clientActor = actorsMap.get(booking.client_id);
          if (clientActor?.type === "fan") {
            const fan = fansMap.get(booking.client_id);
            booking.client = fan ? { ...fan, type: "fan" } : null;
          } else if (clientActor?.type === "brand") {
            const brand = brandsMap.get(booking.client_id);
            booking.client = brand ? { ...brand, type: "brand" } : null;
          }
        }
      }
    }

    return NextResponse.json({ bookings, serviceLabels: SERVICE_LABELS });
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
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get actor
    let { data: actor } = await (supabase
      .from("actors") as any)
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    // If no actor exists, create one as a fan (so they can book)
    if (!actor) {
      const { data: newActor, error: actorError } = await (supabase
        .from("actors") as any)
        .insert({ user_id: user.id, type: "fan" })
        .select("id, type")
        .single();

      if (actorError || !newActor) {
        console.error("Failed to create actor:", actorError);
        return NextResponse.json({ error: "Failed to set up your account. Please try signing up first." }, { status: 400 });
      }
      actor = newActor;
    }

    // Check if brand has active subscription
    if (actor.type === "brand") {
      const { data: brand } = await (supabase
        .from("brands") as any)
        .select("subscription_tier, subscription_status")
        .eq("id", actor.id)
        .maybeSingle();

      const hasActiveSubscription = brand?.subscription_status === "active" ||
        (brand?.subscription_tier && brand.subscription_tier !== "free");

      if (!hasActiveSubscription) {
        return NextResponse.json({
          error: "Subscription required",
          message: "Please subscribe to send booking requests",
          code: "SUBSCRIPTION_REQUIRED"
        }, { status: 403 });
      }
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = createBookingSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

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
    } = validationResult.data;

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

    // Check client's coin balance
    let clientBalance = 0;
    if (actor.type === "fan") {
      const { data: fan } = await (supabase.from("fans") as any)
        .select("coin_balance")
        .eq("id", actor.id)
        .single();
      clientBalance = fan?.coin_balance || 0;
    } else if (actor.type === "brand") {
      const { data: brand } = await (supabase.from("brands") as any)
        .select("coin_balance")
        .eq("id", actor.id)
        .single();
      clientBalance = brand?.coin_balance || 0;
    }

    // Get sum of pending booking amounts for this client (soft reservation)
    const { data: pendingBookings } = await (supabase.from("bookings") as any)
      .select("total_amount")
      .eq("client_id", actor.id)
      .in("status", ["pending", "counter", "accepted"]);

    const pendingTotal = (pendingBookings || []).reduce(
      (sum: number, b: { total_amount: number }) => sum + (b.total_amount || 0),
      0
    );

    const availableBalance = clientBalance - pendingTotal;

    // Check if client has enough available balance
    if (totalAmount > 0 && availableBalance < totalAmount) {
      return NextResponse.json({
        error: `Insufficient available balance. You need ${totalAmount.toLocaleString()} coins but only have ${availableBalance.toLocaleString()} available (${pendingTotal.toLocaleString()} coins reserved for pending bookings).`,
        required: totalAmount,
        balance: clientBalance,
        available: availableBalance,
        pending: pendingTotal,
      }, { status: 402 });
    }

    // NOTE: Coins are NOT deducted here - they will be escrowed when model accepts

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
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
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

    // Send email to model (don't fail if this errors)
    try {
      if (model.email) {
        // Get client name
        let clientName = "A user";
        let clientType: "fan" | "brand" = "fan";

        if (actor.type === "fan") {
          const { data: fan } = await (supabase.from("fans") as any)
            .select("display_name")
            .eq("id", actor.id)
            .single();
          clientName = fan?.display_name || "A fan";
          clientType = "fan";
        } else if (actor.type === "brand") {
          const { data: brand } = await (supabase.from("brands") as any)
            .select("company_name, contact_name")
            .eq("id", actor.id)
            .single();
          clientName = brand?.company_name || brand?.contact_name || "A brand";
          clientType = "brand";
        }

        await sendBookingRequestEmail({
          to: model.email,
          modelName: model.first_name || model.username || "there",
          clientName,
          clientType,
          serviceType: SERVICE_LABELS[serviceType] || serviceType,
          eventDate,
          totalAmount,
          bookingNumber: booking.booking_number,
        });
      }
    } catch (emailError) {
      console.error("Failed to send booking request email:", emailError);
      // Don't fail the booking request if email fails
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
