"use client";

import Link from "next/link";
import { Menu, Mic2, Play, Ticket, Tv, Users } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileNavSheetProps {
  /** Whether a user session exists — swaps the Sign In CTA for Dashboard. */
  isAuthed?: boolean;
  /** Destination of the dashboard link when authed (admin vs dashboard). */
  dashboardHref?: string;
}

// No Gigs here: castings are members-only (signed-in models reach them via
// their own nav) — this menu is for logged-out visitors.
const NAV_LINKS = [
  { href: "/models", label: "Models", icon: Users },
  { href: "/tour", label: "Tour Dates", icon: Mic2 },
  { href: "/shows", label: "Shows", icon: Ticket },
  { href: "/tv", label: "EXA TV", icon: Tv },
];

/**
 * Mobile-only hamburger menu for the public homepage nav. The inline desktop
 * nav only surfaces EXA TV + Sign In, which leaves logged-out phone users with
 * no path to /models or /shows without scrolling to the footer.
 */
export function MobileNavSheet({ isAuthed = false, dashboardHref = "/dashboard" }: MobileNavSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="md:hidden flex items-center justify-center h-11 w-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-white/70 hover:text-pink-300 shadow-[0_0_0_0_rgba(236,72,153,0)] hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[280px] bg-[#120a24]/95 backdrop-blur-xl border-l border-violet-500/30 text-white"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-white">
            <span className="exa-gradient-text text-lg font-bold tracking-wide">EXA</span>
            <span className="sr-only">Navigation menu</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <SheetClose asChild key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-white/80 hover:text-white hover:bg-white/5 border border-transparent hover:border-pink-500/30 transition-all"
              >
                <Icon className="h-5 w-5 text-pink-300" />
                {label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto px-4 pb-6">
          {isAuthed ? (
            <SheetClose asChild>
              <Link
                href={dashboardHref}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-pink-500/25 hover:opacity-90 transition-opacity"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Dashboard
              </Link>
            </SheetClose>
          ) : (
            <SheetClose asChild>
              <Link
                href="/signin"
                className="flex items-center justify-center w-full px-5 py-3 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-pink-500/25 hover:opacity-90 transition-opacity"
              >
                Sign In
              </Link>
            </SheetClose>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
