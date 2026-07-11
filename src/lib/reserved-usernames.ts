// Top-level app route names that must not be claimable as a username, since
// public profiles live at examodels.com/{username} and would collide.
// Single source of truth — keep in sync with the route folders under src/app.
export const RESERVED_PATHS = [
  // System / infrastructure
  'api', 'auth', '_next', 'favicon.ico', 'go', 'unsubscribe', 'error', 'media',
  // Auth & onboarding
  'signin', 'signup', 'claim', 'forgot-password', 'pending-approval',
  'onboarding', 'model-onboarding',
  // Dashboard & admin
  'admin', 'analytics', 'bids', 'bookings', 'brands', 'campaigns', 'chats',
  'coins', 'comp-card', 'contracts', 'dashboard', 'earnings', 'favorites',
  'followers', 'my-bids', 'my-content', 'offers', 'settings', 'shop',
  'studio', 'verify-identity', 'wallet',
  // Public pages
  'academy', 'brand', 'call', 'comp-card-creator', 'designers', 'events',
  'exadolls', 'fan', 'for-models', 'fresh-digitals', 'gigs', 'guidelines',
  'modelo', 'models', 'privacy', 'rates', 'roster', 'runway-workshop',
  'schedule-call', 'shows', 'sponsors', 'spotlight', 'swimcrown',
  'swimwear-content', 'terms', 'travel', 'tv', 'workshops',
  // Legacy routes & speculative reservations
  'apply', 'book', 'booking', 'boost', 'content', 'explore', 'featured',
  'leaderboard', 'messages', 'notifications', 'opportunities', 'profile',
  'search', 'trending', 'popular', 'new', 'hot', 'top', 'best',
];

// Allowed username characters: lowercase letters, digits, underscore, dot.
export const USERNAME_REGEX = /^[a-z0-9._]+$/;
