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

    // Get actor and verify it's a model
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "model") {
      return NextResponse.json({ error: "Only models can access analytics" }, { status: 403 });
    }

    // Get model data including profile views
    const { data: model } = await supabase
      .from("models")
      .select("id, profile_views, created_at")
      .eq("user_id", user.id)
      .single() as { data: { id: string; profile_views: number; created_at: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // 1. Get total coins earned (positive amounts = earnings)
    const { data: coinData } = await (supabase
      .from("coin_transactions") as any)
      .select("amount, action, created_at")
      .eq("actor_id", actor.id)
      .gt("amount", 0);

    const totalCoinsEarned = (coinData || []).reduce((sum: number, t: any) => sum + t.amount, 0);

    // Group earnings by month
    const earningsByMonth: Record<string, number> = {};
    (coinData || []).forEach((t: any) => {
      const month = new Date(t.created_at).toISOString().slice(0, 7); // YYYY-MM
      earningsByMonth[month] = (earningsByMonth[month] || 0) + t.amount;
    });

    // Group earnings by type
    const earningsByType: Record<string, number> = {};
    (coinData || []).forEach((t: any) => {
      const type = t.action || "other";
      earningsByType[type] = (earningsByType[type] || 0) + t.amount;
    });

    // 2. Get bookings data
    const { data: bookings } = await (supabase
      .from("bookings") as any)
      .select("id, client_id, status, event_date, service_type, total_amount, created_at")
      .eq("model_id", model.id);

    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter((b: any) => b.status === "completed").length || 0;
    const upcomingBookings = bookings?.filter((b: any) =>
      ["accepted", "confirmed", "pending"].includes(b.status) &&
      new Date(b.event_date) >= new Date()
    ) || [];

    // 3. Get follower count
    const { count: followerCount } = await (supabase
      .from("follows") as any)
      .select("*", { count: "exact", head: true })
      .eq("following_id", actor.id);

    // 4. Get top fans/clients by spend
    const fanSpend: Record<string, number> = {};

    // Count spending from coin transactions where this model received coins
    // Look at negative transactions from fans to this model
    const { data: allTransactions } = await (supabase
      .from("coin_transactions") as any)
      .select("actor_id, amount, action, related_actor_id")
      .eq("related_actor_id", actor.id)
      .lt("amount", 0);

    (allTransactions || []).forEach((t: any) => {
      if (t.actor_id) {
        fanSpend[t.actor_id] = (fanSpend[t.actor_id] || 0) + Math.abs(t.amount);
      }
    });

    // Also count from bookings
    (bookings || []).filter((b: any) => b.status === "completed" && b.client_id).forEach((b: any) => {
      fanSpend[b.client_id] = (fanSpend[b.client_id] || 0) + (b.total_amount || 0);
    });

    // Get top 5 fans by spend
    const topFanIds = Object.entries(fanSpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let topFans: any[] = [];
    if (topFanIds.length > 0) {
      // Get actor info for top fans
      const { data: fanActors } = await supabase
        .from("actors")
        .select("id, type, user_id")
        .in("id", topFanIds);

      if (fanActors && fanActors.length > 0) {
        // Get fan details
        const fanUserIds = fanActors.filter((a: any) => a.type === "fan").map((a: any) => a.user_id);
        const brandIds = fanActors.filter((a: any) => a.type === "brand").map((a: any) => a.id);

        const [fansResult, brandsResult] = await Promise.all([
          fanUserIds.length > 0
            ? (supabase.from("fans") as any).select("id, display_name, avatar_url, user_id").in("user_id", fanUserIds)
            : { data: [] },
          brandIds.length > 0
            ? (supabase.from("brands") as any).select("id, company_name, logo_url").in("id", brandIds)
            : { data: [] },
        ]);

        const fans = fansResult.data || [];
        const brands = brandsResult.data || [];

        topFans = topFanIds.map(actorId => {
          const actor = fanActors.find((a: any) => a.id === actorId) as {
            id: string;
            type: string;
            user_id: string;
          } | undefined;
          if (!actor) return null;

          if (actor.type === "fan") {
            const fan = fans.find((f: any) => f.user_id === actor.user_id);
            return {
              id: actorId,
              name: fan?.display_name || "Fan",
              avatar_url: fan?.avatar_url,
              type: "fan",
              total_spent: fanSpend[actorId],
            };
          } else if (actor.type === "brand") {
            const brand = brands.find((b: any) => b.id === actorId);
            return {
              id: actorId,
              name: brand?.company_name || "Brand",
              avatar_url: brand?.logo_url,
              type: "brand",
              total_spent: fanSpend[actorId],
            };
          }
          return null;
        }).filter(Boolean);
      }
    }

    // 5. Get upcoming bookings with client info
    let upcomingWithClients: any[] = [];
    if (upcomingBookings.length > 0) {
      const clientIds = upcomingBookings.map((b: any) => b.client_id).filter(Boolean);

      if (clientIds.length > 0) {
        // Get actor types
        const { data: clientActors } = await supabase
          .from("actors")
          .select("id, type, user_id")
          .in("id", clientIds);

        const fanUserIds = (clientActors || []).filter((a: any) => a.type === "fan").map((a: any) => a.user_id);
        const brandIds = (clientActors || []).filter((a: any) => a.type === "brand").map((a: any) => a.id);

        const [fansResult, brandsResult] = await Promise.all([
          fanUserIds.length > 0
            ? (supabase.from("fans") as any).select("id, display_name, avatar_url, user_id").in("user_id", fanUserIds)
            : { data: [] },
          brandIds.length > 0
            ? (supabase.from("brands") as any).select("id, company_name, logo_url").in("id", brandIds)
            : { data: [] },
        ]);

        const fans = fansResult.data || [];
        const brands = brandsResult.data || [];

        upcomingWithClients = upcomingBookings
          .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .slice(0, 5)
          .map((booking: any) => {
            const clientActor = clientActors?.find((a: any) => a.id === booking.client_id) as {
              id: string;
              type: string;
              user_id: string;
            } | undefined;
            let client = null;

            if (clientActor?.type === "fan") {
              const fan = fans.find((f: any) => f.user_id === clientActor.user_id);
              client = {
                name: fan?.display_name || "Fan",
                avatar_url: fan?.avatar_url,
                type: "fan",
              };
            } else if (clientActor?.type === "brand") {
              const brand = brands.find((b: any) => b.id === booking.client_id);
              client = {
                name: brand?.company_name || "Brand",
                avatar_url: brand?.logo_url,
                type: "brand",
              };
            }

            return {
              ...booking,
              client,
            };
          });
      }
    }

    // 6. Get active conversations count
    const { data: conversations } = await (supabase
      .from("conversation_participants") as any)
      .select("conversation_id")
      .eq("actor_id", actor.id);

    const activeConversations = conversations?.length || 0;

    return NextResponse.json({
      totalCoinsEarned,
      earningsByMonth,
      earningsByType,
      totalBookings,
      completedBookings,
      followerCount: followerCount || 0,
      profileViews: model.profile_views || 0,
      activeConversations,
      topFans,
      upcomingBookings: upcomingWithClients,
    });
  } catch (error) {
    console.error("Model analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
