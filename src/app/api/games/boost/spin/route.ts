import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Claim daily spin reward
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Must be signed in to claim spin reward" },
        { status: 401 }
      );
    }

    const { coins } = await request.json();

    // Validate coins amount (1-25 range based on wheel segments)
    if (!coins || coins < 1 || coins > 25) {
      return NextResponse.json(
        { error: "Invalid coins amount" },
        { status: 400 }
      );
    }

    // Call the claim_daily_spin function
    const { data, error } = await (supabase as any).rpc(
      "claim_daily_spin",
      {
        p_user_id: user.id,
        p_coins: coins,
      }
    );

    if (error) {
      console.error("Spin claim error:", error);
      return NextResponse.json(
        { error: "Failed to claim spin reward" },
        { status: 500 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || "Failed to claim spin reward" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coinsAwarded: data.coins_awarded,
      totalSpinCoins: data.total_spin_coins,
      newBalance: data.new_balance,
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json(
      { error: "Failed to process spin" },
      { status: 500 }
    );
  }
}
