import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

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

    // 1. Get total coins spent (negative amounts = spending)
    const { data: coinData } = await (supabase
      .from("coin_transactions") as any)
      .select("amount, action, created_at")
      .eq("actor_id", actor.id)
      .lt("amount", 0);

    const totalCoinsSpent = Math.abs(
      (coinData || []).reduce((sum: number, t: any) => sum + t.amount, 0)
    );

    // Group spend by month
    const spendByMonth: Record<string, number> = {};
    (coinData || []).forEach((t: any) => {
      const month = new Date(t.created_at).toISOString().slice(0, 7); // YYYY-MM
      spendByMonth[month] = (spendByMonth[month] || 0) + Math.abs(t.amount);
    });

    // 2. Get bookings data
    const { data: bookings } = await (supabase
      .from("bookings") as any)
      .select("id, model_id, status, event_date, service_type, total_amount, created_at")
      .eq("client_id", actor.id);

    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter((b: any) => b.status === "completed").length || 0;
    const upcomingBookings = bookings?.filter((b: any) =>
      ["accepted", "confirmed", "pending"].includes(b.status) &&
      new Date(b.event_date) >= new Date()
    ) || [];

    // 3. Get unique models contacted (from conversations)
    const { data: conversations } = await (supabase
      .from("conversation_participants") as any)
      .select("conversation_id")
      .eq("actor_id", actor.id);

    let modelsContacted = 0;
    const modelBookingCounts: Record<string, number> = {};

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c: any) => c.conversation_id);

      // Get other participants in these conversations (the models)
      const { data: otherParticipants } = await (supabase
        .from("conversation_participants") as any)
        .select("actor_id")
        .in("conversation_id", conversationIds)
        .neq("actor_id", actor.id);

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

    // 5. Get upcoming bookings with model info
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
      totalCoinsSpent,
      spendByMonth,
      totalBookings,
      completedBookings,
      modelsContacted,
      frequentCollaborators,
      upcomingBookings: upcomingWithModels,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
