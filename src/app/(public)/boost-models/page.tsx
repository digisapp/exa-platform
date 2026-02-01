import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { TopModelsGame } from "@/components/games/TopModelsGame";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";

export const metadata: Metadata = {
  title: "EXA Boost | EXA Models",
  description:
    "Boost your favorite models to the top of the leaderboard! Swipe, like, and help them trend.",
  openGraph: {
    title: "EXA Boost | EXA Models",
    description: "Swipe, like, and boost your favorite models to the top!",
    type: "website",
  },
};

export default async function TopModelsPage() {
  const supabase = await createClient();

  // Get current user if logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialUser = null;

  if (user) {
    // Get actor and coin balance
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    let coinBalance = 0;

    if (actor?.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      coinBalance = model?.coin_balance || 0;
    } else if (actor?.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      coinBalance = fan?.coin_balance || 0;
    } else if (actor?.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("coin_balance")
        .eq("user_id", user.id)
        .single();
      coinBalance = brand?.coin_balance || 0;
    }

    initialUser = {
      id: user.id,
      coinBalance,
    };
  }

  return (
    <CoinBalanceProvider initialBalance={initialUser?.coinBalance || 0}>
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <Navbar />

        <main className="container mx-auto px-4 py-6">
          {/* Minimal Header */}
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 text-transparent bg-clip-text">
              EXA Boost
            </h1>
          </div>

          {/* Game Component */}
          <TopModelsGame initialUser={initialUser} />
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
