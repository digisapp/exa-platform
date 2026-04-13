import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Crown,
  Users,
  PartyPopper,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { SuccessActions } from "@/components/swimcrown/SuccessActions";

export const metadata: Metadata = {
  title: "You're In! | SwimCrown | EXA",
  description:
    "Congratulations! You have successfully entered the SwimCrown competition.",
};

export default async function SwimCrownEntrySuccessPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navbarUser = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let modelName = "";
  let username = "";

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

    if (actor?.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("profile_photo_url, first_name, last_name, username")
        .eq("user_id", user.id)
        .single();
      avatarUrl = model?.profile_photo_url || "";
      modelName = `${model?.first_name || ""} ${model?.last_name || ""}`.trim();
      username = model?.username || "";
    }

    navbarUser = {
      id: user.id,
      email: user.email || "",
      avatar_url: avatarUrl,
      name: modelName,
      username,
    };
  }

  const votingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://exa.ai"}/swimcrown/contestants`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1f35] to-[#0a1628]">
      <Navbar user={navbarUser} actorType={actorType} />

      <main className="container mx-auto px-4 py-16 pb-24 md:pb-16">
        <Card className="max-w-xl mx-auto p-8 sm:p-10 border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-[#0d1f35]/80 text-center relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[300px] w-[400px] rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-3xl" />
          </div>

          <div className="relative">
            {/* Celebration icons */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-teal-400 animate-pulse" />
              <PartyPopper className="h-10 w-10 text-teal-400" />
              <Sparkles className="h-6 w-6 text-teal-400 animate-pulse" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-black mb-3">
              <span className="bg-gradient-to-r from-teal-300 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                You&apos;re In!
              </span>
            </h1>

            <p className="text-lg text-muted-foreground mb-2">
              Congratulations{modelName ? `, ${modelName}` : ""}!
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Your SwimCrown entry has been confirmed. You are now officially a
              contestant in the competition. Start sharing your voting link to
              collect votes and climb the leaderboard.
            </p>

            {/* Crown icon */}
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
              <Crown className="h-10 w-10 text-amber-400" />
            </div>



            {/* Action buttons */}
            <div className="space-y-3">
              <SuccessActions votingUrl={votingUrl} />

              <Link href="/swimcrown/contestants" className="block">
                <Button
                  variant="outline"
                  className="w-full border-teal-500/30 text-teal-300 hover:bg-teal-500/10 py-5"
                  size="lg"
                >
                  <Users className="mr-2 h-5 w-5" />
                  View All Contestants
                </Button>
              </Link>

              <Link href="/dashboard" className="block">
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-white py-5"
                  size="lg"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Tips */}
            <div className="mt-8 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 text-left">
              <h3 className="text-sm font-bold text-teal-300 mb-2">
                Tips to win votes:
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-3 w-3 text-teal-400 mt-0.5 shrink-0" />
                  Share your voting link on Instagram, TikTok, and Twitter
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-3 w-3 text-teal-400 mt-0.5 shrink-0" />
                  Ask friends and family to create EXA accounts and vote
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="h-3 w-3 text-teal-400 mt-0.5 shrink-0" />
                  Post daily updates to keep your supporters engaged
                </li>
              </ul>
            </div>
          </div>
        </Card>
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
  );
}
