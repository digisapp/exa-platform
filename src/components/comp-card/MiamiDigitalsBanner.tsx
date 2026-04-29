"use client";

import { Camera, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DigisInlineLink } from "@/components/shows/digis-links";

export function MiamiDigitalsBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/5 via-black/30 to-violet-500/5 p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="h-4 w-4 text-pink-400 shrink-0" />
            <h3 className="text-sm font-bold truncate">
              Need Fresh Digis?
            </h3>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            New digitals shot by EXA Photographer + Printed Comp Cards
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-pink-400" />
              Sun, May 24th
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-pink-400" />
              Miami Beach
            </span>
          </div>
        </div>

        {/* Right: Price + CTA */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5 shrink-0">
          <div className="sm:text-right">
            <span className="text-lg font-black">$125</span>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold text-xs h-8 px-4"
          >
            <Link href="/fresh-digitals">
              Reserve Spot
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
          <p className="text-[10px] text-emerald-400/70 font-medium">
            FREE with{" "}
            <DigisInlineLink className="underline hover:text-emerald-300 transition-colors">
              Digis.cc
            </DigisInlineLink>{" "}
            account
          </p>
        </div>
      </div>
    </div>
  );
}
