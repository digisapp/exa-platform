"use client";

import { useState, useTransition } from "react";
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
  MessageCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const ENDED_STATUSES: AuctionStatus[] = ["ended", "sold", "cancelled", "no_sale"];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ManageBidsClientProps {
  initialAuctions: Auction[];
  loadError: boolean;
}

export function ManageBidsClient({ initialAuctions, loadError }: ManageBidsClientProps) {
  const router = useRouter();
  const auctions = initialAuctions;

  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Auction | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Auction | null>(null);
  const [isRetrying, startRetry] = useTransition();

  const handlePublish = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/publish`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }
      toast.success("Bid published!");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to publish bid");
    }
  };

  const handleDelete = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Bid deleted");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete bid");
    }
  };

  const handleCancel = async (auctionId: string) => {
    setCancellingId(auctionId);
    try {
      const response = await fetch(`/api/auctions/${auctionId}/cancel`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel");
      }
      toast.success("Bid cancelled — all bidders refunded");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel bid");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRepost = async (auction: Auction) => {
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

  const handleMessageWinner = async (auction: Auction) => {
    if (!auction.winner_id) return;
    setMessagingId(auction.id);
    try {
      const response = await fetch("/api/messages/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: auction.winner_id,
          initialMessage: `Congrats on winning "${auction.title}"! Let's sort out the details.`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to open chat");
      router.push(`/chats/${data.conversationId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to open chat with winner");
      setMessagingId(null);
    }
  };

  // Filtered lists
  const activeAuctions  = auctions.filter((a) => a.status === "active");
  const draftAuctions   = auctions.filter((a) => a.status === "draft");
  const endedAuctions   = auctions.filter((a) => ENDED_STATUSES.includes(a.status));

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

  const isFirstRun = !loadError && auctions.length === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ───── Hero header ───── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(255,105,180,0.08) 50%, rgba(0,191,255,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">EXA Bids</p>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              <span className="exa-gradient-text">Your Bids</span>
            </h1>
            <p className="text-xs md:text-sm text-white/60 mt-1">Create and manage your bids.</p>
          </div>
          {!isFirstRun && (
            <Button
              asChild
              className="shrink-0 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_16px_rgba(236,72,153,0.4)] border-0 rounded-full"
            >
              <Link href="/bids/new">
                <Plus className="h-4 w-4 mr-2" />
                New Bid
              </Link>
            </Button>
          )}
        </div>
      </section>

      {loadError ? (
        <div className="flex flex-col items-center gap-4 text-center rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent px-6 py-12">
          <div className="p-3 rounded-2xl bg-red-500/15 ring-1 ring-red-500/30">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Couldn&apos;t load your bids</p>
            <p className="text-sm text-white/60 mt-1">Something went wrong on our end. Give it another try.</p>
          </div>
          <Button
            onClick={() => startRetry(() => router.refresh())}
            disabled={isRetrying}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white border-0 rounded-full"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Retry
          </Button>
        </div>
      ) : isFirstRun ? (
        <FirstBidHero />
      ) : (
        <>
          {/* ───── Analytics ───── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
                  <Gavel className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Live now</p>
                  <p className="text-xl font-bold text-white">{activeAuctions.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-4 hover:border-violet-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
                  <TrendingUp className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Total bids</p>
                  <p className="text-xl font-bold text-white">{totalBids}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 hover:border-amber-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/30">
                  <Coins className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Total earned</p>
                  <p className="text-xl font-bold text-white">{formatUsd(coinsToUsd(totalEarned))}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-4 hover:border-pink-500/50 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/20 ring-1 ring-pink-500/30">
                  <Target className="h-5 w-5 text-pink-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Win rate</p>
                  <p className="text-xl font-bold text-white">
                    {winRate !== null ? `${winRate}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ───── Best sale callout ───── */}
          {bestSale !== null && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <div className="p-2 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40">
                <Trophy className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <span className="text-sm font-semibold text-amber-300">Best sale </span>
                <span className="text-sm text-amber-100/80">
                  — {formatCoins(bestSale)} coins ({formatUsd(coinsToUsd(bestSale))})
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
                emptyMessage="No active bids right now."
                onPublish={handlePublish}
                onDelete={setDeleteTarget}
                onRepost={handleRepost}
                onCancel={setCancelTarget}
                onMessageWinner={handleMessageWinner}
                repostingId={repostingId}
                cancellingId={cancellingId}
                messagingId={messagingId}
              />
            </TabsContent>

            <TabsContent value="drafts">
              <AuctionList
                auctions={draftAuctions}
                emptyMessage="No draft listings."
                onPublish={handlePublish}
                onDelete={setDeleteTarget}
                onRepost={handleRepost}
                onCancel={setCancelTarget}
                onMessageWinner={handleMessageWinner}
                repostingId={repostingId}
                cancellingId={cancellingId}
                messagingId={messagingId}
                showPublish
              />
            </TabsContent>

            <TabsContent value="ended">
              <AuctionList
                auctions={endedAuctions}
                emptyMessage="No past bids yet."
                onPublish={handlePublish}
                onDelete={setDeleteTarget}
                onRepost={handleRepost}
                onCancel={setCancelTarget}
                onMessageWinner={handleMessageWinner}
                repostingId={repostingId}
                cancellingId={cancellingId}
                messagingId={messagingId}
                showRepost
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* ───── Delete draft confirmation ───── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; will be permanently deleted. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => {
                if (deleteTarget) handleDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ───── Cancel bid confirmation ───── */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this Bid?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{cancelTarget?.title}&quot; will end immediately. All bidders will be refunded
              their coins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it live</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500/90 text-white hover:bg-red-500"
              onClick={() => {
                if (cancelTarget) handleCancel(cancelTarget.id);
                setCancelTarget(null);
              }}
            >
              Cancel Bid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FirstBidHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-pink-500/10 p-8 md:p-12">
      <div className="pointer-events-none absolute -top-32 right-0 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="relative max-w-2xl mx-auto text-center space-y-6">
        <div className="mx-auto w-fit p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-1 ring-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.25)]">
          <Gavel className="h-8 w-8 text-pink-300" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="exa-gradient-text">Launch your first Bid</span>
          </h2>
          <p className="text-sm md:text-base text-white/70">
            An EXA Bid is an exclusive offer your fans compete for — a video call, custom
            content, a meet &amp; greet, anything you dream up. Fans bid coins, and the highest
            bidder wins. Coins convert to cash at $0.10 each.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3 text-left">
          <li className="flex items-start gap-2.5 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-violet-300" />
            <span className="text-xs text-white/70">
              <span className="block text-sm font-semibold text-white mb-0.5">You set the terms</span>
              Starting price, duration, and optional Buy Now — you&apos;re in control.
            </span>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <Coins className="h-4 w-4 mt-0.5 shrink-0 text-amber-300" />
            <span className="text-xs text-white/70">
              <span className="block text-sm font-semibold text-white mb-0.5">Fans bid the price up</span>
              A live countdown and outbid alerts keep your top fans competing.
            </span>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <Trophy className="h-4 w-4 mt-0.5 shrink-0 text-emerald-300" />
            <span className="text-xs text-white/70">
              <span className="block text-sm font-semibold text-white mb-0.5">One winner, you earn</span>
              The winning bid lands in your balance when the bid closes.
            </span>
          </li>
        </ul>
        <Button
          asChild
          size="lg"
          className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_24px_rgba(236,72,153,0.45)] border-0 rounded-full px-8"
        >
          <Link href="/bids/new">
            <Plus className="h-5 w-5 mr-2" />
            Create your first Bid
          </Link>
        </Button>
      </div>
    </section>
  );
}

