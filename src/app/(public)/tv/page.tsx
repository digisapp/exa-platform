import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { TVGrid } from "@/components/tv/tv-grid";
import { TV_VIDEOS } from "@/lib/tv-videos";
import { Sparkles, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "EXA TV | EXA Models",
  description:
    "Watch runway shows, backstage footage, and highlights from Miami Swim Week, New York Fashion Week, Miami Art Week and more.",
};

export default async function TVPage() {
  const supabase = await createClient();

  // Get current user info for navbar
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

  if (user) {
    const { data: actor } = (await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single()) as {
      data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null;
    };

    actorType = actor?.type || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      const { data: model } = (await supabase
        .from("models")
        .select(
          "id, username, first_name, last_name, profile_photo_url, coin_balance"
        )
        .eq("user_id", user.id)
        .single()) as { data: any };
      profileData = model;
      coinBalance = model?.coin_balance ?? 0;
    } else if (actor?.type === "fan") {
      const { data } = (await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single()) as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const displayName =
    actorType === "fan"
      ? profileData?.display_name
      : profileData?.first_name
        ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
        : profileData?.username || undefined;

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
        <Navbar
          user={
            user
              ? {
                  id: user.id,
                  email: user.email || "",
                  avatar_url:
                    profileData?.profile_photo_url ||
                    profileData?.avatar_url ||
                    undefined,
                  name: displayName,
                  username: profileData?.username || undefined,
                }
              : undefined
          }
          actorType={actorType}
        />

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="aspect-[21/9] md:aspect-[3/1] relative bg-gradient-to-br from-violet-950 via-black to-pink-950">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.4),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.4),transparent_50%)]" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>

          {/* Hero Text Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 pointer-events-none">
            <div className="container px-4 md:px-8">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-pink-500" />
                <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0 px-3 py-1">
                  {TV_VIDEOS.length} Videos
                </Badge>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-lg flex items-center gap-4">
                <Tv className="h-10 w-10 md:h-14 md:w-14 text-pink-500" />
                EXA TV
              </h1>
              <p className="text-lg text-white/60 max-w-2xl">
                Watch runway shows, backstage footage, and highlights from our
                fashion events.
              </p>
            </div>
          </div>
        </div>

        <main className="container px-4 md:px-8 py-10">
          <TVGrid videos={TV_VIDEOS} />
        </main>
      </div>
    </CoinBalanceProvider>
  );
}
