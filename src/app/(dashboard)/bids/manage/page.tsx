"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountdownTimer } from "@/components/auctions";
import { coinsToUsd, formatUsd, formatCoins } from "@/lib/coin-config";
import {
  Gavel,
  Plus,
  Loader2,
  Coins,
  Eye,
  Clock,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Trophy,
  Target,
  Video,
  Pen,
  Users,
  Megaphone,
  Star,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Auction, AuctionStatus, AuctionCategory } from "@/types/auctions";

const CATEGORY_CONFIG: Record<AuctionCategory, { icon: typeof Video; color: string; bg: string }> = {
  video_call:     { icon: Video,        color: "text-blue-400",   bg: "bg-blue-500/15" },
  custom_content: { icon: Pen,          color: "text-purple-400", bg: "bg-purple-500/15" },
  meet_greet:     { icon: Users,        color: "text-emerald-400",bg: "bg-emerald-500/15" },
  shoutout:       { icon: Megaphone,    color: "text-orange-400", bg: "bg-orange-500/15" },
  experience:     { icon: Star,         color: "text-pink-400",   bg: "bg-pink-500/15" },
  other:          { icon: MoreHorizontal,color: "text-zinc-400",  bg: "bg-zinc-500/15" },
};

interface AuctionWithStats extends Auction {
  totalBidValue?: number;
}