interface AuctionListProps {
  auctions: Auction[];
  emptyMessage: string;
  onPublish: (id: string) => void;
  onDelete: (auction: Auction) => void;
  onRepost: (auction: Auction) => void;
  onCancel: (auction: Auction) => void;
  onMessageWinner: (auction: Auction) => void;
  repostingId: string | null;
  cancellingId: string | null;
  messagingId: string | null;
  showPublish?: boolean;
  showRepost?: boolean;
}

function AuctionList({ auctions, emptyMessage, onPublish, onDelete, onRepost, onCancel, onMessageWinner, repostingId, cancellingId, messagingId, showPublish, showRepost }: AuctionListProps) {
  if (auctions.length === 0) {
    return (
      <div className="text-center py-12">
        <Gavel className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 rounded-full"
        >
          <Link href="/bids/new">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Bid
          </Link>
        </Button>
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
          onMessageWinner={onMessageWinner}
          repostingId={repostingId}
          cancellingId={cancellingId}
          messagingId={messagingId}
          showPublish={showPublish}
          showRepost={showRepost}
        />
      ))}
    </div>
  );
}

interface AuctionRowProps {
  auction: Auction;
  onPublish: (id: string) => void;
  onDelete: (auction: Auction) => void;
  onRepost: (auction: Auction) => void;
  onCancel: (auction: Auction) => void;
  onMessageWinner: (auction: Auction) => void;
  repostingId: string | null;
  cancellingId: string | null;
  messagingId: string | null;
  showPublish?: boolean;
  showRepost?: boolean;
}

function AuctionRow({ auction, onPublish, onDelete, onRepost, onCancel, onMessageWinner, repostingId, cancellingId, messagingId, showPublish, showRepost }: AuctionRowProps) {
  const currentPrice = auction.current_bid || auction.starting_price;
  const catConfig = CATEGORY_CONFIG[auction.category] || CATEGORY_CONFIG.other;
  const CatIcon = catConfig.icon;
  const isReposting = repostingId === auction.id;
  const isCancelling = cancellingId === auction.id;
  const isMessaging = messagingId === auction.id;
  const isEnded = ENDED_STATUSES.includes(auction.status);

  const statusColors: Record<AuctionStatus, string> = {
    draft:     "bg-zinc-500/20 text-zinc-400",
    active:    "bg-green-500/20 text-green-400",
    ended:     "bg-zinc-500/20 text-zinc-400",
    sold:      "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
    no_sale:   "bg-zinc-500/20 text-zinc-400",
  };

  const endedLabel = auction.status === "cancelled"
    ? `Cancelled ${formatDate(auction.updated_at)}`
    : isEnded
      ? `Ended ${formatDate(auction.ends_at)}`
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
                {endedLabel && (
                  <span className="text-xs opacity-60">{endedLabel}</span>
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
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {showPublish && auction.status === "draft" && (
                <Button
                  size="sm"
                  onClick={() => onPublish(auction.id)}
                  className="bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                >
                  Publish
                </Button>
              )}

              {auction.status === "sold" && auction.winner_id && (
                <Button
                  size="sm"
                  onClick={() => onMessageWinner(auction)}
                  disabled={isMessaging}
                  className="bg-gradient-to-r from-amber-500 to-pink-500 text-white"
                >
                  {isMessaging ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Message winner
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
                        onClick={() => onDelete(auction)}
                        className="text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {auction.status !== "draft" && (
                    <DropdownMenuItem asChild>
                      <Link href={`/bids/${auction.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isEnded && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onRepost(auction)} disabled={isReposting}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Repost as Draft
                      </DropdownMenuItem>
                    </>
                  )}
                  {auction.status === "active" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onCancel(auction)}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
