"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Auction, AuctionBid, BidWithBidder } from "@/types/auctions";

interface UseAuctionRealtimeProps<T extends Auction> {
  auctionId: string;
  initialAuction: T;
  initialBids?: BidWithBidder[];
  currentUserId?: string;
  onOutbid?: (newBid: AuctionBid) => void;
  onAuctionUpdate?: (auction: Partial<Auction>) => void;
}

interface UseAuctionRealtimeReturn<T extends Auction> {
  auction: T;
  bids: BidWithBidder[];
  isConnected: boolean;
  refreshBids: () => Promise<void>;
}

export function useAuctionRealtime<T extends Auction>({
  auctionId,
  initialAuction,
  initialBids = [],
  currentUserId,
  onOutbid,
  onAuctionUpdate,
}: UseAuctionRealtimeProps<T>): UseAuctionRealtimeReturn<T> {
  const [auction, setAuction] = useState<T>(initialAuction);
  const [bids, setBids] = useState<BidWithBidder[]>(initialBids);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Track if current user was winning to detect being outbid
  const wasWinningRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if current user was the winning bidder
    if (bids.length > 0 && currentUserId) {
      wasWinningRef.current = bids[0]?.bidder?.id === currentUserId;
    }
  }, [bids, currentUserId]);

  // Refresh bids from API
  const refreshBids = useCallback(async () => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/bid`);
      if (response.ok) {
        const data = await response.json();
        setBids(data.bids || []);
      }
    } catch (error) {
      console.error("Failed to refresh bids:", error);
    }
  }, [auctionId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase.channel(`auction:${auctionId}`);
    channelRef.current = channel;

    // Subscribe to auction table changes
    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          const newData = payload.new as Partial<Auction>;
          setAuction((prev) => ({
            ...prev,
            ...newData,
          }));
          onAuctionUpdate?.(newData);
        }
      )
      // Subscribe to new bids
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "auction_bids",
          filter: `auction_id=eq.${auctionId}`,
        },
        async (payload) => {
          const newBid = payload.new as AuctionBid;

          // Refresh full bid list to get bidder info
          await refreshBids();

          // Check if current user was outbid
          if (
            currentUserId &&
            wasWinningRef.current &&
            newBid.bidder_id !== currentUserId
          ) {
            toast.error("You've been outbid!", {
              description: `Someone placed a higher bid of ${newBid.amount} coins`,
              action: {
                label: "Bid Again",
                onClick: () => {
                  // Scroll to bid form
                  document.getElementById("bid-form")?.scrollIntoView({ behavior: "smooth" });
                },
              },
            });
            onOutbid?.(newBid);
          }
        }
      )
      // Subscribe to bid status updates (for escrow releases, etc.)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auction_bids",
          filter: `auction_id=eq.${auctionId}`,
        },
        async () => {
          // Refresh bids when status changes
          await refreshBids();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      channel.unsubscribe();
    };
  }, [auctionId, currentUserId, onAuctionUpdate, onOutbid, refreshBids, supabase]);

  return {
    auction,
    bids,
    isConnected,
    refreshBids,
  };
}

export default useAuctionRealtime;
