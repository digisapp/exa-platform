/**
 * Bust/waist/hips are free-text columns, so stored values drift between
 * `34"`, "34”", "34in", "34 inches", and bare "34". Normalize the common
 * inch spellings to `34"` for display; anything unrecognized (cm values,
 * fraction sizes, prose) passes through untouched.
 *
 * Bare numbers over 60 are assumed to be centimeters (no body measurement
 * reaches 60 inches here, and LATAM signups enter cm) and pass through
 * unmarked rather than getting a wrong inch mark stamped on them. An
 * explicit inch unit is always honored.
 */
export function formatInches(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const match = value
    .trim()
    .match(
      /^(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s*("|”|″|''|in\.?|inch(?:es)?)?$/i
    );
  if (!match) return value;
  const number = match[1].replace(/\s*([-–])\s*/, "$1");
  const hasExplicitUnit = Boolean(match[2]);
  const largest = Math.max(...number.split(/[-–]/).map(Number));
  if (!hasExplicitUnit && largest > 60) return value;
  return `${number}"`;
}
