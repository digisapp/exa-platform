import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Admin client for bypassing RLS on specific queries
const adminClient = createServiceRoleClient();

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
      logger.error("Auth error", authError);
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
    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (actorError) {
      logger.error("Actor fetch error", actorError);
      return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }

    if (!actor) {
      return NextResponse.json({ bookings: [], serviceLabels: SERVICE_LABELS });
    }

    // For models, get their model ID (role=client lets a model view bookings they made as a client)
    let modelId: string | null = null;
    if (role !== "client" && (role === "model" || actor.type === "model")) {
      const { data: model } = await supabase.from("models")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!model) {
        return NextResponse.json({ bookings: [], serviceLabels: SERVICE_LABELS });
      }
      modelId = model.id;
    }

    // Use adminClient to bypass RLS - user is already authenticated above
    const BOOKING_FIELDS = "id, booking_number, model_id, client_id, service_type, service_description, event_date, start_time, duration_hours, location_name, location_city, location_state, is_remote, total_amount, counter_amount, counter_notes, client_notes, status, created_at";

    const withOwnerFilter = (query: any) =>
      modelId ? query.eq("model_id", modelId) : query.eq("client_id", actor.id);

    let bookingsQuery = withOwnerFilter(adminClient.from("bookings").select(BOOKING_FIELDS))
      .order("created_at", { ascending: false });

    if (status === "pending") {
      bookingsQuery = bookingsQuery.in("status", ["pending", "counter"]);
    } else if (status === "upcoming") {
      // Includes accepted/confirmed bookings whose event_date has passed —
      // they still need action (Mark Complete releases escrow)
      bookingsQuery = bookingsQuery.in("status", ["accepted", "confirmed"]);
    } else if (status === "past") {
      bookingsQuery = bookingsQuery.in("status", ["completed", "cancelled", "no_show", "declined"]);
    } else if (status) {
      bookingsQuery = bookingsQuery.eq("status", status);
    }

    const [bookingsResult, pendingCount, upcomingCount, pastCount] = await Promise.all([
      bookingsQuery,
      withOwnerFilter(adminClient.from("bookings").select("id", { count: "exact", head: true })).in("status", ["pending", "counter"]),
      withOwnerFilter(adminClient.from("bookings").select("id", { count: "exact", head: true })).in("status", ["accepted", "confirmed"]),
      withOwnerFilter(adminClient.from("bookings").select("id", { count: "exact", head: true })).in("status", ["completed", "cancelled", "no_show", "declined"]),
    ]);

    if (bookingsResult.error) {
      logger.error("Bookings query error", bookingsResult.error);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    const bookings: any[] = bookingsResult.data || [];
    const counts = {
      pending: pendingCount.count ?? 0,
      upcoming: upcomingCount.count ?? 0,
      past: pastCount.count ?? 0,
    };

    // Enrich bookings with model and client info using batch queries (avoiding N+1)
    if (bookings.length > 0) {
      // Collect unique IDs
      const modelIds = [...new Set(bookings.map(b => b.model_id).filter(Boolean))];
      const clientIds = [...new Set(bookings.map(b => b.client_id).filter(Boolean))];

      // Batch fetch all models
      const modelsMap = new Map<string, any>();
      if (modelIds.length > 0) {
        const { data: models } = await adminClient.from("models")
          .select("id, username, profile_photo_url, city, state")
          .in("id", modelIds);
        (models || []).forEach((m: any) => modelsMap.set(m.id, m));
      }

      // Batch fetch all client actors
      const actorsMap = new Map<string, any>();
      if (clientIds.length > 0) {
        const { data: actors } = await adminClient.from("actors")
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
        const { data: fans } = await adminClient.from("fans")
          .select("id, display_name, email, avatar_url")
          .in("id", fanIds);
        (fans || []).forEach((f: any) => fansMap.set(f.id, f));
      }

      if (brandIds.length > 0) {
        const { data: brands } = await adminClient.from("brands")
          .select("id, company_name, contact_name, email, logo_url")
          .in("id", brandIds);
        (brands || []).forEach((b: any) => brandsMap.set(b.id, b));
      }

      // Map data back to bookings — client email only exposed once the booking
      // is accepted/confirmed/completed, never on pending requests
      for (const booking of bookings) {
        if (booking.model_id) {
          booking.model = modelsMap.get(booking.model_id) || null;
        }
        if (booking.client_id) {
          const canSeeClientEmail = ["accepted", "confirmed", "completed"].includes(booking.status);
          const clientActor = actorsMap.get(booking.client_id);
          if (clientActor?.type === "fan") {
            const fan = fansMap.get(booking.client_id);
            booking.client = fan
              ? {
                  display_name: fan.display_name,
                  avatar_url: fan.avatar_url,
                  type: "fan",
                  ...(canSeeClientEmail ? { email: fan.email } : {}),
                }
              : null;
          } else if (clientActor?.type === "brand") {
            const brand = brandsMap.get(booking.client_id);
            booking.client = brand
              ? {
                  company_name: brand.company_name,
                  contact_name: brand.contact_name,
                  logo_url: brand.logo_url,
                  type: "brand",
                  ...(canSeeClientEmail ? { email: brand.email } : {}),
                }
              : null;
          }
        }
      }
    }

    return NextResponse.json({ bookings, counts, serviceLabels: SERVICE_LABELS });
  } catch (error) {
    logger.error("Bookings fetch error", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST retired: the coin-escrow booking flow is gone — 3 bookings ever, all
// cancelled. Real-world bookings are USD, team-mediated leads via
// /api/booking-inquiries (EXA keeps a 20% commission). GET remains so
// historical bookings stay visible in the dashboard.
export async function POST() {
  return NextResponse.json(
    { error: "Direct bookings have moved — use the booking form on the model's rates page." },
    { status: 410 }
  );
}
