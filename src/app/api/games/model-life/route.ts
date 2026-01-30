import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Activity definitions with cooldowns and gem values
const ACTIVITIES = {
  workout: {
    name: "Hit the Gym",
    emoji: "💪",
    gemsEarned: 15,
    cooldownHours: 12,
    description: "Get your workout in and earn gems",
  },
  coffee: {
    name: "Grab Coffee",
    emoji: "☕",
    gemsEarned: -5, // costs gems
    cooldownHours: 4,
    description: "Treat yourself to a matcha or coffee",
  },
  content: {
    name: "Create Content",
    emoji: "📸",
    gemsEarned: 25,
    cooldownHours: 8,
    description: "Shoot photos or create content",
  },
  event: {
    name: "Attend Event",
    emoji: "🎉",
    gemsEarned: 50,
    cooldownHours: 24,
    description: "Network at a fashion or industry event",
  },
  wellness: {
    name: "Self-Care",
    emoji: "🧘",
    gemsEarned: 10,
    cooldownHours: 12,
    description: "Meditation, skincare, or wellness routine",
  },
  network: {
    name: "Network",
    emoji: "🤝",
    gemsEarned: 20,
    cooldownHours: 8,
    description: "Connect with brands or other models",
  },
};

type ActivityType = keyof typeof ACTIVITIES;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin for dev mode
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    // Get model data
    const { data: model } = await supabase
      .from("models")
      .select("id, points_cached, first_name, profile_photo_url")
      .eq("user_id", user.id)
      .single();

    // For admins without a model profile, return dev/test data
    if (!model) {
      if (actor?.type === "admin") {
        return NextResponse.json({
          gemBalance: 9999,
          modelName: "Admin (Dev)",
          profilePhoto: null,
          activities: Object.entries(ACTIVITIES).map(([type, config]) => ({
            type,
            ...config,
            available: true,
            nextAvailable: null,
            lastDone: null,
          })),
          stats: {
            current_streak: 0,
            longest_streak: 0,
            total_workouts: 0,
            total_content: 0,
            total_events: 0,
            total_wellness: 0,
          },
          todayEarnings: 0,
          history: [],
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Get last activity times for each type
    const { data: recentActivities } = await (supabase as any)
      .from("lifestyle_activities")
      .select("activity_type, created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Build activity status map
    const now = new Date();
    const activityStatus: Record<string, { available: boolean; nextAvailable: string | null; lastDone: string | null }> = {};

    for (const [type, config] of Object.entries(ACTIVITIES)) {
      const lastActivity = recentActivities?.find((a: any) => a.activity_type === type);

      if (lastActivity) {
        const lastTime = new Date(lastActivity.created_at);
        const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
        const available = hoursSince >= config.cooldownHours;

        activityStatus[type] = {
          available,
          nextAvailable: available ? null : new Date(lastTime.getTime() + config.cooldownHours * 60 * 60 * 1000).toISOString(),
          lastDone: lastActivity.created_at,
        };
      } else {
        activityStatus[type] = {
          available: true,
          nextAvailable: null,
          lastDone: null,
        };
      }
    }

    // Get lifestyle stats
    const { data: stats } = await (supabase as any)
      .from("lifestyle_stats")
      .select("*")
      .eq("model_id", model.id)
      .single();

    // Get recent activity history
    const { data: history } = await (supabase as any)
      .from("lifestyle_activities")
      .select("id, activity_type, gems_change, streak_day, created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate today's earnings
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEarnings = history
      ?.filter((h: any) => new Date(h.created_at) >= todayStart)
      .reduce((sum: number, h: any) => sum + h.gems_change, 0) || 0;

    return NextResponse.json({
      gemBalance: model.points_cached || 0,
      modelName: model.first_name || "Model",
      profilePhoto: model.profile_photo_url,
      activities: Object.entries(ACTIVITIES).map(([type, config]) => ({
        type,
        ...config,
        ...activityStatus[type],
      })),
      stats: stats || {
        current_streak: 0,
        longest_streak: 0,
        total_workouts: 0,
        total_content: 0,
        total_events: 0,
        total_wellness: 0,
      },
      todayEarnings,
      history: history || [],
    });
  } catch (error) {
    console.error("Model life status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch model life status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { activityType } = await request.json();

    if (!activityType || !ACTIVITIES[activityType as ActivityType]) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    const activity = ACTIVITIES[activityType as ActivityType];

    // Check if user is admin for dev mode
    const { data: actorForPost } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    // Get model data
    const { data: model } = await supabase
      .from("models")
      .select("id, points_cached")
      .eq("user_id", user.id)
      .single();

    // For admins without a model profile, return dev/test response
    if (!model) {
      if (actorForPost?.type === "admin") {
        return NextResponse.json({
          success: true,
          activity: {
            type: activityType,
            name: activity.name,
            emoji: activity.emoji,
            gemsChange: activity.gemsEarned,
          },
          newBalance: 9999,
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Check if activity is on cooldown
    const { data: lastActivity } = await (supabase as any)
      .from("lifestyle_activities")
      .select("created_at")
      .eq("model_id", model.id)
      .eq("activity_type", activityType)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastActivity) {
      const lastTime = new Date(lastActivity.created_at);
      const now = new Date();
      const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);

      if (hoursSince < activity.cooldownHours) {
        const nextAvailable = new Date(lastTime.getTime() + activity.cooldownHours * 60 * 60 * 1000);
        return NextResponse.json(
          {
            error: "Activity on cooldown",
            nextAvailable: nextAvailable.toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // Check if model has enough gems for activities that cost gems
    if (activity.gemsEarned < 0) {
      const currentBalance = model.points_cached || 0;
      if (currentBalance < Math.abs(activity.gemsEarned)) {
        return NextResponse.json(
          { error: "Not enough gems for this activity" },
          { status: 400 }
        );
      }
    }

    // Record the activity
    const { error: activityError } = await (supabase as any)
      .from("lifestyle_activities")
      .insert({
        model_id: model.id,
        activity_type: activityType,
        gems_change: activity.gemsEarned,
      });

    if (activityError) {
      console.error("Failed to record activity:", activityError);
      return NextResponse.json(
        { error: "Failed to record activity" },
        { status: 500 }
      );
    }

    // Update gems using award_points (or subtract if negative)
    if (activity.gemsEarned > 0) {
      await supabase.rpc("award_points", {
        p_model_id: model.id,
        p_action: `lifestyle_${activityType}`,
        p_points: activity.gemsEarned,
        p_metadata: { activity_type: activityType },
      });
    } else {
      // For activities that cost gems, use negative award
      await supabase.rpc("award_points", {
        p_model_id: model.id,
        p_action: `lifestyle_${activityType}`,
        p_points: activity.gemsEarned, // negative value
        p_metadata: { activity_type: activityType },
      });
    }

    // Update stats
    const today = new Date().toISOString().split("T")[0];
    const { data: existingStats } = await (supabase as any)
      .from("lifestyle_stats")
      .select("*")
      .eq("model_id", model.id)
      .single();

    if (existingStats) {
      // Calculate streak
      const lastActivityDate = existingStats.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = existingStats.current_streak;
      if (lastActivityDate === yesterdayStr) {
        newStreak += 1;
      } else if (lastActivityDate !== today) {
        newStreak = 1; // Reset streak if missed a day
      }

      const updateData: any = {
        last_activity_date: today,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, existingStats.longest_streak),
        updated_at: new Date().toISOString(),
      };

      // Increment the appropriate counter
      if (activityType === "workout") updateData.total_workouts = existingStats.total_workouts + 1;
      if (activityType === "content") updateData.total_content = existingStats.total_content + 1;
      if (activityType === "event") updateData.total_events = existingStats.total_events + 1;
      if (activityType === "wellness") updateData.total_wellness = existingStats.total_wellness + 1;

      await (supabase as any)
        .from("lifestyle_stats")
        .update(updateData)
        .eq("model_id", model.id);
    } else {
      // Create new stats record
      const insertData: any = {
        model_id: model.id,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        total_workouts: activityType === "workout" ? 1 : 0,
        total_content: activityType === "content" ? 1 : 0,
        total_events: activityType === "event" ? 1 : 0,
        total_wellness: activityType === "wellness" ? 1 : 0,
      };

      await (supabase as any)
        .from("lifestyle_stats")
        .insert(insertData);
    }

    // Get updated balance
    const { data: updatedModel } = await supabase
      .from("models")
      .select("points_cached")
      .eq("id", model.id)
      .single();

    return NextResponse.json({
      success: true,
      activity: {
        type: activityType,
        name: activity.name,
        emoji: activity.emoji,
        gemsChange: activity.gemsEarned,
      },
      newBalance: updatedModel?.points_cached ?? (model.points_cached || 0) + activity.gemsEarned,
    });
  } catch (error) {
    console.error("Model life activity error:", error);
    return NextResponse.json(
      { error: "Failed to complete activity" },
      { status: 500 }
    );
  }
}
