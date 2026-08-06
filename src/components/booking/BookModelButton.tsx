"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import {
  BookingInquiryDialog,
  type BookableModel,
} from "@/components/booking/BookingInquiryDialog";
import { trackEvent } from "@/lib/analytics-client";

// Self-contained "Book" CTA: button + inquiry dialog in one. "chip" sits in
// the profile's top-right action cluster, on its own row below the heart/share
// bubbles (a single row overflows across the centered wordmark on phones);
// "link" is the
// muted one-liner under the /models header (model null → general talent
// inquiry, anon visitors only — fans don't need it and a banner was too
// heavy); "primary" is the full-width booking CTA on /[username]/rates.
// Booking is team-mediated agency business, orthogonal to fan monetization.

interface BookModelButtonProps {
  model: BookableModel | null;
  source: "profile" | "explore_header" | "rates";
  variant?: "chip" | "link" | "primary";
  label?: string;
  defaultEmail?: string;
}

export function BookModelButton({ model, source, variant = "chip", label, defaultEmail }: BookModelButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    trackEvent("book_inquiry_open", {
      modelId: model?.id,
      metadata: { source },
    });
  };

  return (
    <>
      {variant === "link" ? (
        <button
          type="button"
          onClick={handleOpen}
          className="group inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors text-left"
        >
          <CalendarCheck className="h-3.5 w-3.5 text-pink-400/80 shrink-0" />
          <span>Booking talent for a shoot or event?</span>
          <span className="text-pink-400 font-medium group-hover:underline whitespace-nowrap">
            Send an inquiry
          </span>
        </button>
      ) : variant === "primary" ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white font-semibold transition-all shadow-[0_0_18px_rgba(236,72,153,0.4)] hover:shadow-[0_0_24px_rgba(236,72,153,0.6)] active:scale-[0.98]"
        >
          <CalendarCheck className="h-5 w-5" />
          {label || "Request a Booking"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          aria-label={model ? `Book ${model.username}` : "Book EXA talent"}
          // h-7 matches the FavoriteButton / ShareButton bubbles it sits
          // beside in the profile header — anything taller reads oversized.
          className="h-7 px-3 rounded-full flex items-center gap-1 text-[11px] font-semibold text-white bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_0_12px_rgba(236,72,153,0.45)] transition-all hover:scale-105 active:scale-95"
        >
          <CalendarCheck className="h-3 w-3" />
          Book
        </button>
      )}
      <BookingInquiryDialog
        open={open}
        onOpenChange={setOpen}
        model={model}
        source={source}
        defaultEmail={defaultEmail}
      />
    </>
  );
}