export default function ManageBidsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [auctions, setAuctions] = useState<AuctionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: model } = await (supabase.from("models") as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) { router.push("/dashboard"); return; }

    const { data: auctionsData, error } = await (supabase as any)
      .from("auctions")
      .select("*")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load auctions"); return; }

    setAuctions(auctionsData || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions]);

  const handlePublish = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/publish`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }
      toast.success("Auction published!");
      fetchAuctions();
    } catch (error: any) {
      toast.error(error.message || "Failed to publish auction");
    }
  };

  const handleDelete = async (auctionId: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    try {
      const response = await fetch(`/api/auctions/${auctionId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Auction deleted");
      fetchAuctions();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete auction");
    }
  };

  const handleCancel = async (auctionId: string) => {
    if (!confirm("Cancel this active bid? All bidders will be fully refunded.")) return;
    setCancellingId(auctionId);
    try {
      const response = await fetch(`/api/auctions/${auctionId}/cancel`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel");
      }
      toast.success("Bid cancelled — all bidders refunded");
      fetchAuctions();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel auction");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRepost = async (auction: AuctionWithStats) => {
    setRepostingId(auction.id);
    try {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 7);

      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: auction.title,
          description: auction.description || undefined,
          deliverables: auction.deliverables || undefined,
          category: auction.category,
          starting_price: auction.starting_price,
          reserve_price: auction.reserve_price || undefined,
          buy_now_price: auction.buy_now_price || undefined,
          ends_at: newEnd.toISOString(),
          allow_auto_bid: auction.allow_auto_bid,
          anti_snipe_minutes: auction.anti_snipe_minutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to repost");
      }

      const { auction: newAuction } = await response.json();
      toast.success("Draft created — review and publish!");
      router.push(`/bids/${newAuction.id}/edit`);
    } catch (error: any) {
      toast.error(error.message || "Failed to repost");
    } finally {
      setRepostingId(null);
    }
  };

  // Filtered lists
  const activeAuctions  = auctions.filter((a) => a.status === "active");
  const draftAuctions   = auctions.filter((a) => a.status === "draft");
  const endedAuctions   = auctions.filter((a) =>
    ["ended", "sold", "cancelled", "no_sale"].includes(a.status)
  );

  // Analytics
  const soldAuctions    = auctions.filter((a) => a.status === "sold");
  const closedAuctions  = auctions.filter((a) => ["ended", "sold", "no_sale"].includes(a.status));
  const totalEarned     = soldAuctions.reduce((s, a) => s + (a.current_bid || 0), 0);
  const totalBids       = auctions.reduce((s, a) => s + (a.bid_count || 0), 0);
  const winRate         = closedAuctions.length > 0
    ? Math.round((soldAuctions.length / closedAuctions.length) * 100)
    : null;
  const bestSale        = soldAuctions.reduce<number | null>((best, a) => {
    const v = a.current_bid || 0;
    return best === null || v > best ? v : best;
  }, null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Bids</h1>
          <p className="text-muted-foreground">Create and manage your auctions</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
          <Link href="/bids/new">
            <Plus className="h-4 w-4 mr-2" />
            New Bid
          </Link>
        </Button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <Gavel className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Live Now</p>
                <p className="text-xl font-bold">{activeAuctions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Bids</p>
                <p className="text-xl font-bold">{totalBids}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">{formatUsd(coinsToUsd(totalEarned))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-xl">
                <Target className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">
                  {winRate !== null ? `${winRate}%` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best sale callout */}
      {bestSale !== null && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20">
          <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <span className="text-sm font-medium text-amber-400">Best sale: </span>
            <span className="text-sm text-amber-300">
              {formatCoins(bestSale)} coins ({formatUsd(coinsToUsd(bestSale))})
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" className="gap-1">
            <Clock className="h-4 w-4" />
            Active ({activeAuctions.length})
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-1">
            <Edit className="h-4 w-4" />
            Drafts ({draftAuctions.length})
          </TabsTrigger>
          <TabsTrigger value="ended" className="gap-1">
            <CheckCircle className="h-4 w-4" />
            Past Bids ({endedAuctions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <AuctionList
            auctions={activeAuctions}
            emptyMessage="No active bids. Create one to get started!"
            onPublish={handlePublish}
            onDelete={handleDelete}
            onRepost={handleRepost}
            onCancel={handleCancel}
            repostingId={repostingId}
            cancellingId={cancellingId}
          />
        </TabsContent>

        <TabsContent value="drafts">
          <AuctionList
            auctions={draftAuctions}
            emptyMessage="No draft listings."
            onPublish={handlePublish}
            onDelete={handleDelete}
            onRepost={handleRepost}
            onCancel={handleCancel}
            repostingId={repostingId}
            cancellingId={cancellingId}
            showPublish
          />
        </TabsContent>

        <TabsContent value="ended">
          <AuctionList
            auctions={endedAuctions}
            emptyMessage="No past bids yet."
            onPublish={handlePublish}
            onDelete={handleDelete}
            onRepost={handleRepost}
            onCancel={handleCancel}
            repostingId={repostingId}
            cancellingId={cancellingId}
            showRepost
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AuctionListProps {
  auctions: AuctionWithStats[];
  emptyMessage: string;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  onRepost: (auction: AuctionWithStats) => void;
  onCancel: (id: string) => void;
  repostingId: string | null;
  cancellingId: string | null;
  showPublish?: boolean;
  showRepost?: boolean;
}

function AuctionList({ auctions, emptyMessage, onPublish, onDelete, onRepost, onCancel, repostingId, cancellingId, showPublish, showRepost }: AuctionListProps) {
  if (auctions.length === 0) {
    return (
      <div className="text-center py-12">
        <Gavel className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {auctions.map((auction) => (
        <AuctionRow
          key={auction.id}
          auction={auction}
          onPublish={onPublish}
          onDelete={onDelete}
          onRepost={onRepost}
          onCancel={onCancel}
          repostingId={repostingId}
          cancellingId={cancellingId}
          showPublish={showPublish}
          showRepost={showRepost}
        />
      ))}
    </div>
  );
}

interface AuctionRowProps {
  auction: AuctionWithStats;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  onRepost: (auction: AuctionWithStats) => void;
  onCancel: (id: string) => void;
  repostingId: string | null;
  cancellingId: string | null;
  showPublish?: boolean;
  showRepost?: boolean;
}

function AuctionRow({ auction, onPublish, onDelete, onRepost, onCancel, repostingId, cancellingId, showPublish, showRepost }: AuctionRowProps) {
  const currentPrice = auction.current_bid || auction.starting_price;
  const catConfig = CATEGORY_CONFIG[auction.category] || CATEGORY_CONFIG.other;
  const CatIcon = catConfig.icon;
  const isReposting = repostingId === auction.id;
  const isCancelling = cancellingId === auction.id;

  const statusColors: Record<AuctionStatus, string> = {
    draft:     "bg-zinc-500/20 text-zinc-400",
    active:    "bg-green-500/20 text-green-400",
    ended:     "bg-zinc-500/20 text-zinc-400",
    sold:      "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
    no_sale:   "bg-zinc-500/20 text-zinc-400",
  };

  const endedAt = ["ended", "sold", "no_sale", "cancelled"].includes(auction.status)
    ? new Date(auction.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Category icon thumbnail */}
          <div className={`w-20 h-20 sm:w-28 sm:h-28 relative flex-shrink-0 flex items-center justify-center ${catConfig.bg}`}>
            <CatIcon className={`h-8 w-8 ${catConfig.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold truncate">{auction.title}</h3>
                <Badge className={`${statusColors[auction.status]} shrink-0`}>
                  {auction.status === "no_sale" ? "No Sale" : auction.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  {formatCoins(currentPrice)}
                  <span className="text-xs opacity-60">({formatUsd(coinsToUsd(currentPrice))})</span>
                </span>
                <span className="flex items-center gap-1">
                  <Gavel className="h-3.5 w-3.5" />
                  {auction.bid_count} {auction.bid_count === 1 ? "bid" : "bids"}
                </span>
                {auction.status === "active" && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <CountdownTimer endsAt={auction.ends_at} compact />
                  </span>
                )}
                {endedAt && (
                  <span className="text-xs opacity-60">Ended {endedAt}</span>
                )}
                {auction.status === "sold" && auction.current_bid && (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Trophy className="h-3.5 w-3.5" />
                    Sold for {formatUsd(coinsToUsd(auction.current_bid))}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {showPublish && auction.status === "draft" && (
                <Button
                  size="sm"
                  onClick={() => onPublish(auction.id)}
                  className="bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                >
                  Publish
                </Button>
              )}

              {showRepost && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRepost(auction)}
                  disabled={isReposting}
                  className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300"
                >
                  {isReposting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Repost
                </Button>
              )}

              <Button size="sm" variant="outline" asChild>
                <Link href={`/bids/${auction.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {auction.status === "draft" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/bids/${auction.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(auction.id)}
                        className="text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {auction.status !== "draft" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/bids/${auction.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onRepost(auction)} disabled={isReposting}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Repost as Draft
                      </DropdownMenuItem>
                      {auction.status === "active" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onCancel(auction.id)}
                            disabled={isCancelling}
                            className="text-red-400"
                          >
                            {isCancelling ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Cancel Bid
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
