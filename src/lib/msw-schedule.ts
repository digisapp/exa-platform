/**
 * EXA's Miami Swim Week 2026 — shared schedule data.
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
      "11am–2pm · Pool, sun, and music as 600+ models cast for the EXA Shows.",
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
    description: "Doors 6pm · Show 7pm",
    highlight: true,
    badge: null,
  },
  {
    id: "wed-27-day2",
    day: "Wednesday",
    dayShort: "Wed",
    date: "May 27",
    dateNum: "27",
    title: "Day 2 Fashion Runway Show",
    description: "Doors 6pm · Show 7pm",
    highlight: false,
    badge: null,
  },
  {
    id: "thu-28-tba",
    day: "Thursday",
    dayShort: "Thu",
    date: "May 28",
    dateNum: "28",
    title: "TBA",
    description: "Details coming soon.",
    highlight: false,
    badge: null,
  },
  {
    id: "fri-29-runway",
    day: "Friday",
    dayShort: "Fri",
    date: "May 29",
    dateNum: "29",
    title: "Fashion Runway Show",
    description: "Doors 6pm · Show 7pm",
    highlight: false,
    badge: null,
  },
  {
    id: "sat-30-early-evening",
    day: "Saturday",
    dayShort: "Sat",
    date: "May 30",
    dateNum: "30",
    title: "Early Evening Show",
    description: "Show 4PM",
    highlight: true,
    badge: null,
  },
  {
    id: "sun-31-tba",
    day: "Sunday",
    dayShort: "Sun",
    date: "May 31",
    dateNum: "31",
    title: "TBA",
    description: "Details coming soon.",
    highlight: false,
    badge: null,
  },
];

