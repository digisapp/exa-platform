"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import {
  SendOfferFromDashboardDialog,
  type DashboardOfferCampaign,
} from "@/components/offers/SendOfferFromDashboardDialog";

const PILL_BROWSE =
  "flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-xs md:text-sm font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all";

const PILL_CAMPAIGN =
  "flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-xs md:text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all";

const PILL_OFFER =
  "flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs md:text-sm font-semibold text-white transition-all";

interface Props {
  campaigns: DashboardOfferCampaign[];
}

export function BrandQuickActions({ campaigns }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3 md:flex md:items-center">
      <Link href="/models" className={PILL_BROWSE}>
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Browse</span>
      </Link>
      <CreateCampaignDialog triggerClassName={PILL_CAMPAIGN} triggerLabel="Campaign" />
      <SendOfferFromDashboardDialog campaigns={campaigns} triggerClassName={PILL_OFFER} />
    </div>
  );
}
