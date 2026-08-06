// Real-world bookings (photoshoots, events, brand work) are quoted in USD and
// close as team-mediated leads (booking_inquiries) — never coin transactions.
// The listed rate is what the client pays; EXA keeps a 20% booking commission
// and the model receives the rest, paid out through the standard payout flow.

export const BOOKING_COMMISSION_RATE = 0.2;

export function modelBookingPayout(rateUsd: number): number {
  return Math.round(rateUsd * (1 - BOOKING_COMMISSION_RATE));
}
