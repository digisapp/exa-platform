// Push notification event vocabulary — single source of truth for the
// push_preferences columns, the /api/push/preferences schema, and the
// Settings toggles (same convention as tip-config.ts for tips).
//
// Keys map 1:1 to BOOLEAN columns on public.push_preferences; adding a key
// requires a migration adding the matching column (default true).
//
// Client-safe: no server-only imports (the Settings UI reads these too).

export const PUSH_EVENT_KEYS = ["calls", "messages", "earnings", "offers"] as const;

export type PushEventKey = (typeof PUSH_EVENT_KEYS)[number];

export type PushPreferences = Record<PushEventKey, boolean>;

// A missing push_preferences row means everything is enabled
export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  calls: true,
  messages: true,
  earnings: true,
  offers: true,
};
