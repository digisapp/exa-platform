-- Performance indexes for frequently queried patterns
-- Identified from deep-dive analysis of API routes and dashboard queries

-- Messages: loading conversation history (used in /chats/[id] and activity feed)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);

-- Bookings: listing by client + filtering by status (used in /bookings page)
CREATE INDEX IF NOT EXISTS idx_bookings_client_status
  ON public.bookings(client_id, status);

-- Auctions: model's auctions filtered by status (used in model dashboard)
CREATE INDEX IF NOT EXISTS idx_auctions_model_status
  ON public.auctions(model_id, status);

-- Auctions: listing active auctions sorted by end time (used in /bids browse)
-- Note: idx_auctions_ends_at already exists in 20260206000001_auctions.sql

-- Contracts: fast lookup for brand or model (complement existing indexes)
CREATE INDEX IF NOT EXISTS idx_contracts_status_created
  ON public.contracts(status, created_at DESC);

-- Notifications: unread count per actor (used in navbar badge)
-- Note: idx_notifications_actor already exists in 00001_initial_schema.sql covering (actor_id, read, created_at)

-- Auction watchlist: outbid notification lookups
CREATE INDEX IF NOT EXISTS idx_auction_watchlist_auction_actor
  ON public.auction_watchlist(auction_id, actor_id);
