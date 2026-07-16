/**
 * Bust/waist/hips are free-text columns, so stored values drift between
 * `34"`, "34”", "34in", "34 inches", and bare "34". Normalize the common
 * inch spellings to `34"` for display; anything unrecognized (cm values,
 * fraction sizes, prose) passes through untouched.
 */
export function formatInches(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const match = value
    .trim()
    .match(
      /^(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s*(?:"|”|″|''|in\.?|inch(?:es)?)?$/i
    );
  if (!match) return value;
  return `${match[1].replace(/\s*([-–])\s*/, "$1")}"`;
}
