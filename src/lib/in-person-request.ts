/**
 * Detector for in-person meetup requests in DMs.
 *
 * EXA is a virtual-first platform — fans connect with models through on-platform
 * features (chat, live streams, video calls). Requests to meet in person, travel,
 * or move off-platform are not permitted. This module powers a soft warning on
 * the compose side and an auto-flag on the server side; it does not block sends.
 *
 * Tune by editing the word lists below. We err on the side of recall (catch the
 * obvious patterns) and accept some false positives — the UX is a nudge, not a
 * block, so false positives cost a click, not a message.
 */

const PATTERNS: RegExp[] = [
  /\bmeet\s*(up|in\s*person|irl)\b/i,
  /\b(in[\s-]*person|in\s*real\s*life|irl)\b/i,
  /\bfly\s+(you|me|us|her|him|out|in|over|down|up)\b/i,
  /\b(fly|flight|plane\s*ticket|airfare)\s*(me|you|out|over|in)\b/i,
  /\b(hotel|airbnb|motel)\s+(room|stay|visit|night|booking)\b/i,
  /\b(come|coming|come\s*over|visit|swing\s*by)\s+(to\s+)?(my|your|the)\s+(place|house|home|apartment|apt|room|city|town|area|studio|hotel)\b/i,
  /\b(my|your)\s+(place|house|apartment|hotel|room|crib)\b/i,
  /\b(art\s*basel|fashion\s*week|coachella|miami|vegas|nyc|new\s*york|la|los\s*angeles)\s+(trip|visit|meet|meetup|together)\b/i,
  /\bprivate\s+(party|event|dinner|date|meeting)\b/i,
  /\b(send|give|share|drop|text)\s+(me\s+)?(your\s+)?(number|digits|phone|whatsapp|telegram|snap|snapchat|ig|insta|instagram|address)\b/i,
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

/** Friendly user-facing warning shown when the compose-side detector fires. */
export const IN_PERSON_WARNING_COPY = {
  title: "Keep it on EXA",
  body:
    "EXA connections happen on-platform only. For your safety, please do not request in-person meetups or off-platform contact. Try booking a video call, joining a live, or chatting here instead.",
  cancel: "Edit message",
  confirm: "Send anyway",
} as const;
