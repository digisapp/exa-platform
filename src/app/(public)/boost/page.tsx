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
  let navbarUser = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;

  if (user) {
    // Get actor and coin balance
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    actorType = (actor?.type as "model" | "fan" | "brand" | "admin") ?? null;
    let coinBalance = 0;
    let avatarUrl = "";
    let name = "";
    let username = "";

    if (actor?.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("coin_balance, profile_photo_url, first_name, username")
        .eq("user_id", user.id)
        .single();
      coinBalance = model?.coin_balance || 0;
      avatarUrl = model?.profile_photo_url || "";
      name = model?.first_name || "";
      username = model?.username || "";
    } else if (actor?.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("coin_balance, avatar_url, display_name, username")
        .eq("user_id", user.id)
        .single();
      coinBalance = fan?.coin_balance || 0;
      avatarUrl = fan?.avatar_url || "";
      name = fan?.display_name || "";
      username = fan?.username || "";
    } else if (actor?.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("coin_balance, logo_url, company_name")
        .eq("user_id", user.id)
        .single();
      coinBalance = brand?.coin_balance || 0;
      avatarUrl = brand?.logo_url || "";
      name = brand?.company_name || "";
    }

    initialUser = {
      id: user.id,
      coinBalance,
    };

    navbarUser = {
      id: user.id,
      email: user.email || "",
      avatar_url: avatarUrl,
      name: name,
      username: username,
    };
  }

  return (
    <CoinBalanceProvider initialBalance={initialUser?.coinBalance || 0}>
      <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <Navbar user={navbarUser} actorType={actorType} />

        <main className="container mx-auto px-4 py-6">
          {/* Enhanced Header */}
          <div className="text-center mb-4">
            <h1 className="relative inline-flex items-center justify-center gap-2">
              <span className="absolute inset-0 blur-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 opacity-50 animate-pulse" />
              <svg className="w-6 h-6 text-yellow-400 animate-[spin_3s_linear_infinite]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
              </svg>
              <span className="relative text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-pink-400 via-purple-400 via-50% to-orange-400 text-transparent bg-clip-text bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]">
                EXA Boost
              </span>
              <svg className="w-6 h-6 text-yellow-400 animate-[spin_3s_linear_infinite_reverse]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
              </svg>
            </h1>
          </div>

          {/* Game Component */}
          <TopModelsGame initialUser={initialUser} />
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
