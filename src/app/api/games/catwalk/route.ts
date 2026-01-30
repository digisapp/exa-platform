import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Runway definitions
const RUNWAYS = {
  studio: {
    id: "studio",
    name: "Fashion Studio",
    description: "A classic indoor runway to start your journey",
    background: "#1a1a2e",
    accentColor: "#ec4899",
    unlockCost: 0, // Free
    gemMultiplier: 1,
  },
  nyc: {
    id: "nyc",
    name: "NYC Fashion Week",
    description: "The bright lights of New York",
    background: "#0f172a",
    accentColor: "#f59e0b",
    unlockCost: 500,
    gemMultiplier: 1.2,
  },
  paris: {
    id: "paris",
    name: "Paris Streets",
    description: "Walk the romantic streets of Paris",
    background: "#1e1b4b",
    accentColor: "#a855f7",
    unlockCost: 1000,
    gemMultiplier: 1.5,
  },
  milan: {
    id: "milan",
    name: "Milan Cathedral",
    description: "A breathtaking show at the Duomo",
    background: "#18181b",
    accentColor: "#14b8a6",
    unlockCost: 2000,
    gemMultiplier: 1.8,
  },
  london: {
    id: "london",
    name: "London Bridge",
    description: "An iconic runway on the Thames",
    background: "#1c1917",
    accentColor: "#ef4444",
    unlockCost: 3000,
    gemMultiplier: 2,
  },
  lagerfeld: {
    id: "lagerfeld",
    name: "Legendary Show",
    description: "The most prestigious runway in fashion",
    background: "#000000",
    accentColor: "#fbbf24",
    unlockCost: 5000,
    gemMultiplier: 3,
  },
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    // Get model data
    const { data: model } = await supabase
      .from("models")
      .select("id, points_cached, first_name")
      .eq("user_id", user.id)
      .single();

    // For admins without a model profile, return dev/test data with all runways unlocked
    if (!model) {
      if (actor?.type === "admin") {
        const runwaysList = Object.values(RUNWAYS).map((runway) => ({
          ...runway,
          unlocked: true, // All unlocked for admin dev mode
          bestScore: null,
        }));
        return NextResponse.json({
          gemBalance: 9999,
          modelName: "Admin (Dev)",
          runways: runwaysList,
          leaderboard: [],
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Get unlocked runways
    const { data: unlocks } = await (supabase as any)
      .from("catwalk_unlocks")
      .select("runway_id")
      .eq("model_id", model.id);

    const unlockedRunways = new Set(["studio", ...(unlocks?.map((u: any) => u.runway_id) || [])]);

    // Get personal bests for each runway
    const { data: scores } = await (supabase as any)
      .from("catwalk_scores")
      .select("runway_id, total_score, walk_score, pose_score")
      .eq("model_id", model.id)
      .order("total_score", { ascending: false });

    // Build best scores map
    const bestScores: Record<string, any> = {};
    scores?.forEach((score: any) => {
      if (!bestScores[score.runway_id] || score.total_score > bestScores[score.runway_id].total_score) {
        bestScores[score.runway_id] = score;
      }
    });

    // Get global leaderboard (top 10)
    const { data: leaderboard } = await (supabase as any)
      .from("catwalk_scores")
      .select(`
        total_score,
        runway_id,
        model_id,
        models!inner(first_name, username, profile_photo_url)
      `)
      .order("total_score", { ascending: false })
      .limit(10);

    // Build runways list with unlock status
    const runwaysList = Object.values(RUNWAYS).map((runway) => ({
      ...runway,
      unlocked: unlockedRunways.has(runway.id),
      bestScore: bestScores[runway.id] || null,
    }));

    return NextResponse.json({
      gemBalance: model.points_cached || 0,
      modelName: model.first_name || "Model",
      runways: runwaysList,
      leaderboard: leaderboard?.map((entry: any) => ({
        score: entry.total_score,
        runwayId: entry.runway_id,
        modelName: entry.models?.first_name || entry.models?.username || "Model",
        profilePhoto: entry.models?.profile_photo_url,
      })) || [],
    });
  } catch (error) {
    console.error("Catwalk status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch game status" },
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

    const body = await request.json();
    const { action } = body;

    // Check if user is admin
    const { data: actor } = await supabase
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

    // For admins without a model profile, return dev/test responses
    if (!model) {
      if (actor?.type === "admin") {
        if (action === "unlock") {
          return NextResponse.json({
            success: true,
            unlocked: body.runwayId,
            newBalance: 9999,
            isDevMode: true,
          });
        }
        if (action === "score") {
          const { walkScore, poseScore, gemsCollected } = body;
          const totalScore = (walkScore || 0) + (poseScore || 0);
          return NextResponse.json({
            success: true,
            walkScore,
            poseScore,
            totalScore,
            gemsEarned: gemsCollected || 0,
            bonusGems: 0,
            isNewHighScore: false,
            newBalance: 9999,
            isDevMode: true,
          });
        }
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    if (action === "unlock") {
      // Unlock a runway
      const { runwayId } = body;
      const runway = RUNWAYS[runwayId as keyof typeof RUNWAYS];

      if (!runway) {
        return NextResponse.json({ error: "Invalid runway" }, { status: 400 });
      }

      // Check if already unlocked
      const { data: existing } = await (supabase as any)
        .from("catwalk_unlocks")
        .select("id")
        .eq("model_id", model.id)
        .eq("runway_id", runwayId)
        .single();

      if (existing) {
        return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
      }

      // Check if can afford
      if ((model.points_cached || 0) < runway.unlockCost) {
        return NextResponse.json({ error: "Not enough gems" }, { status: 400 });
      }

      // Deduct gems
      await supabase.rpc("award_points", {
        p_model_id: model.id,
        p_action: "catwalk_unlock",
        p_points: -runway.unlockCost,
        p_metadata: { runway_id: runwayId },
      });

      // Add unlock
      await (supabase as any)
        .from("catwalk_unlocks")
        .insert({
          model_id: model.id,
          runway_id: runwayId,
        });

      // Get updated balance
      const { data: updatedModel } = await supabase
        .from("models")
        .select("points_cached")
        .eq("id", model.id)
        .single();

      return NextResponse.json({
        success: true,
        unlocked: runwayId,
        newBalance: updatedModel?.points_cached,
      });
    }

    if (action === "score") {
      // Save a game score
      const { runwayId, walkScore, poseScore, gemsCollected, perfectWalks } = body;

      const runway = RUNWAYS[runwayId as keyof typeof RUNWAYS];
      if (!runway) {
        return NextResponse.json({ error: "Invalid runway" }, { status: 400 });
      }

      // Validate scores
      if (
        typeof walkScore !== "number" || walkScore < 0 || walkScore > 100 ||
        typeof poseScore !== "number" || poseScore < 0 || poseScore > 100
      ) {
        return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
      }

      const totalScore = walkScore + poseScore;

      // Get previous best
      const { data: previousBest } = await (supabase as any)
        .from("catwalk_scores")
        .select("total_score")
        .eq("model_id", model.id)
        .eq("runway_id", runwayId)
        .order("total_score", { ascending: false })
        .limit(1)
        .single();

      const isNewHighScore = !previousBest || totalScore > previousBest.total_score;

      // Save score
      await (supabase as any)
        .from("catwalk_scores")
        .insert({
          model_id: model.id,
          runway_id: runwayId,
          walk_score: walkScore,
          pose_score: poseScore,
          total_score: totalScore,
          gems_collected: gemsCollected || 0,
          perfect_walks: perfectWalks || 0,
        });

      // Calculate gems earned (with runway multiplier)
      let gemsEarned = Math.floor((gemsCollected || 0) * runway.gemMultiplier);

      // Bonus for high scores
      if (totalScore >= 180) gemsEarned += 50; // Near perfect
      else if (totalScore >= 150) gemsEarned += 25;
      else if (totalScore >= 100) gemsEarned += 10;

      // Bonus for new high score
      let bonusGems = 0;
      if (isNewHighScore && totalScore >= 50) {
        bonusGems = Math.floor(totalScore / 10) * 5;
        bonusGems = Math.min(bonusGems, 100);
        gemsEarned += bonusGems;
      }

      // Award gems
      if (gemsEarned > 0) {
        await supabase.rpc("award_points", {
          p_model_id: model.id,
          p_action: "catwalk_score",
          p_points: gemsEarned,
          p_metadata: { runway_id: runwayId, total_score: totalScore },
        });
      }

      // Get updated balance
      const { data: updatedModel } = await supabase
        .from("models")
        .select("points_cached")
        .eq("id", model.id)
        .single();

      return NextResponse.json({
        success: true,
        walkScore,
        poseScore,
        totalScore,
        gemsEarned,
        bonusGems,
        isNewHighScore,
        newBalance: updatedModel?.points_cached,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Catwalk action error:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
