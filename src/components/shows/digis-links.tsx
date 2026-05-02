"use client";

/**
 * Digis redirect components — every link to Digis.cc goes through a confirmation
 * popup that explains to the user they are leaving EXA and going to our partner
 * platform Digis.cc for ticketing and live streaming.
 */

import { useState } from "react";
import Image from "next/image";
import { Ticket, ExternalLink, ArrowRight, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MSW_2026_SCHEDULE } from "@/lib/msw-schedule";

// Opening Show — flagship event, used as the default "Get Tickets" destination
const MSW_DIGIS_TICKET_URL =
  "https://digis.cc/events/34393c83-ca92-42f2-9d3e-bfb8988c7807";

// ---------------------------------------------------------------------------
// Shared Dialog UI
// ---------------------------------------------------------------------------

function DigisDialog({
  href,
  open,
  onOpenChange,
}: {
  href: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const handleContinue = () => {
    window.open(href, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm border border-pink-500/20 bg-[#080010]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(236,72,153,0.15)]">
        <DialogHeader className="items-center text-center space-y-0">
          <div className="mb-4 mx-auto w-16 h-16 rounded-2xl bg-black ring-1 ring-white/15 flex items-center justify-center p-2 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
            <Image
              src="/digis-logo-white.png"
              alt="Digis"
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          </div>
          <DialogTitle className="text-lg font-bold text-white">
            Continue to Digis
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm leading-relaxed mt-2">
            <span className="text-white font-semibold">Digis</span> is the
            official ticket provider and live streaming platform for all EXA
            shows.
          </DialogDescription>
        </DialogHeader>

        <Button
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white shadow-[0_0_16px_rgba(236,72,153,0.3)]"
          onClick={handleContinue}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-2" />
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main "Get Tickets" button — shows/[slug] page
// ---------------------------------------------------------------------------

export function DigisTicketButton({
  href,
  affiliateCode,
}: {
  href: string;
  affiliateCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dialogHref, setDialogHref] = useState(href);

  const handleClick = () => {
    // If there's an affiliate session, append the click ID so Digis can fire
    // the examodels.com commission webhook after a successful ticket purchase.
    if (affiliateCode) {
      try {
        const clickId = sessionStorage.getItem("exa_click_id");
        if (clickId) {
          const sep = href.includes("?") ? "&" : "?";
          setDialogHref(`${href}${sep}aff=${encodeURIComponent(clickId)}`);
        }
      } catch {
        // sessionStorage unavailable — proceed without aff_sid
      }
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        size="lg"
        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg py-6 rounded-xl shadow-lg shadow-pink-500/25"
        onClick={handleClick}
      >
        <Ticket className="h-6 w-6 mr-2" />
        Get Tickets
        <ExternalLink className="h-4 w-4 ml-2" />
      </Button>
      <DigisDialog href={dialogHref} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// MSW schedule section — shows/[slug] page (replaces <Link> → external URL)
// ---------------------------------------------------------------------------

export function DigisScheduleSection({
  affiliateRef,
}: {
  affiliateRef?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dialogHref, setDialogHref] = useState(MSW_DIGIS_TICKET_URL);

  const handleScheduleClick = (digisEventId: string) => {
    // Each schedule item links to its own Digis event page so affiliate
    // tracking (aff=) lands on the exact checkout context.
    let url = `https://digis.cc/events/${digisEventId}`;
    if (affiliateRef) url += `?ref=${affiliateRef}`;
    try {
      const clickId = sessionStorage.getItem("exa_click_id");
      if (clickId) {
        const sep = url.includes("?") ? "&" : "?";
        url = `${url}${sep}aff=${encodeURIComponent(clickId)}`;
      }
    } catch {
      // sessionStorage unavailable — proceed without aff
    }
    setDialogHref(url);
    setOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        {MSW_2026_SCHEDULE.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => handleScheduleClick(s.digisEventId)}
            className={`w-full flex items-start gap-4 p-3.5 rounded-xl transition-all cursor-pointer group text-left ${
              s.highlight
                ? "border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-violet-500/5 to-transparent shadow-[0_0_14px_rgba(236,72,153,0.12)] hover:border-pink-400/50 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                : "bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5"
            }`}
          >
            <div className="text-center flex-shrink-0 w-14">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                {s.dayShort}
              </p>
              <p
                className={`text-xl font-bold leading-none ${
                  s.highlight ? "text-pink-300" : "text-white"
                }`}
              >
                {s.dateNum}
              </p>
            </div>
            <div className="h-10 w-px bg-white/10 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white group-hover:text-pink-200 transition-colors mb-0.5">
                {s.title}
              </p>
              <p className="text-xs text-white/55 leading-relaxed">
                {s.description}
              </p>
            </div>
            <Ticket className="h-4 w-4 text-white/20 group-hover:text-pink-300 flex-shrink-0 mt-1 transition-colors" />
          </button>
        ))}
      </div>
      <DigisDialog href={dialogHref} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// "Sponsored By Digis" card — shows/[slug] sidebar
// ---------------------------------------------------------------------------

export function DigisSponsorCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-white/10 hover:border-pink-500/40 transition-all hover:shadow-[0_0_16px_rgba(236,72,153,0.25)] w-full text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0 p-1.5 ring-1 ring-white/10">
          <Image
            src="/digis-logo-white.png"
            alt="Digis"
            width={40}
            height={40}
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <p className="font-semibold text-white">Digis</p>
          <p className="text-xs text-white/50">digis.cc</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-white/40 group-hover:text-pink-300 ml-auto transition-colors" />
      </button>
      <DigisDialog href="https://digis.cc" open={open} onOpenChange={setOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// "Watch on Digis" banner button — shows/page
// ---------------------------------------------------------------------------

export function DigisWatchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Tv className="h-4 w-4" />
        Watch on Digis
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
      <DigisDialog
        href="https://digis.cc/shows"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero profile button — [username] page (pill style)
// ---------------------------------------------------------------------------

export function DigisHeroProfileButton({
  modelUsername,
}: {
  modelUsername: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.open(`/go/shows/${modelUsername}`, "_blank", "noopener,noreferrer")}
      title="Watch on Digis"
      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-gradient-to-r from-pink-500/25 to-violet-500/25 backdrop-blur-md border border-pink-400/40 text-white text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 hover:from-pink-500/40 hover:to-violet-500/40 hover:border-pink-400/60 hover:shadow-[0_0_14px_rgba(236,72,153,0.55)] whitespace-nowrap"
    >
      🎥 Digis
    </button>
  );
}

// ---------------------------------------------------------------------------
// Icon profile button — [username] page (icon + label style)
// ---------------------------------------------------------------------------

export function DigisIconProfileButton({
  modelUsername,
}: {
  modelUsername: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.open(`/go/shows/${modelUsername}`, "_blank", "noopener,noreferrer")}
      title="Watch on Digis"
      className="flex flex-col items-center gap-1 group"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-500/30 flex items-center justify-center transition-all group-hover:scale-110 active:scale-95 group-hover:from-pink-500/35 group-hover:to-violet-500/35 group-hover:border-pink-400/60 group-hover:shadow-[0_0_16px_rgba(236,72,153,0.5)]">
        <span className="text-sm leading-none">🎥</span>
      </div>
      <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors leading-none font-medium">
        Digis
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scrolling marquee banner — homepage & comp-card-creator layout
// ---------------------------------------------------------------------------

export function DigisMarqueeBanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full block bg-gradient-to-r from-violet-600 via-pink-500 to-violet-600 bg-[length:200%_100%] animate-gradient py-3.5 hover:opacity-90 transition-opacity cursor-pointer"
      >
        <div className="overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee">
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              ✨ Join our{" "}
              <Image
                src="/digis-logo-white.png"
                alt="Digis"
                width={72}
                height={20}
                className="h-5 w-auto inline-block"
              />{" "}
              Community — Live Streams, Calls, Chats + Virtual Gifts ✨
            </span>
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              🎁 Join our{" "}
              <Image
                src="/digis-logo-white.png"
                alt="Digis"
                width={72}
                height={20}
                className="h-5 w-auto inline-block"
              />{" "}
              Community — Live Streams, Calls, Chats + Virtual Gifts 🎁
            </span>
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              ✨ Join our{" "}
              <Image
                src="/digis-logo-white.png"
                alt="Digis"
                width={72}
                height={20}
                className="h-5 w-auto inline-block"
              />{" "}
              Community — Live Streams, Calls, Chats + Virtual Gifts ✨
            </span>
            <span className="mx-8 text-base font-semibold text-white inline-flex items-center gap-2">
              🎁 Join our{" "}
              <Image
                src="/digis-logo-white.png"
                alt="Digis"
                width={72}
                height={20}
                className="h-5 w-auto inline-block"
              />{" "}
              Community — Live Streams, Calls, Chats + Virtual Gifts 🎁
            </span>
          </div>
        </div>
      </button>
      <DigisDialog
        href="https://digis.cc"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Inline text link — for use inside <p> text, e.g. MiamiDigitalsBanner
// ---------------------------------------------------------------------------

export function DigisInlineLink({
  children,
  href = "https://digis.cc",
  className,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          className ??
          "underline hover:text-emerald-300 transition-colors cursor-pointer"
        }
      >
        {children}
      </button>
      <DigisDialog href={href} open={open} onOpenChange={setOpen} />
    </>
  );
}
