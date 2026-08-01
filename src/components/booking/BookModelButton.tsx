"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BookingInquiryDialog,
  type BookableModel,
} from "@/components/booking/BookingInquiryDialog";
import { trackEvent } from "@/lib/analytics-client";

// Self-contained "Book" CTA: button + inquiry dialog in one. Used on model
// profiles (model set) and the /models explore header (model null → general
// talent inquiry). Shown to everyone, logged-in or not — booking is
// team-mediated agency business, orthogonal to fan monetization.

interface BookModelButtonProps {
  model: BookableModel | null;
  source: "profile" | "explore_header";
  variant?: "button" | "strip";
}

export function BookModelButton({ model, source, variant = "button" }: BookModelButtonProps) {
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
      {variant === "strip" ? (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-500/15 to-violet-500/15 border border-pink-400/30 transition-all hover:from-pink-500/25 hover:to-violet-500/25 hover:border-pink-400/50 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)] text-left"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-gradient-to-br from-pink-500/25 to-violet-500/25 ring-1 ring-pink-400/40 shrink-0">
              <CalendarCheck className="h-[18px] w-[18px] text-pink-300" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white truncate">
                Booking talent for a shoot or event?
              </span>
              <span className="block text-xs text-white/60 truncate">
                Send an inquiry — our team replies within 24 hours. No account needed.
              </span>
            </span>
          </span>
          <span className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white">
            Inquire
          </span>
        </button>
      ) : (
        <Button
          onClick={handleOpen}
          className="w-full h-11 exa-gradient-button"
        >
          <CalendarCheck className="h-4 w-4 mr-2" />
          Book {model ? `@${model.username}` : "EXA Talent"}
        </Button>
      )}
      <BookingInquiryDialog
        open={open}
        onOpenChange={setOpen}
        model={model}
        source={source}
      />
    </>
  );
}
