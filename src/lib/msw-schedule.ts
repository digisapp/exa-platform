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
  id: string;         // unique key for React rendering
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
    id: "mon-25-casting",
    day: "Monday",
    dayShort: "Mon",
    date: "May 25",
    dateNum: "25",
    title: "Casting Call Day Party",
    description:
      "11am–4pm · Pool, sun, and music as 600+ models cast for the EXA Shows.",
    highlight: true,
    badge: null,
  },
  {
    id: "tue-26-opening",
    day: "Tuesday",
    dayShort: "Tue",
    date: "May 26",
    dateNum: "26",
    title: "Opening Show",
    description:
      "Doors 6pm · Show 7pm · The grand opening runway show of Miami Swim Week 2026.",
    highlight: true,
    badge: null,
  },
  {
    id: "wed-27-day2",
    day: "Wednesday",
    dayShort: "Wed",
    date: "May 27",
    dateNum: "27",
    title: "Signature Runway",
    description:
      "Doors 6pm · Show 7pm · Runway show featuring emerging and established swimwear designers.",
    highlight: false,
    badge: null,
  },
  {
    id: "thu-28-signature",
    day: "Thursday",
    dayShort: "Thu",
    date: "May 28",
    dateNum: "28",
    title: "Signature Runway",
    description:
      "Doors 6pm · Show 7pm · Runway show featuring global designers and brand activations.",
    highlight: false,
    badge: null,
  },
  {
    id: "fri-29-signature",
    day: "Friday",
    dayShort: "Fri",
    date: "May 29",
    dateNum: "29",
    title: "Signature Runway",
    description:
      "Doors 6pm · Show 7pm · Runway show featuring designer collections and brand activations.",
    highlight: false,
    badge: null,
  },
  {
    id: "sat-30-afternoon",
    day: "Saturday",
    dayShort: "Sat",
    date: "May 30",
    dateNum: "30",
    title: "Afternoon Show",
    description:
      "Show 2pm · Daytime runway showcase featuring emerging and established designers.",
    highlight: true,
    badge: null,
  },
  {
    id: "sat-30-night",
    day: "Saturday",
    dayShort: "Sat",
    date: "May 30",
    dateNum: "30",
    title: "Night Show",
    description:
      "Doors 8pm · Show 9pm · Evening runway show with designer collections and brand activations.",
    highlight: true,
    badge: null,
  },
  {
    id: "sun-31-closing",
    day: "Sunday",
    dayShort: "Sun",
    date: "May 31",
    dateNum: "31",
    title: "Closing Show",
    description:
      "Doors 6pm · Show 7pm · Evening runway show and closing party — the ultimate send-off to Swim Week.",
    highlight: true,
    badge: null,
  },
];

