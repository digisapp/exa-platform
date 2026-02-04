import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get total sessions (players)
    const { count: totalSessions } = await (supabase as any)
      .from("top_model_sessions")
      .select("*", { count: "exact", head: true });

    // Get signed-in vs anonymous breakdown
    const { count: signedInSessions } = await (supabase as any)
      .from("top_model_sessions")
      .select("*", { count: "exact", head: true })
      .not("user_id", "is", null);

    const anonymousSessions = (totalSessions || 0) - (signedInSessions || 0);

    // Get completed sessions (players who finished all models)
    const { count: completedSessions } = await (supabase as any)
      .from("top_model_sessions")
      .select("*", { count: "exact", head: true })
      .not("completed_at", "is", null);

    // Get total votes
    const { count: totalVotes } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true });

    // Get likes count
    const { count: totalLikes } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true })
      .eq("vote_type", "like");

    // Get passes count
    const { count: totalPasses } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true })
      .eq("vote_type", "pass");

    // Get boosts count
    const { count: totalBoosts } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true })
      .eq("is_boosted", true);

    // Get reveals count
    const { count: totalReveals } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true })
      .eq("is_revealed", true);

    // Get total coins spent on boosts
    const { data: coinsData } = await (supabase as any)
      .from("top_model_votes")
      .select("coins_spent")
      .gt("coins_spent", 0);

    const totalCoinsSpent = coinsData?.reduce((sum: number, v: { coins_spent: number }) => sum + (v.coins_spent || 0), 0) || 0;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todaySessions } = await (supabase as any)
      .from("top_model_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    const { count: todayVotes } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    const { count: todayBoosts } = await (supabase as any)
      .from("top_model_votes")
      .select("*", { count: "exact", head: true })
      .eq("is_boosted", true)
      .gte("created_at", today.toISOString());

    return NextResponse.json({
      totalSessions: totalSessions || 0,
      signedInSessions: signedInSessions || 0,
      anonymousSessions,
      completedSessions: completedSessions || 0,
      totalVotes: totalVotes || 0,
      totalLikes: totalLikes || 0,
      totalPasses: totalPasses || 0,
      totalBoosts: totalBoosts || 0,
      totalReveals: totalReveals || 0,
      totalCoinsSpent,
      todaySessions: todaySessions || 0,
      todayVotes: todayVotes || 0,
      todayBoosts: todayBoosts || 0,
    });
  } catch (error) {
    console.error("Boost stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch boost stats" },
      { status: 500 }
    );
  }
}
