/**
 * Tip & Gift Configuration
 *
 * Single source of truth for every tip surface (chat TipDialog, profile
 * dialog, video call overlay) and the /api/tips route.
 *
 * Gifts are NOT a separate economy — a gift is a coin tip with a named
 * emoji presentation. The coin ledger, transfer_coins RPC, and payout math
 * are identical to a plain tip; only the dialog tile and the chat
 * celebration card render differently. Keep it that way: no gift catalog
 * tables, no inventory.
 *
 * Tiering intent (owner direction, 2026-07-15): "Super Tip" stays the
 * premium 100+ brand; gifts exist so small tippers (10–50 coins) have a
 * fun thing to send in PRIVATE contexts instead of tipping nothing. The
 * Live Wall keeps its own separate mechanics (1-coin micro-tip, 100+
 * public announcements) — don't wire gifts into it.
 */

export interface TipGift {
  key: string;
  emoji: string;
  label: string;
  amount: number;
}

// Keys are stored in coin_transactions metadata and validated by the tips
// API — treat as stable identifiers, never rename.
export const TIP_GIFT_KEYS = ["rose", "coffee", "champagne"] as const;
export type TipGiftKey = (typeof TIP_GIFT_KEYS)[number];

export const TIP_GIFTS: TipGift[] = [
  { key: "rose", emoji: "🌹", label: "Rose", amount: 10 },
  { key: "coffee", emoji: "☕", label: "Coffee", amount: 25 },
  { key: "champagne", emoji: "🍾", label: "Champagne", amount: 50 },
];

export const SUPER_TIP_AMOUNTS = [100, 250, 500, 1000];

// Custom-amount floor for tip dialogs. 1-coin tips stay a Live-Wall-only
// mechanic; the server floor on /api/tips remains 1 for that reason.
export const MIN_CUSTOM_TIP = 10;
export const MAX_TIP = 100000;

export function giftByKey(key: string | null | undefined): TipGift | undefined {
  if (!key) return undefined;
  return TIP_GIFTS.find((g) => g.key === key);
}

/**
 * System-message content written by /api/tips into the conversation.
 * MessageBubble parses these back with parseTipMessage — builder and parser
 * live together so the formats can't drift apart.
 */
export function formatTipMessage(senderName: string, amount: number, gift?: TipGift): string {
  return gift
    ? `${gift.emoji} ${senderName} sent a ${gift.label} (${amount} coins)!`
    : `💝 ${senderName} sent a ${amount} coin tip!`;
}

const TIP_MESSAGE_REGEX = /^💝\s*(.+?) sent a (\d+) coin tip!$/;
const GIFT_MESSAGE_REGEX = new RegExp(
  `^(\\S+)\\s+(.+?) sent a (${TIP_GIFTS.map((g) => g.label).join("|")}) \\((\\d+) coins\\)!$`
);

export interface ParsedTipMessage {
  senderName: string;
  amount: number;
  gift?: TipGift;
}

export function parseTipMessage(content: string | null): ParsedTipMessage | null {
  if (!content) return null;

  const tipMatch = content.match(TIP_MESSAGE_REGEX);
  if (tipMatch) {
    const amount = parseInt(tipMatch[2], 10);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { senderName: tipMatch[1], amount };
  }

  const giftMatch = content.match(GIFT_MESSAGE_REGEX);
  if (giftMatch) {
    const amount = parseInt(giftMatch[4], 10);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const gift = TIP_GIFTS.find((g) => g.label === giftMatch[3]);
    return { senderName: giftMatch[2], amount, gift };
  }

  return null;
}
