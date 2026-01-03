"use client";

import Link from "next/link";
import { BookingRequestModal } from "./BookingRequestModal";

interface ModelRates {
  photoshoot_hourly_rate?: number;
  photoshoot_half_day_rate?: number;
  photoshoot_full_day_rate?: number;
  promo_hourly_rate?: number;
  brand_ambassador_daily_rate?: number;
  private_event_hourly_rate?: number;
  social_companion_hourly_rate?: number;
  meet_greet_rate?: number;
}

interface ClickableRateCardProps {
  modelId: string;
  modelName: string;
  modelRates: ModelRates;
  serviceType: string;
  label: string;
  description: string;
  rate: number;
  colorClass: string;
  isLoggedIn: boolean;
}

export function ClickableRateCard({
  modelId,
  modelName,
  modelRates,
  serviceType,
  label,
  description,
  rate,
  colorClass,
  isLoggedIn,
}: ClickableRateCardProps) {
  if (!isLoggedIn) {
    return (
      <Link
        href="/signin"
        className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
      >
        <div>
          <p className="text-white font-medium group-hover:text-white/90">{label}</p>
          <p className="text-sm text-white/50">{description}</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${colorClass}`}>{rate.toLocaleString()} coins</p>
          <p className="text-xs text-white/40 group-hover:text-white/60">Click to book</p>
        </div>
      </Link>
    );
  }

  return (
    <BookingRequestModal
      modelId={modelId}
      modelName={modelName}
      modelRates={modelRates}
      defaultServiceType={serviceType}
      trigger={
        <button className="w-full flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group text-left">
          <div>
            <p className="text-white font-medium group-hover:text-white/90">{label}</p>
            <p className="text-sm text-white/50">{description}</p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${colorClass}`}>{rate.toLocaleString()} coins</p>
            <p className="text-xs text-white/40 group-hover:text-white/60">Click to book</p>
          </div>
        </button>
      }
    />
  );
}
