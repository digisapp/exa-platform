// Auction Types

export type AuctionStatus = 'draft' | 'active' | 'ended' | 'sold' | 'cancelled' | 'no_sale';
export type BidStatus = 'active' | 'outbid' | 'winning' | 'won' | 'lost' | 'refunded';
export type AuctionCategory = 'video_call' | 'custom_content' | 'meet_greet' | 'shoutout' | 'experience' | 'other';

export const AUCTION_CATEGORIES: { value: AuctionCategory; label: string }[] = [
  { value: 'video_call', label: 'Video Call' },
  { value: 'custom_content', label: 'Custom Content' },
  { value: 'meet_greet', label: 'Meet & Greet' },
  { value: 'shoutout', label: 'Shoutout' },
  { value: 'experience', label: 'Experience' },
  { value: 'other', label: 'Other' },
];

export interface Auction {
  id: string;
  model_id: string;
  title: string;
  description: string | null;
  deliverables: string | null;
  cover_image_url: string | null;
  category: AuctionCategory;
  starting_price: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  current_bid: number | null;
  bid_count: number;
  ends_at: string;
  original_end_at: string;
  status: AuctionStatus;
  winner_id: string | null;
  allow_auto_bid: boolean;
  anti_snipe_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  max_auto_bid: number | null;
  status: BidStatus;
  is_buy_now: boolean;
  escrow_amount: number;
  escrow_released_at: string | null;
  created_at: string;
}

export interface AuctionWatchlist {
  id: string;
  auction_id: string;
  actor_id: string;
  notify_outbid: boolean;
  notify_ending: boolean;
  created_at: string;
}

// Extended types with relations
export interface AuctionWithModel extends Auction {
  model?: {
    id: string;
    display_name: string | null;
    profile_image_url: string | null;
    slug: string | null;
    user_id: string;
  };
}

export interface AuctionWithDetails extends AuctionWithModel {
  watchlist_count?: number;
  is_watching?: boolean;
  highest_bidder?: {
    id: string;
    display_name: string | null;
    profile_image_url: string | null;
  };
}

export interface BidWithBidder extends AuctionBid {
  bidder?: {
    id: string;
    display_name: string | null;
    profile_image_url: string | null;
    type: string;
  };
}

// API Request Types
export interface CreateAuctionRequest {
  title: string;
  description?: string;
  deliverables?: string;
  cover_image_url?: string;
  category?: AuctionCategory;
  starting_price: number;
  reserve_price?: number;
  buy_now_price?: number;
  ends_at: string;
  allow_auto_bid?: boolean;
  anti_snipe_minutes?: number;
}

export interface UpdateAuctionRequest {
  title?: string;
  description?: string;
  deliverables?: string;
  cover_image_url?: string;
  category?: AuctionCategory;
  starting_price?: number;
  reserve_price?: number;
  buy_now_price?: number;
  ends_at?: string;
  allow_auto_bid?: boolean;
  anti_snipe_minutes?: number;
}

export interface PlaceBidRequest {
  amount: number;
  max_auto_bid?: number;
}

// API Response Types
export interface PlaceBidResponse {
  success: boolean;
  bid_id: string;
  final_amount: number;
  escrow_deducted: number;
  new_balance: number;
  is_winning: boolean;
  auction_extended: boolean;
  new_end_time?: string;
}

export interface BuyNowResponse {
  success: boolean;
  amount: number;
  new_balance: number;
}

export interface AuctionListResponse {
  auctions: AuctionWithModel[];
  total: number;
  page: number;
  pageSize: number;
}

// Realtime event types
export interface AuctionRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<Auction>;
  old: Partial<Auction>;
}

export interface BidRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<AuctionBid>;
  old: Partial<AuctionBid>;
}

// Filter/sort options
export type AuctionSortOption = 'ending_soon' | 'newest' | 'most_bids' | 'price_low' | 'price_high';
export type AuctionFilterStatus = 'all' | 'active' | 'ending_soon' | 'new';

export interface AuctionFilters {
  status?: AuctionFilterStatus;
  model_id?: string;
  min_price?: number;
  max_price?: number;
  has_buy_now?: boolean;
  sort?: AuctionSortOption;
}

// Constants - Import from lib/coin-config.ts for consistency
// Re-exported here for convenience
export { COIN_USD_RATE as COIN_TO_USD_RATE } from "@/lib/coin-config";

export const AUCTION_DEFAULTS = {
  antiSnipeMinutes: 2,
  minBidIncrement: 10, // Minimum coins to outbid
  allowAutoBid: true,
} as const;
