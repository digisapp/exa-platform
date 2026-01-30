import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("id, points_cached, first_name")
      .eq("user_id", user.id)
      .single();

    // For admins without a model profile, return dev/test data
    if (!model) {
      if (actor?.type === "admin") {
        return NextResponse.json({
          gemBalance: 9999,
          modelName: "Admin (Dev)",
          personalBest: null,
          playerRank: null,
          leaderboard: [],
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Get player's high score
    const { data: personalBest } = await (supabase as any)
      .from("runway_rush_scores")
      .select("score, gems_collected, distance, created_at")
      .eq("model_id", model.id)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    // Get top 10 leaderboard
    const { data: leaderboard } = await (supabase as any)
      .from("runway_rush_scores")
      .select(`
        score,
        gems_collected,
        model_id,
        created_at,
        models!inner(first_name, username, profile_photo_url)
      `)
      .order("score", { ascending: false })
      .limit(10);

    // Get player's rank
    let playerRank = null;
    if (personalBest) {
      const { count } = await (supabase as any)
        .from("runway_rush_scores")
        .select("id", { count: "exact", head: true })
        .gt("score", personalBest.score);
      playerRank = (count || 0) + 1;
    }

    return NextResponse.json({
      gemBalance: model.points_cached || 0,
      modelName: model.first_name || "Model",
      personalBest: personalBest || null,
      playerRank,
      leaderboard: leaderboard?.map((entry: any) => ({
        score: entry.score,
        gemsCollected: entry.gems_collected,
        modelName: entry.models?.first_name || entry.models?.username || "Model",
        profilePhoto: entry.models?.profile_photo_url,
      })) || [],
    });
  } catch (error) {
    console.error("Runway rush status error:", error);
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

    const { score, gemsCollected, distance } = await request.json();

    // Validate inputs
    if (typeof score !== "number" || score < 0 || score > 1000000) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    if (typeof gemsCollected !== "number" || gemsCollected < 0 || gemsCollected > 10000) {
      return NextResponse.json({ error: "Invalid gems" }, { status: 400 });
    }

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
          score,
          gemsCollected,
          bonusGems: 0,
          totalGemsEarned: gemsCollected,
          isNewHighScore: true,
          newBalance: 9999,
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Get previous high score
    const { data: previousBest } = await (supabase as any)
      .from("runway_rush_scores")
      .select("score")
      .eq("model_id", model.id)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    const isNewHighScore = !previousBest || score > previousBest.score;

    // Save the score
    const { error: scoreError } = await (supabase as any)
      .from("runway_rush_scores")
      .insert({
        model_id: model.id,
        score,
        gems_collected: gemsCollected,
        distance: distance || 0,
      });

    if (scoreError) {
      console.error("Failed to save score:", scoreError);
      return NextResponse.json(
        { error: "Failed to save score" },
        { status: 500 }
      );
    }

    // Award gems collected during the run
    if (gemsCollected > 0) {
      await supabase.rpc("award_points", {
        p_model_id: model.id,
        p_action: "runway_rush",
        p_points: gemsCollected,
        p_metadata: { score, distance },
      });
    }

    // Bonus gems for new high score
    let bonusGems = 0;
    if (isNewHighScore && score >= 100) {
      bonusGems = Math.floor(score / 100) * 5; // 5 bonus gems per 100 score
      bonusGems = Math.min(bonusGems, 100); // Cap at 100 bonus

      await supabase.rpc("award_points", {
        p_model_id: model.id,
        p_action: "runway_rush_highscore",
        p_points: bonusGems,
        p_metadata: { score, previousBest: previousBest?.score || 0 },
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
      score,
      gemsCollected,
      bonusGems,
      totalGemsEarned: gemsCollected + bonusGems,
      isNewHighScore,
      newBalance: updatedModel?.points_cached ?? model.points_cached,
    });
  } catch (error) {
    console.error("Runway rush score error:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }
}
