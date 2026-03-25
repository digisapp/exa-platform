import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { EntryForm } from "@/components/swimcrown/EntryForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, LogIn, UserX, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Enter SwimCrown | EXA",
  description:
    "Enter the SwimCrown global swim model competition. Choose your tier and compete for the crown at Miami Swim Week 2026.",
};

export default async function SwimCrownEntryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build navbar data
  let navbarUser = null;
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;

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
        .select("profile_photo_url, first_name, username")
        .eq("user_id", user.id)
        .single();
      avatarUrl = model?.profile_photo_url || "";
      name = model?.first_name || "";
      username = model?.username || "";
    } else if (actor?.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("avatar_url, display_name, username")
        .eq("user_id", user.id)
        .single();
      avatarUrl = fan?.avatar_url || "";
      name = fan?.display_name || "";
      username = fan?.username || "";
    } else if (actor?.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("logo_url, company_name")
        .eq("user_id", user.id)
        .single();
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

  // Check eligibility
  const notLoggedIn = !user;
  const isModel = actorType === "model";

  // Check if already entered current competition
  let alreadyEntered = false;
  let modelId: string | null = null;

  if (user && isModel) {
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    modelId = model?.id || null;

    if (modelId) {
      // Look for active competition
      const { data: competition } = await (supabase as any)
        .from("swimcrown_competitions")
        .select("id")
        .eq("status", "accepting_entries")
        .single();

      if (competition) {
        const { data: existing } = await (supabase as any)
          .from("swimcrown_contestants")
          .select("id")
          .eq("competition_id", competition.id)
          .eq("model_id", modelId)
          .single();

        alreadyEntered = !!existing;
      }
    }
  }

  const renderContent = () => {
    if (notLoggedIn) {
      return (
        <Card className="max-w-lg mx-auto p-8 border-zinc-800 bg-zinc-900/50 text-center">
          <LogIn className="mx-auto h-12 w-12 text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Sign In Required
          </h2>
          <p className="text-muted-foreground mb-6">
            You need to be signed in as a model to enter SwimCrown.
          </p>
          <Link href="/sign-in">
            <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold">
              Sign In
            </Button>
          </Link>
        </Card>
      );
    }

    if (!isModel) {
      return (
        <Card className="max-w-lg mx-auto p-8 border-zinc-800 bg-zinc-900/50 text-center">
          <UserX className="mx-auto h-12 w-12 text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Models Only
          </h2>
          <p className="text-muted-foreground mb-6">
            SwimCrown is open to registered models on EXA. Sign up as a model to
            enter the competition.
          </p>
          <Link href="/sign-up">
            <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold">
              Register as a Model
            </Button>
          </Link>
        </Card>
      );
    }

    if (alreadyEntered) {
      return (
        <Card className="max-w-lg mx-auto p-8 border-amber-500/30 bg-amber-500/5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            You&apos;re Already In!
          </h2>
          <p className="text-muted-foreground mb-6">
            You have already entered the current SwimCrown competition. Share
            your page and collect votes!
          </p>
          <Link href="/swimcrown/contestants">
            <Button
              variant="outline"
              className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              View Contestants
            </Button>
          </Link>
        </Card>
      );
    }

    return <EntryForm />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-black/40">
      <Navbar user={navbarUser} actorType={actorType} />

      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="relative inline-flex items-center justify-center gap-2">
            <Crown className="h-7 w-7 text-amber-400" />
            <span className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Enter SwimCrown
            </span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Choose your entry tier and compete for the crown
          </p>
        </div>

        {renderContent()}
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
