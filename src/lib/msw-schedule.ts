/**
 * Miami Swim Week 2026 — shared schedule data.
 *
 * Used by both the public sponsor page (/sponsors/miami-swim-week) and the
 * public show landing page (/shows/miami-swim-week-2026) so the week is
 * always described identically across the site.
 *
 * If you update show names, times, or badges, change them here once.
 */

export interface MSWScheduleEntry {
  day: string;        // "Monday"
  dayShort: string;   // "Mon"
  date: string;       // "May 25"
  dateNum: string;    // "25"
  title: string;      // "Casting Call Day Party"
  description: string;
  highlight: boolean; // true for marquee nights
  badge: string | null;
}

export const MSW_2026_SCHEDULE: MSWScheduleEntry[] = [
  {
    day: "Monday",
    dayShort: "Mon",
    date: "May 25",
    dateNum: "25",
    title: "Casting Call Day Party",
    description:
      "11am–4pm · Pool, sun, and music as 600+ models cast for the week. Open to the public — ticketed entry + VIP bottle tables.",
    highlight: true,
    badge: "Ticketed · 600+ Models",
  },
  {
    day: "Tuesday",
    dayShort: "Tue",
    date: "May 26",
    dateNum: "26",
    title: "Opening Show",
    description:
      "Doors 6pm · Show 7pm · The grand opening runway show of Miami Swim Week 2026.",
    highlight: true,
    badge: "Opening Night",
  },
  {
    day: "Wednesday",
    dayShort: "Wed",
    date: "May 27",
    dateNum: "27",
    title: "Day 2 Show",
    description:
      "Doors 6pm · Show 7pm · Runway show featuring emerging and established swimwear designers.",
    highlight: false,
    badge: null,
  },
  {
    day: "Thursday",
    dayShort: "Thu",
    date: "May 28",
    dateNum: "28",
    title: "Sunset Beach Show",
    description:
      "Doors 6pm · Show 7pm · Daytime Emerging Designers showcase, plus our iconic sand runway at sunset.",
    highlight: true,
    badge: "Beach Runway",
  },
  {
    day: "Friday",
    dayShort: "Fri",
    date: "May 29",
    dateNum: "29",
    title: "Signature Runway",
    description:
      "Doors 6pm · Show 7pm · Runway show plus VIP cocktail hour and brand activations.",
    highlight: false,
    badge: null,
  },
  {
    day: "Saturday",
    dayShort: "Sat",
    date: "May 30",
    dateNum: "30",
    title: "Signature Runway",
    description:
      "Doors 6pm · Show 7pm · Runway show featuring designer collections and brand activations.",
    highlight: false,
    badge: null,
  },
  {
    day: "Sunday",
    dayShort: "Sun",
    date: "May 31",
    dateNum: "31",
    title: "Pool Vibes Closing Show",
    description:
      "Doors 6pm · Show 7pm · Poolside closing runway show, DJ set, and after party — the ultimate send-off to Swim Week.",
    highlight: true,
    badge: "Closing Party",
  },
];

/**
 * One-line descriptor used above the schedule in multiple places.
 * Keep this phrasing in sync with the rest of the MSW messaging.
 */
export const MSW_2026_RUNWAY_NOTE =
  "Every evening show features global designers and 100+ models on the runway.";

/**
 * Ticket tier summary used wherever the schedule is shown so fans and
 * sponsors see the same structure at a glance.
 */
export const MSW_2026_TICKETING_NOTE =
  "Ticketing: VIP Bottle Tables (seats 5, upsize to 10 · 1st row included) · 1st / 2nd / 3rd Row Seating · GA Standing";
