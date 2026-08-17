/**
 * Detector for in-person meetup and off-platform contact requests in DMs.
 *
 * EXA is a virtual-first platform — fans connect with models through on-platform
 * features (chat, live streams, video calls). Requests to meet in person, travel,
 * or move off-platform are not permitted. This module powers a HARD BLOCK: the
 * compose side stops the send and shows the warning dialog, and the message
 * write routes (/api/messages/send, /new, /edit) reject matching fan/brand
 * text with code IN_PERSON_BLOCKED (src/lib/moderation/virtual-first.ts).
 * Models and admins are exempt — they legitimately coordinate shoots and gigs.
 *
 * Tune by editing the word lists below. We err on the side of recall — a false
 * positive costs a fan a rephrase, a false negative costs a model getting
 * pestered to meet up or moved off-platform.
 */

const PATTERNS: RegExp[] = [
  // Any form of "meet" — bare "if we meet", "meet me", "meetup", "meeting".
  // Deliberately broad ("nice to meet you" trips it): asking to meet is the
  // #1 thing this filter exists to stop, and the dialog asks for a rephrase.
  /\bmeet(s|ing|ings|up|ups)?\b/i,
  /\b(in[\s-]*person|in\s*real\s*life|irl)\b/i,
  /\bfly\s+(you|me|us|her|him|out|in|over|down|up)\b/i,
  /\b(fly|flight|plane\s*ticket|airfare)\s*(me|you|out|over|in)\b/i,
  /\b(hotel|airbnb|motel)\s+(room|stay|visit|night|booking)\b/i,
  /\b(come|coming|come\s*over|visit|swing\s*by)\s+(to\s+)?(my|your|the)\s+(place|house|home|apartment|apt|room|city|town|area|studio|hotel)\b/i,
  /\b(my|your)\s+(place|house|apartment|hotel|room|crib)\b/i,
  /\b(art\s*basel|fashion\s*week|coachella|miami|vegas|nyc|new\s*york|la|los\s*angeles)\s+(trip|visit|together)\b/i,
  /\bprivate\s+(party|event|dinner|date)\b/i,
  // Contact exchange: "send/give me your number", "can I get your number",
  // "do you have whatsapp", "drop your snap".
  /\b(send|give|share|drop|text|get|have|got)\s+(me\s+)?(your\s+|ur\s+)?(number|digits|phone|cell|whatsapp|telegram|signal|kik|discord|snap|snapchat|ig|insta|instagram|address|addy)\b/i,
  /\bwhat('|’)?s?\s+(your|ur)\s+(number|digits|phone|cell|whatsapp|telegram|signal|kik|discord|snap|snapchat|ig|insta|instagram)\b/i,
  // "add me (back) on snap adamj088", "follow me on ig"
  /\b(add|follow|hit|message|msg|dm)\s+me\s+(back\s+)?(on|at|@)?\s*(snap|snapchat|ig|insta|instagram|whatsapp|telegram|signal|kik|discord|fb|facebook|onlyfans|of)\b/i,
  // "my snap is adamj088", "my ig: @handle"
  /\b(my|his|her)\s+(snap|snapchat|ig|insta|instagram|whatsapp|telegram|signal|kik|discord)\s*(is|name|handle|user(name)?|:|@)/i,
  /\b(off|outside)[\s-]*platform\b/i,
];

export type InPersonMatch = {
  matched: boolean;
  /** First matched phrase, for logging/auditing. Null if no match. */
  phrase: string | null;
};

/** Detects likely in-person meetup or off-platform contact requests. */
export function detectInPersonRequest(text: string | null | undefined): InPersonMatch {
  if (!text) return { matched: false, phrase: null };
  const normalized = text.normalize("NFKC");
  for (const pattern of PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      return { matched: true, phrase: match[0] };
    }
  }
  return { matched: false, phrase: null };
}

/** User-facing copy for the hard-block dialog on the compose side. */
export const IN_PERSON_WARNING_COPY = {
  title: "Keep it on EXA",
  body:
    "EXA connections are online-only. Messages asking to meet in person or share contact info (phone, Snapchat, Instagram…) can't be sent. Book a video call, join a live, or keep chatting right here instead.",
  dismiss: "Edit message",
} as const;
