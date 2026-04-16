import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { ContestantsGrid } from "@/components/swimcrown/ContestantsGrid";
import { Crown } from "lucide-react";

export const metadata: Metadata = {
  title: "SwimCrown Contestants | EXA",
  description:
    "Browse and vote for your favorite swim models competing in the SwimCrown global competition. Every coin counts as a vote!",
  openGraph: {
    title: "SwimCrown Contestants | EXA",
    description:
      "Browse and vote for your favorite swim models in the SwimCrown competition.",
    type: "website",
  },
};

export default async function SwimCrownContestantsPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navbarUser = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let coinBalance = 0;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type === "model" || actor?.type === "fan" || actor?.type === "brand" || actor?.type === "admin") {
      actorType = actor.type;
    }

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

    navbarUser = {
      id: user.id,
      email: user.email || "",
      avatar_url: avatarUrl,
      name,
      username,
    };
  }

  // Fetch current competition and contestants via internal fetch
  let competition = null;
  let contestants: any[] = [];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/swimcrown/contestants`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      competition = data.competition || null;
      // Transform camelCase API response to snake_case for ContestantsGrid
      contestants = (data.contestants || []).map((c: any) => ({
        id: c.id,
        model_id: c.modelId,
        tagline: c.tagline,
        tier: c.tier,
        vote_count: c.voteCount,
        created_at: c.createdAt || new Date().toISOString(),
        model: c.model ? {
          id: c.model.id,
          first_name: c.model.firstName,
          last_name: c.model.lastName || "",
          username: c.model.username,
          profile_photo_url: c.model.profilePhotoUrl,
          city: c.model.city,
          state: c.model.state,
        } : null,
      }));
    }
  } catch {
    // Silently handle — grid will show empty state
  }

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1f35] to-[#0a1628]">
        <Navbar user={navbarUser} actorType={actorType} />

        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-2">
              Cast your vote
            </p>
            <h1 className="relative inline-flex items-center justify-center gap-2">
              <Crown className="h-7 w-7 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
              <span className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-teal-300 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                SwimCrown Contestants
              </span>
              <Crown className="h-7 w-7 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
            </h1>
            {competition && (
              <p className="mt-2 text-white/70">
                <span className="text-white font-semibold">{competition.name}</span>
                <span className="text-white/50"> — Vote for your favorite!</span>
              </p>
            )}
          </div>

          <ContestantsGrid
            initialContestants={contestants}
            competition={competition}
            isLoggedIn={!!user}
          />
        </main>

        {navbarUser && (
          <BottomNav
            user={{
              avatar_url: navbarUser.avatar_url,
              name: navbarUser.name,
              email: navbarUser.email,
            }}
            actorType={actorType}
          />
        )}
      </div>
    </CoinBalanceProvider>
  );
}
