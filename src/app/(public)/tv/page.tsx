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
  alternates: {
    canonical: "https://www.examodels.com/tv",
  },
  openGraph: {
    title: "EXA TV | EXA Models",
    description:
      "Watch runway shows, backstage footage, and highlights from Miami Swim Week, New York Fashion Week, and more.",
    url: "https://www.examodels.com/tv",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "EXA TV | EXA Models",
    description:
      "Watch runway shows, backstage footage, and highlights from Miami Swim Week, New York Fashion Week, and more.",
  },
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
        <div className="relative bg-gradient-to-br from-violet-950 via-black to-pink-950 pt-16 pb-10 md:pt-20 md:pb-14 overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.4),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(236,72,153,0.4),transparent_50%)]" />
          </div>
          <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative container px-4 md:px-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(236,72,153,0.5)]">
                {TV_VIDEOS.length} VIDEOS
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-semibold mb-2">
              Runway Archive
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-3 drop-shadow-lg flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-pink-500/40 blur-lg opacity-60" />
                <div className="relative p-2 md:p-3 rounded-xl bg-gradient-to-br from-pink-500/25 to-violet-500/25 ring-1 ring-pink-500/40">
                  <Tv className="h-8 w-8 md:h-10 md:w-10 text-pink-300" />
                </div>
              </div>
              <span className="exa-gradient-text">EXA TV</span>
            </h1>
            <p className="text-base md:text-lg text-white/70 max-w-2xl">
              Watch runway shows, backstage footage, and highlights from our
              fashion events.
            </p>
          </div>
        </div>

        <main className="container px-4 md:px-8 py-10">
          <TVGrid videos={TV_VIDEOS} />
        </main>

        {/* Footer */}
        <footer className="relative mt-8 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
          </p>
        </footer>
      </div>
    </CoinBalanceProvider>
  );
}
