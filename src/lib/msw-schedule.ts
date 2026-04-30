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
  id: string;           // unique key for React rendering
  day: string;          // "Monday"
  dayShort: string;     // "Mon"
  date: string;         // "May 25"
  dateNum: string;      // "25"
  title: string;        // "Casting Call Day Party"
  description: string;
  highlight: boolean;   // true for marquee nights
  badge: string | null;
  digisEventId: string; // live Digis event UUID for ticket link
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
    digisEventId: "527a6def-8fea-41c3-8d83-2c0d63edcee2",
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
    digisEventId: "34393c83-ca92-42f2-9d3e-bfb8988c7807",
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
    digisEventId: "2c080487-6a87-4081-bf33-62a8bbfc35fb",
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
    digisEventId: "4af8fc82-7626-429c-b51d-abfb99463e19",
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
    digisEventId: "1f6425d8-1610-448a-8b89-4c6f514d4dbf",
  },
  {
    id: "sat-30-afternoon",
    day: "Saturday",
    dayShort: "Sat",
    date: "May 30",
    dateNum: "30",
    title: "Afternoon Show",
    description: "Show 4PM",
    highlight: true,
    badge: null,
    digisEventId: "1d92c752-1827-4de5-9a7d-750ef666ce15",
  },
  {
    id: "sat-30-night",
    day: "Saturday",
    dayShort: "Sat",
    date: "May 30",
    dateNum: "30",
    title: "Night Show",
    description: "Show 8PM",
    highlight: true,
    badge: null,
    digisEventId: "5d27f99d-f57f-4ad1-b974-bc73f4ed8ca9",
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
    digisEventId: "c598bd96-efe9-4f0a-af38-5cd602f8094b",
  },
];

