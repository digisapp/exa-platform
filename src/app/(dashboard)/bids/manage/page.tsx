"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Auction, AuctionStatus } from "@/types/auctions";

interface AuctionWithStats extends Auction {
  totalBidValue?: number;
}

export default function ManageBidsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [auctions, setAuctions] = useState<AuctionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCount: 0,
    totalBids: 0,
    totalEarned: 0,
  });

  const fetchAuctions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get model profile
    const { data: model } = await (supabase
      .from("models") as any)
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      router.push("/dashboard");
      return;
    }

    // Fetch all auctions by this model
    const { data: auctionsData, error } = await (supabase as any)
      .from("auctions")
      .select("*")
      .eq("model_id", model.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch auctions error:", error);
      toast.error("Failed to load auctions");
      return;
    }

    setAuctions(auctionsData || []);

    // Calculate stats
    const active = (auctionsData || []).filter(
      (a: Auction) => a.status === "active"
    );
    const totalBids = (auctionsData || []).reduce(
      (sum: number, a: Auction) => sum + (a.bid_count || 0),
      0
    );
    const sold = (auctionsData || []).filter(
      (a: Auction) => a.status === "sold"
    );
    const totalEarned = sold.reduce(
      (sum: number, a: Auction) => sum + (a.current_bid || 0),
      0
    );

    setStats({
      activeCount: active.length,
      totalBids,
      totalEarned,
    });

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  const handlePublish = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/publish`, {
        method: "POST",
      });

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
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: "DELETE",
      });

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

  // Filter auctions by status
  const activeAuctions = auctions.filter((a) => a.status === "active");
  const draftAuctions = auctions.filter((a) => a.status === "draft");
  const endedAuctions = auctions.filter((a) =>
    ["ended", "sold", "cancelled", "no_sale"].includes(a.status)
  );

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
          <p className="text-muted-foreground">
            Create and manage your auctions
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
          <Link href="/bids/new">
            <Plus className="h-4 w-4 mr-2" />
            New Auction
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Gavel className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Auctions</p>
                <p className="text-2xl font-bold">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bids</p>
                <p className="text-2xl font-bold">{stats.totalBids}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Coins className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coins Earned</p>
                <p className="text-2xl font-bold">{formatCoins(stats.totalEarned)}</p>
                <p className="text-xs text-muted-foreground">{formatUsd(coinsToUsd(stats.totalEarned))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            Ended ({endedAuctions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <AuctionList
            auctions={activeAuctions}
            emptyMessage="No active auctions. Create one to get started!"
            onPublish={handlePublish}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="drafts">
          <AuctionList
            auctions={draftAuctions}
            emptyMessage="No draft auctions."
            onPublish={handlePublish}
            onDelete={handleDelete}
            showPublish
          />
        </TabsContent>

        <TabsContent value="ended">
          <AuctionList
            auctions={endedAuctions}
            emptyMessage="No ended auctions yet."
            onPublish={handlePublish}
            onDelete={handleDelete}
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
  showPublish?: boolean;
}

function AuctionList({ auctions, emptyMessage, onPublish, onDelete, showPublish }: AuctionListProps) {
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
          showPublish={showPublish}
        />
      ))}
    </div>
  );
}

interface AuctionRowProps {
  auction: AuctionWithStats;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  showPublish?: boolean;
}

function AuctionRow({ auction, onPublish, onDelete, showPublish }: AuctionRowProps) {
  const currentPrice = auction.current_bid || auction.starting_price;

  const statusColors: Record<AuctionStatus, string> = {
    draft: "bg-zinc-500/20 text-zinc-400",
    active: "bg-green-500/20 text-green-400",
    ended: "bg-zinc-500/20 text-zinc-400",
    sold: "bg-amber-500/20 text-amber-400",
    cancelled: "bg-red-500/20 text-red-400",
    no_sale: "bg-zinc-500/20 text-zinc-400",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Thumbnail */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 relative bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
            {auction.cover_image_url ? (
              <Image
                src={auction.cover_image_url}
                alt={auction.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Gavel className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold truncate">{auction.title}</h3>
                <Badge className={statusColors[auction.status]}>
                  {auction.status === "no_sale" ? "No Sale" : auction.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-400" />
                  {formatCoins(currentPrice)}
                </span>
                <span className="flex items-center gap-1">
                  <Gavel className="h-4 w-4" />
                  {auction.bid_count} bids
                </span>
                {auction.status === "active" && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <CountdownTimer endsAt={auction.ends_at} compact />
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
                  className="bg-gradient-to-r from-pink-500 to-violet-500"
                >
                  Publish
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/bids/${auction.id}`}>
                  <ExternalLink className="h-4 w-4 mr-1" />
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
                    <DropdownMenuItem asChild>
                      <Link href={`/bids/${auction.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
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
