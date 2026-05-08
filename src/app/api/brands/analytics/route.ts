import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const RANGE_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const rangeParam = url.searchParams.get("range") || "all";
    const days = RANGE_DAYS[rangeParam] ?? null;
    const sinceIso = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor and verify it's a brand
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "brand") {
      return NextResponse.json({ error: "Only brands can access analytics" }, { status: 403 });
    }

    // Verify brand ownership: fetch the brand record for this actor
    // and use the verified brand ID in all subsequent queries
    const { data: brand } = await supabase.from("brands")
      .select("id")
      .eq("id", actor.id)
      .maybeSingle();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found for this account" }, { status: 403 });
    }

    const brandActorId = brand.id;

    // 1. Get total coins spent (negative amounts = spending)
    let coinQuery = supabase
      .from("coin_transactions")
      .select("amount, action, created_at")
      .eq("actor_id", brandActorId)
      .lt("amount", 0);
    if (sinceIso) coinQuery = coinQuery.gte("created_at", sinceIso);
    const { data: coinData } = await coinQuery;

    const totalCoinsSpent = Math.abs(
      (coinData || []).reduce((sum: number, t: any) => sum + t.amount, 0)
    );

    // Group spend by month
    const spendByMonth: Record<string, number> = {};
    (coinData || []).forEach((t: any) => {
      const month = new Date(t.created_at).toISOString().slice(0, 7); // YYYY-MM
      spendByMonth[month] = (spendByMonth[month] || 0) + Math.abs(t.amount);
    });

    // 2. Get bookings data — totals/completed honor the selected range,
    //    but upcoming bookings always reflect what's actually coming up.
    let bookingsQuery = supabase
      .from("bookings")
      .select("id, model_id, status, event_date, service_type, total_amount, created_at")
      .eq("client_id", brandActorId);
    if (sinceIso) bookingsQuery = bookingsQuery.gte("created_at", sinceIso);
    const { data: bookings } = await bookingsQuery;

    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter((b: any) => b.status === "completed").length || 0;

    const todayIso = new Date().toISOString().split("T")[0];
    const { data: upcomingBookingsRaw } = await supabase
      .from("bookings")
      .select("id, model_id, status, event_date, service_type, total_amount, created_at")
      .eq("client_id", brandActorId)
      .in("status", ["accepted", "confirmed", "pending"])
      .gte("event_date", todayIso);
    const upcomingBookings = upcomingBookingsRaw || [];

    // 3. Get unique models contacted (from conversations)
    const { data: conversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("actor_id", brandActorId);

    let modelsContacted = 0;
    const modelBookingCounts: Record<string, number> = {};

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c: any) => c.conversation_id);

      // Get other participants in these conversations (the models)
      const { data: otherParticipants } = await supabase
        .from("conversation_participants")
        .select("actor_id")
        .in("conversation_id", conversationIds)
        .neq("actor_id", brandActorId);

      if (otherParticipants) {
        const uniqueActors = new Set(otherParticipants.map((p: any) => p.actor_id));
        modelsContacted = uniqueActors.size;
      }
    }

    // 4. Count bookings per model for frequent collaborators
    (bookings || []).forEach((b: any) => {
      if (b.model_id) {
        modelBookingCounts[b.model_id] = (modelBookingCounts[b.model_id] || 0) + 1;
      }
    });

    // Get top 5 models by booking count
    const topModelIds = Object.entries(modelBookingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let frequentCollaborators: any[] = [];
    if (topModelIds.length > 0) {
      const { data: models } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url")
        .in("id", topModelIds);

      if (models) {
        frequentCollaborators = topModelIds
          .map(id => {
            const model = models.find((m: any) => m.id === id) as {
              id: string;
              username: string;
              first_name: string | null;
              last_name: string | null;
              profile_photo_url: string | null;
            } | undefined;
            if (!model) return null;
            return {
              id: model.id,
              username: model.username,
              first_name: model.first_name,
              last_name: model.last_name,
              profile_photo_url: model.profile_photo_url,
              booking_count: modelBookingCounts[id],
            };
          })
          .filter(Boolean);
      }
    }

    // 5. Offer performance — sent / accepted / response counts
    let offersQuery = supabase
      .from("offers")
      .select("id, status, created_at, spots_filled")
      .eq("brand_id", brandActorId);
    if (sinceIso) offersQuery = offersQuery.gte("created_at", sinceIso);
    const { data: brandOffers } = await offersQuery;

    const offerIds = (brandOffers || []).map((o: any) => o.id);
    const offerStats = {
      totalOffers: 0,
      openOffers: 0,
      totalResponses: 0,
      acceptedResponses: 0,
      declinedResponses: 0,
      pendingResponses: 0,
      acceptanceRate: 0,
    };

    offerStats.totalOffers = brandOffers?.length || 0;
    offerStats.openOffers = (brandOffers || []).filter(
      (o: any) => o.status === "open"
    ).length;

    if (offerIds.length > 0) {
      const { data: respCounts } = await supabase
        .from("offer_responses")
        .select("status")
        .in("offer_id", offerIds);

      (respCounts || []).forEach((r: any) => {
        offerStats.totalResponses++;
        if (r.status === "accepted" || r.status === "confirmed") {
          offerStats.acceptedResponses++;
        } else if (r.status === "declined") {
          offerStats.declinedResponses++;
        } else if (r.status === "pending") {
          offerStats.pendingResponses++;
        }
      });

      const respondedTotal =
        offerStats.acceptedResponses + offerStats.declinedResponses;
      offerStats.acceptanceRate =
        respondedTotal > 0
          ? Math.round((offerStats.acceptedResponses / respondedTotal) * 100)
          : 0;
    }

    // 6. Get upcoming bookings with model info
    let upcomingWithModels: any[] = [];
    if (upcomingBookings.length > 0) {
      const upcomingModelIds = upcomingBookings.map((b: any) => b.model_id).filter(Boolean);

      if (upcomingModelIds.length > 0) {
        const { data: upcomingModels } = await supabase
          .from("models")
          .select("id, username, first_name, last_name, profile_photo_url")
          .in("id", upcomingModelIds);

        upcomingWithModels = upcomingBookings
          .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .slice(0, 5)
          .map((booking: any) => {
            const model = upcomingModels?.find((m: any) => m.id === booking.model_id);
            return {
              ...booking,
              model,
            };
          });
      }
    }

    return NextResponse.json({
      range: rangeParam,
      totalCoinsSpent,
      spendByMonth,
      totalBookings,
      completedBookings,
      modelsContacted,
      frequentCollaborators,
      upcomingBookings: upcomingWithModels,
      offerStats,
    });
  } catch (error) {
    logger.error("Analytics error", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
