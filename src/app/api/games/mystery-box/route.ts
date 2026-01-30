import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mystery box tiers with their probabilities and gem ranges
const BOX_TIERS = [
  { tier: "common", weight: 50, minGems: 5, maxGems: 25, color: "#6b7280" },
  { tier: "rare", weight: 30, minGems: 30, maxGems: 75, color: "#3b82f6" },
  { tier: "epic", weight: 15, minGems: 100, maxGems: 200, color: "#8b5cf6" },
  { tier: "legendary", weight: 5, minGems: 300, maxGems: 500, color: "#f59e0b" },
];

function getRandomTier() {
  const totalWeight = BOX_TIERS.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;

  for (const tier of BOX_TIERS) {
    random -= tier.weight;
    if (random <= 0) {
      return tier;
    }
  }

  return BOX_TIERS[0]; // Fallback to common
}

function getRandomGems(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST() {
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
      .select("id, points_cached")
      .eq("user_id", user.id)
      .single();

    // For admins without a model profile, return dev/test data
    if (!model) {
      if (actor?.type === "admin") {
        const tier = getRandomTier();
        const gemsWon = getRandomGems(tier.minGems, tier.maxGems);
        return NextResponse.json({
          gemsWon,
          boxTier: tier.tier,
          tierColor: tier.color,
          newBalance: 9999,
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Check last box opening (must be 7+ days ago)
    const { data: lastBox } = await (supabase as any)
      .from("mystery_box_history")
      .select("created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastBox) {
      const lastBoxDate = new Date(lastBox.created_at);
      const now = new Date();
      const daysSinceLastBox = (now.getTime() - lastBoxDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastBox < 7) {
        const nextBoxTime = new Date(lastBoxDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        return NextResponse.json(
          {
            error: "You can only open one mystery box per week",
            nextBoxTime: nextBoxTime.toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // Get random tier and gems
    const tier = getRandomTier();
    const gemsWon = getRandomGems(tier.minGems, tier.maxGems);

    // Record the box opening
    const { error: historyError } = await (supabase as any)
      .from("mystery_box_history")
      .insert({
        model_id: model.id,
        gems_won: gemsWon,
        box_tier: tier.tier,
      });

    if (historyError) {
      console.error("Failed to record box opening:", historyError);
      return NextResponse.json(
        { error: "Failed to open mystery box" },
        { status: 500 }
      );
    }

    // Add gems using the award_points function
    const { error: balanceError } = await supabase
      .rpc("award_points", {
        p_model_id: model.id,
        p_action: "mystery_box",
        p_points: gemsWon,
        p_metadata: { box_tier: tier.tier },
      });

    if (balanceError) {
      console.error("Failed to add gems:", balanceError);
    }

    // Get updated balance
    const { data: updatedModel } = await supabase
      .from("models")
      .select("points_cached")
      .eq("id", model.id)
      .single();

    const newBalance = updatedModel?.points_cached ?? (model.points_cached || 0) + gemsWon;

    return NextResponse.json({
      gemsWon,
      boxTier: tier.tier,
      tierColor: tier.color,
      newBalance,
    });
  } catch (error) {
    console.error("Mystery box error:", error);
    return NextResponse.json(
      { error: "Failed to open mystery box" },
      { status: 500 }
    );
  }
}

// GET endpoint to check mystery box status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin for dev mode
    const { data: actorData } = await supabase
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

    // For admins without a model profile, return dev/test data
    if (!model) {
      if (actorData?.type === "admin") {
        return NextResponse.json({
          gemBalance: 9999,
          canOpen: true,
          nextBoxTime: null,
          lastBox: null,
          boxHistory: [],
          isDevMode: true,
        });
      }
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 404 }
      );
    }

    // Check last box opening
    const { data: lastBox } = await (supabase as any)
      .from("mystery_box_history")
      .select("created_at, gems_won, box_tier")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let canOpen = true;
    let nextBoxTime: string | null = null;

    if (lastBox) {
      const lastBoxDate = new Date(lastBox.created_at);
      const now = new Date();
      const daysSinceLastBox = (now.getTime() - lastBoxDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastBox < 7) {
        canOpen = false;
        nextBoxTime = new Date(lastBoxDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Get box history
    const { data: boxHistory } = await (supabase as any)
      .from("mystery_box_history")
      .select("id, gems_won, box_tier, created_at")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      gemBalance: model.points_cached || 0,
      canOpen,
      nextBoxTime,
      lastBox: lastBox || null,
      boxHistory: boxHistory || [],
    });
  } catch (error) {
    console.error("Mystery box status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mystery box status" },
      { status: 500 }
    );
  }
}
