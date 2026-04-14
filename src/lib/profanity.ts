/**
 * Lightweight profanity filter.
 * Uses a basic word list + regex matching. No external dependencies.
 */

const PROFANE_WORDS = [
  "ass","asshole","bastard","bitch","bollocks","bullshit","cock","crap",
  "cunt","damn","dick","dildo","douche","fag","faggot","fuck","goddamn",
  "hell","hoe","jerk","motherfucker","nigga","nigger","piss","prick",
  "pussy","retard","shit","slut","twat","whore","wanker",
];

// Build regex that matches whole words (case-insensitive)
const pattern = new RegExp(
  `\\b(${PROFANE_WORDS.join("|")})\\b`,
  "gi"
);

/** Returns true if the text contains profane language */
export function isProfane(text: string): boolean {
  return pattern.test(text);
}

/** Returns the text with profane words replaced by asterisks */
export function cleanMessage(text: string): string {
  return text.replace(pattern, (match) => "*".repeat(match.length));
}
