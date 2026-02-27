import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountdownTimer } from "@/components/auctions";
import { formatCoins, coinsToFanUsd, formatUsd } from "@/lib/coin-config";
import {
  Gavel,
  Trophy,
  Clock,
  Coins,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

export const metadata = { title: "My Bids | EXA Models" };

export default async function MyBidsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "fan") redirect("/dashboard");

  const adminClient = createServiceRoleClient() as any;

  // Get all bids for this fan with auction + model info
  const { data: bids } = await adminClient
    .from("auction_bids")
    .select(
      `
      id, auction_id, amount, status, created_at,
      auction:auctions!auction_bids_auction_id_fkey (
        id, title, category, status, current_bid, starting_price, ends_at, winner_id,
        model:models!auctions_model_id_fkey (
          first_name, last_name, username, profile_photo_url
        )
      )
    `
    )
    .eq("bidder_id", actor.id)
    .order("created_at", { ascending: false });

  // Deduplicate by auction — keep the most relevant bid per auction
  // Priority: winning > active > outbid > others; then highest amount
  const statusPriority: Record<string, number> = { winning: 3, active: 2, outbid: 1 };
  const auctionMap = new Map<string, any>();

  for (const bid of bids || []) {
    if (!bid.auction) continue;
    const existing = auctionMap.get(bid.auction_id);
    if (!existing) {
      auctionMap.set(bid.auction_id, bid);
    } else {
      const newP = statusPriority[bid.status] ?? 0;
      const existP = statusPriority[existing.status] ?? 0;
      if (newP > existP || (newP === existP && bid.amount > existing.amount)) {
        auctionMap.set(bid.auction_id, bid);
      }
    }
  }

  const allBids = Array.from(auctionMap.values());

  // Split into tabs
  const activeBids = allBids.filter((b) => b.auction?.status === "active");
  const wonBids = allBids.filter(
    (b) => b.auction?.status === "sold" && b.auction?.winner_id === actor.id
  );
  const pastBids = allBids.filter(
    (b) =>
      b.auction?.status !== "active" &&
      !(b.auction?.status === "sold" && b.auction?.winner_id === actor.id)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Bids</h1>
        <p className="text-muted-foreground">Auctions you&apos;re participating in</p>
      </div>

      <Tabs defaultValue="active" className="space-y-5">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Active
            {activeBids.length > 0 && (
              <Badge className="ml-1 bg-violet-500/20 text-violet-400 text-[10px] px-1.5 py-0">
                {activeBids.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="won" className="gap-1.5">
            <Trophy className="h-4 w-4" />
            Won
            {wonBids.length > 0 && (
              <Badge className="ml-1 bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0">
                {wonBids.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <Gavel className="h-4 w-4" />
            Past
          </TabsTrigger>
        </TabsList>

        {/* Active Bids */}
        <TabsContent value="active">
          {activeBids.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-10 w-10 text-muted-foreground/30" />}
              title="No active bids"
              description="Browse live auctions and place your first bid."
              action={{ href: "/bids", label: "Browse Auctions" }}
            />
          ) : (
            <div className="space-y-3">
              {activeBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} actorId={actor.id} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Won Auctions */}
        <TabsContent value="won">
          {wonBids.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-10 w-10 text-muted-foreground/30" />}
              title="No wins yet"
              description="Keep bidding — your first win could be right around the corner!"
              action={{ href: "/bids", label: "Browse Auctions" }}
            />
          ) : (
            <div className="space-y-3">
              {wonBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} actorId={actor.id} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Past Bids */}
        <TabsContent value="past">
          {pastBids.length === 0 ? (
            <EmptyState
              icon={<Gavel className="h-10 w-10 text-muted-foreground/30" />}
              title="No past bids"
              description="Your bid history will appear here once auctions end."
            />
          ) : (
            <div className="space-y-3">
              {pastBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} actorId={actor.id} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Bid Card ────────────────────────────────────────────────────────────────

function BidCard({ bid, actorId }: { bid: any; actorId: string }) {
  const auction = bid.auction;
  if (!auction) return null;

  const model = auction.model;
  const modelName = model
    ? `${model.first_name || ""} ${model.last_name || ""}`.trim() || model.username
    : "Model";

  const currentPrice = auction.current_bid || auction.starting_price;
  const isActive = auction.status === "active";
  const isWon = auction.status === "sold" && auction.winner_id === actorId;
  const isWinning = bid.status === "winning" && isActive;
  const isOutbid = bid.status === "outbid" && isActive;

  const categoryLabel = auction.category
    ? auction.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : "Auction";

  const endedDate = !isActive
    ? new Date(auction.ends_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/bids/${auction.id}`}
      className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all"
    >
      {/* Avatar */}
      <Avatar
        className={`h-12 w-12 shrink-0 border-2 ${
          isWon
            ? "border-amber-400"
            : isWinning
            ? "border-violet-400"
            : isOutbid
            ? "border-red-400/60"
            : "border-zinc-700"
        }`}
      >
        <AvatarImage src={model?.profile_photo_url || undefined} />
        <AvatarFallback className="bg-zinc-800 text-zinc-300 text-sm">
          {modelName[0] || "?"}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{auction.title}</p>
          {isWon && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 shrink-0">
              <Trophy className="h-3 w-3 mr-1" />
              Won
            </Badge>
          )}
          {isWinning && (
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 shrink-0">
              Winning
            </Badge>
          )}
          {isOutbid && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 shrink-0">
              <TrendingDown className="h-3 w-3 mr-1" />
              Outbid
            </Badge>
          )}
        </div>

        <p className="text-xs text-zinc-500 mt-0.5 truncate">
          {modelName} · {categoryLabel}
        </p>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {/* Fan's bid */}
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            Your bid:{" "}
            <span className="text-amber-400 font-medium">
              {formatCoins(bid.amount)} ({formatUsd(coinsToFanUsd(bid.amount))})
            </span>
          </span>

          {/* Current price if different */}
          {isActive && currentPrice !== bid.amount && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Coins className="h-3 w-3" />
              Current: {formatCoins(currentPrice)}
            </span>
          )}

          {/* Countdown or ended date */}
          {isActive ? (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              <CountdownTimer endsAt={auction.ends_at} compact />
            </span>
          ) : endedDate ? (
            <span className="text-xs text-zinc-600">Ended {endedDate}</span>
          ) : null}
        </div>
      </div>

      <ArrowRight className="h-4 w-4 text-zinc-600 shrink-0" />
    </Link>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <p className="font-semibold text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">{description}</p>
      {action && (
        <Button asChild variant="outline" size="sm">
          <Link href={action.href}>
            <Gavel className="h-4 w-4 mr-2" />
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  );
}
