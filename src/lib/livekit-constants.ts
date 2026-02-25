/**
 * Cost per minute for video calls (in coins)
 */
export const CALL_COST_PER_MINUTE = 10;

/**
 * Minimum coin balance required to start a call
 */
export const MIN_CALL_BALANCE = 10;

/**
 * Calculate coins to charge based on call duration
 */
export function calculateCallCost(durationSeconds: number): number {
  const minutes = Math.ceil(durationSeconds / 60);
  return minutes * CALL_COST_PER_MINUTE;
}
