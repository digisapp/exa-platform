/**
 * Single gate for the current comp card print & pick-up / digitals event.
 * To run this offer again for a future event, update the labels and
 * windowEndsAt below — every surface (comp card pages, banners, checkout
 * APIs, /fresh-digitals) reads from here.
 * TODO: drive this from event capability columns once the events
 * generalization (project_events_generalization) lands.
 */
export const PRINT_PICKUP_EVENT = {
  name: "Miami Swim Week",
  pickupLocation: "EXA Models HQ, Miami",
  pickupWindowLabel: "May 24–28",
  digitalsDateLabel: "Sun, May 24th",
  digitalsDateLongLabel: "Sunday, May 24th",
  windowEndsAt: "2026-05-29T00:00:00-04:00",
} as const;

export function isPrintPickupWindowOpen(now: Date = new Date()): boolean {
  return now.getTime() < new Date(PRINT_PICKUP_EVENT.windowEndsAt).getTime();
}
