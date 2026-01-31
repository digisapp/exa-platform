"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gem, Sparkles, Clock, Trophy, ArrowRight, Loader2, Heart, Box } from "lucide-react";

interface GameInfo {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  reward: string;
  cooldown: string;
  available: boolean;
  comingSoon?: boolean;
}

export default function GamesPage() {
  const [gemBalance, setGemBalance] = useState<number | null>(null);
  const [modelLifeAvailable, setModelLifeAvailable] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGameData() {
      try {
        const lifeResponse = await fetch("/api/games/model-life");

        if (lifeResponse.ok) {
          const lifeData = await lifeResponse.json();
          setGemBalance(lifeData.gemBalance);
          // Count available activities
          const available = lifeData.activities?.filter((a: any) => a.available).length || 0;
          setModelLifeAvailable(available);
        }
      } catch (error) {
        console.error("Failed to fetch game data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGameData();
  }, []);

  const games: GameInfo[] = [
    {
      id: "catwalk-3d",
      title: "Catwalk 3D",
      description: "Experience the runway in stunning 3D! Walk, pose, and dazzle the paparazzi!",
      icon: <Box className="h-8 w-8" />,
      href: "/games/catwalk-3d",
      reward: "Up to 3x gem multiplier",
      cooldown: "Unlimited",
      available: true,
    },
    {
      id: "model-life",
      title: "Model Life",
      description: "Live your model lifestyle - workout, create content, attend events!",
      icon: <Heart className="h-8 w-8" />,
      href: "/games/model-life",
      reward: "Earn & spend gems",
      cooldown: "Various",
      available: modelLifeAvailable > 0,
    },
    {
      id: "style-clash",
      title: "Style Clash",
      description: "Vote on outfit battles and earn gems for participating!",
      icon: <Trophy className="h-8 w-8" />,
      href: "/games/style-clash",
      reward: "5 gems per vote",
      cooldown: "Unlimited",
      available: false,
      comingSoon: true,
    },
  ];

  return (
    <div className="container px-4 md:px-8 py-8 max-w-6xl mx-auto">
      {/* Header with Gem Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-pink-500" />
            Games
          </h1>
          <p className="text-muted-foreground mt-1">
            Play games to earn gems and unlock rewards!
          </p>
        </div>

        {/* Gem Balance Card */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <Gem className="h-6 w-6 text-cyan-400" />
          <div>
            <p className="text-xs text-muted-foreground">Your Gems</p>
            <p className="text-xl font-bold text-cyan-400">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                gemBalance?.toLocaleString() ?? 0
              )}
            </p>
          </div>
        </div>
      </div>

      {/* What are Gems? */}
      <Card className="mb-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gem className="h-5 w-5 text-cyan-400" />
            What are Gems?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Gems are a fun reward currency you earn by playing games on EXA.
            Collect gems to unlock exclusive badges, enter special giveaways,
            and compete on the leaderboard. Unlike coins, gems are for fun and
            rewards only!
          </p>
        </CardContent>
      </Card>

      {/* Games Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <Card
            key={game.id}
            className={`relative overflow-hidden transition-all ${
              game.comingSoon
                ? "opacity-60"
                : "hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10"
            }`}
          >
            {game.comingSoon && (
              <Badge
                className="absolute top-3 right-3 bg-gradient-to-r from-violet-500 to-purple-500"
              >
                Coming Soon
              </Badge>
            )}

            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 text-pink-500">
                  {game.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{game.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {game.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center gap-4 text-sm mb-4">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Gem className="h-4 w-4" />
                  <span>{game.reward}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{game.cooldown}</span>
                </div>
              </div>

              {game.comingSoon ? (
                <Button disabled className="w-full">
                  Coming Soon
                </Button>
              ) : (
                <Button
                  asChild
                  className={`w-full ${
                    game.available
                      ? "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                      : ""
                  }`}
                  variant={game.available ? "default" : "outline"}
                >
                  <Link href={game.href}>
                    {game.available ? (
                      <>
                        {game.id === "model-life" ? `${modelLifeAvailable} Activities Ready` : "Play Now"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        {game.id === "model-life" ? "Recharging..." : "On Cooldown"}
                      </>
                    )}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How Gems Work */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How Gems Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20 text-pink-500">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Play Games</p>
                <p className="text-sm text-muted-foreground">
                  Walk the runway, complete activities, and vote in battles
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Gem className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Collect Gems</p>
                <p className="text-sm text-muted-foreground">
                  Earn gems based on your performance and participation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Unlock Rewards</p>
                <p className="text-sm text-muted-foreground">
                  Use gems for badges, giveaways, and special perks
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
