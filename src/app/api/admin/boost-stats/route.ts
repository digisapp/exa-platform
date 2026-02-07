import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const getAdminClient = () => createServiceRoleClient();

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const chartPeriod = searchParams.get("chartPeriod") || "7d";
    const sessionsPage = parseInt(searchParams.get("sessionsPage") || "1");
    const sessionsPageSize = parseInt(searchParams.get("sessionsPageSize") || "20");

    const adminClient = getAdminClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthlyDate = new Date();
    monthlyDate.setDate(monthlyDate.getDate() - 30);

    // Calculate date range based on chart period
    const startDate = new Date();
    if (chartPeriod === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (chartPeriod === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setFullYear(2020);
    }

    // Fetch all counts in parallel (efficient with head: true)
    const [
      { count: totalSessionsCount },
      { count: totalSignedIn },
      { count: totalVotes },
      { count: totalLikes },
      { count: totalBoosts },
      { count: todaySessions },
      { count: todaySignedIn },
      { count: todayVotes },
      { count: todayLikes },
      { count: todayBoosts },
      { count: monthlySessions },
      { count: monthlySignedIn },
      { count: monthlyVotes },
      { count: monthlyLikes },
      { count: monthlyBoosts },
      { count: activeCardsCount },
      { data: topModelsData },
      { data: recentSessionsData },
    ] = await Promise.all([
      // All-time counts
      adminClient.from("top_model_sessions").select("*", { count: "exact", head: true }),
      adminClient.from("top_model_sessions").select("*", { count: "exact", head: true }).not("user_id", "is", null),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).eq("vote_type", "like"),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).eq("is_boosted", true),
      // Today counts
      adminClient.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      adminClient.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).not("user_id", "is", null),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).eq("vote_type", "like"),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).eq("is_boosted", true),
      // Monthly counts
      adminClient.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()),
      adminClient.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()).not("user_id", "is", null),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()).eq("vote_type", "like"),
      adminClient.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()).eq("is_boosted", true),
      // Active model cards count
      adminClient.from("models").select("*", { count: "exact", head: true }).eq("is_approved", true).not("profile_photo_url", "is", null),
      // Top models from leaderboard
      adminClient.from("top_model_leaderboard").select(`
        model_id,
        total_points,
        total_likes,
        total_boosts,
        models!inner (
          id,
          first_name,
          username,
          profile_photo_url
        )
      `).gt("total_points", 0).order("total_points", { ascending: false }).limit(10),
      // Recent sessions with pagination
      adminClient.from("top_model_sessions").select("id, user_id, created_at, completed_at, models_swiped").order("created_at", { ascending: false }).range((sessionsPage - 1) * sessionsPageSize, sessionsPage * sessionsPageSize - 1),
    ]);

    // Aggregate daily data - limit records to prevent memory issues
    const maxRecordsForChart = chartPeriod === "all" ? 10000 : 50000;

    const [
      { data: sessionsData },
      { data: votesData },
    ] = await Promise.all([
      adminClient.from("top_model_sessions")
        .select("created_at")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })
        .limit(maxRecordsForChart),
      adminClient.from("top_model_votes")
        .select("created_at, is_boosted")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })
        .limit(maxRecordsForChart),
    ]);

    // Process daily data
    const dailyMap = new Map<string, { sessions: number; votes: number; boosts: number }>();

    (sessionsData || []).forEach((s: any) => {
      const date = new Date(s.created_at).toISOString().split("T")[0];
      const existing = dailyMap.get(date) || { sessions: 0, votes: 0, boosts: 0 };
      existing.sessions++;
      dailyMap.set(date, existing);
    });

    (votesData || []).forEach((v: any) => {
      const date = new Date(v.created_at).toISOString().split("T")[0];
      const existing = dailyMap.get(date) || { sessions: 0, votes: 0, boosts: 0 };
      existing.votes++;
      if (v.is_boosted) existing.boosts++;
      dailyMap.set(date, existing);
    });

    // Fill in all days in the range
    const dailyData: { date: string; sessions: number; votes: number; boosts: number }[] = [];
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const existing = dailyMap.get(dateStr);
      dailyData.push({
        date: dateStr,
        sessions: existing?.sessions || 0,
        votes: existing?.votes || 0,
        boosts: existing?.boosts || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process top models
    const topModels = (topModelsData || []).map((entry: any) => ({
      model_id: entry.model_id,
      username: entry.models?.username || "Unknown",
      first_name: entry.models?.first_name || null,
      profile_photo_url: entry.models?.profile_photo_url || null,
      points: entry.total_points || 0,
      likes: entry.total_likes || 0,
      boosts: entry.total_boosts || 0,
    }));

    // Get user names for recent sessions
    const userIds = (recentSessionsData || [])
      .filter((s: any) => s.user_id)
      .map((s: any) => s.user_id);

    const fanNames = new Map<string, string>();
    if (userIds.length > 0) {
      const [
        { data: actors },
        { data: models },
      ] = await Promise.all([
        adminClient.from("actors").select("id, user_id, type").in("user_id", userIds),
        adminClient.from("models").select("user_id, first_name, username").in("user_id", userIds),
      ]);

      const actorIds = (actors || []).map((a: any) => a.id);
      const userToActor = new Map((actors || []).map((a: any) => [a.user_id, { id: a.id, type: a.type }]));
      const modelLookup = new Map((models || []).map((m: any) => [m.user_id, m]));

      let fanLookup = new Map();
      if (actorIds.length > 0) {
        const { data: fans } = await adminClient
          .from("fans")
          .select("id, display_name, username")
          .in("id", actorIds);
        fanLookup = new Map((fans || []).map((f: any) => [f.id, f]));
      }

      for (const [userId, actorInfo] of userToActor) {
        const actorId = actorInfo.id;
        const actorType = actorInfo.type;

        const model = modelLookup.get(userId);
        if (model || actorType === "model") {
          const name = model?.username || model?.first_name;
          if (name) {
            fanNames.set(userId, name);
            continue;
          }
        }

        const fan = fanLookup.get(actorId);
        if (fan || actorType === "fan") {
          const name = fan?.username || fan?.display_name;
          if (name) {
            fanNames.set(userId, name);
            continue;
          }
        }

        fanNames.set(userId, actorType === "model" ? "Model" : "Fan");
      }
    }

    // Get vote counts for sessions
    const sessionIds = (recentSessionsData || []).map((s: any) => s.id);
    const sessionVoteCounts = new Map<string, number>();
    if (sessionIds.length > 0) {
      const { data: voteCounts } = await adminClient
        .from("top_model_votes")
        .select("session_id")
        .in("session_id", sessionIds);

      (voteCounts || []).forEach((v: any) => {
        sessionVoteCounts.set(v.session_id, (sessionVoteCounts.get(v.session_id) || 0) + 1);
      });
    }

    const recentSessions = (recentSessionsData || []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      created_at: s.created_at,
      completed_at: s.completed_at,
      models_swiped: Array.isArray(s.models_swiped) ? s.models_swiped.length : 0,
      total_votes: sessionVoteCounts.get(s.id) || 0,
      fan_display_name: s.user_id ? fanNames.get(s.user_id) || "Signed In" : null,
    }));

    return NextResponse.json({
      today: {
        sessions: todaySessions || 0,
        signedIn: todaySignedIn || 0,
        votes: todayVotes || 0,
        likes: todayLikes || 0,
        boosts: todayBoosts || 0,
      },
      monthly: {
        sessions: monthlySessions || 0,
        signedIn: monthlySignedIn || 0,
        votes: monthlyVotes || 0,
        likes: monthlyLikes || 0,
        boosts: monthlyBoosts || 0,
      },
      all: {
        sessions: totalSessionsCount || 0,
        signedIn: totalSignedIn || 0,
        votes: totalVotes || 0,
        likes: totalLikes || 0,
        boosts: totalBoosts || 0,
      },
      dailyData,
      topModels,
      recentSessions,
      totalSessions: totalSessionsCount || 0,
      activeModelCards: activeCardsCount || 0,
    });
  } catch (error) {
    console.error("Admin boost stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
