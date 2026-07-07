// Top-level app route names that must not be claimable as a username, since
// public profiles live at examodels.com/{username} and would collide.
export const RESERVED_PATHS = [
  'signin', 'signup', 'models', 'gigs', 'dashboard', 'profile', 'messages',
  'leaderboard', 'admin', 'onboarding', 'brands', 'designers', 'media',
  'api', 'auth', '_next', 'favicon.ico', 'wallet', 'content', 'coins',
  'earnings', 'fan', 'opportunities', 'settings', 'notifications', 'search',
  'explore', 'trending', 'popular', 'new', 'hot', 'top', 'best', 'featured',
  'favorites', 'chats', 'claim', 'forgot-password', 'rates', 'book', 'booking',
  'offers', 'boost', 'travel', 'shows', 'events', 'tv', 'terms', 'privacy',
];

// Allowed username characters: lowercase letters, digits, underscore, dot.
export const USERNAME_REGEX = /^[a-z0-9._]+$/;
