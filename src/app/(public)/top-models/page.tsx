import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { TopModelsGame } from "@/components/games/TopModelsGame";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Flame, Trophy, Coins, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Top Models | EXA Models",
  description:
    "Discover amazing models in this fun swipe game. Like your favorites, boost them to the top of the leaderboard, and see who's trending!",
  openGraph: {
    title: "Top Models | EXA Models",
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

        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full mb-4">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">Top Models Game</span>
            </div>

            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 text-transparent bg-clip-text">
              Discover Amazing Models
            </h1>

            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Swipe right on models you like, and help them climb to the top of
              the leaderboard!
            </p>

            {/* How it works */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full">
                <span className="text-green-400">Swipe Right</span>
                <span className="text-muted-foreground">= 1 point</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-orange-400">Boost</span>
                <span className="text-muted-foreground">= 5 points</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-muted-foreground">Top the leaderboard</span>
              </div>
            </div>
          </div>

          {/* Game Component */}
          <TopModelsGame initialUser={initialUser} />

          {/* Footer Info */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>New models added daily. Reset every 24 hours.</span>
            </div>
          </div>
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
