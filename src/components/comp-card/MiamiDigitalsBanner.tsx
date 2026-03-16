"use client";

import Image from "next/image";
import { Camera, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface MiamiDigitalsBannerProps {
  variant?: "dashboard" | "public";
}

export function MiamiDigitalsBanner({ variant = "dashboard" }: MiamiDigitalsBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-black/40 to-violet-500/10 p-6 md:p-8">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        {/* Left: Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-semibold uppercase tracking-wide">
              <Camera className="h-3.5 w-3.5" />
              Live Event
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold">
            EXA Digitals — Miami Beach
          </h3>

          <p className="text-sm text-muted-foreground max-w-lg">
            Get fresh digitals taken by an EXA photographer for Miami Swim Week + 20 comp cards printed in time for castings.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-pink-400" />
              Sunday, May 24th
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-pink-400" />
              Miami Beach <span className="text-xs opacity-60">(exact location TBA)</span>
            </span>
          </div>

          {/* Sponsored by Digis */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground/60">Sponsored by</span>
            <Image
              src="/digis-logo-white.png"
              alt="Digis"
              width={48}
              height={16}
              className="h-4 w-auto opacity-70"
            />
          </div>
        </div>

        {/* Right: Price + CTA */}
        <div className="flex flex-col items-start md:items-end gap-3 md:min-w-[180px]">
          <div className="text-right">
            <p className="text-3xl font-black">$125</p>
            <p className="text-xs text-muted-foreground">Digitals + 20 printed comp cards</p>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold w-full md:w-auto"
          >
            <Link href="/miami-digitals">
              Reserve Your Spot
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-[11px] text-emerald-400/80 text-center md:text-right font-medium">
            FREE for all models with a Digis.cc account
          </p>
        </div>
      </div>
    </div>
  );
}
