"use client";

import { useState } from "react";
import {
  BookingInquiryDialog,
  type BookableModel,
} from "@/components/booking/BookingInquiryDialog";

// Rates are USD — tapping a card opens the team-mediated booking inquiry
// (no account required), never the retired coin-escrow flow.

// Maps a tapped service to the inquiry form's booking-type options.
const SERVICE_INQUIRY_TYPE: Record<string, string> = {
  photoshoot_hourly: "photoshoot",
  photoshoot_half_day: "photoshoot",
  photoshoot_full_day: "photoshoot",
  promo: "event",
  brand_ambassador: "campaign",
  private_event: "event",
  social_companion: "event",
  meet_greet: "event",
};

interface ClickableRateCardProps {
  model: BookableModel;
  serviceType: string;
  label: string;
  description: string;
  /** Rate in whole USD. */
  rate: number;
  /** Display suffix, e.g. "/hr" or "/day". */
  unit?: string;
  colorClass: string;
  defaultEmail?: string;
}

export function ClickableRateCard({
  model,
  serviceType,
  label,
  description,
  rate,
  unit = "",
  colorClass,
  defaultEmail,
}: ClickableRateCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group text-left"
      >
        <div>
          <p className="text-white font-medium group-hover:text-white/90">{label}</p>
          <p className="text-sm text-white/50">{description}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${colorClass}`}>
            ${rate.toLocaleString()}
            {unit && <span className="text-sm font-normal text-white/50">{unit}</span>}
          </p>
          <p className="text-xs text-white/40 group-hover:text-white/60">Tap to book</p>
        </div>
      </button>
      <BookingInquiryDialog
        open={open}
        onOpenChange={setOpen}
        model={model}
        source="rates"
        defaultEmail={defaultEmail}
        defaultInquiryType={SERVICE_INQUIRY_TYPE[serviceType]}
        defaultDetails={`Interested in: ${label} — $${rate.toLocaleString()}${unit}`}
      />
    </>
  );
}
