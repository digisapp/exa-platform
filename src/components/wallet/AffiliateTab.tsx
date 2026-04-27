"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Coins,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AffiliateCommission {
  id: string;
  event_id: string;
  sale_amount_cents: number;
  commission_amount_cents: number;
  commission_rate: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  events: {
    name: string;
    short_name: string | null;
    slug: string;
    start_date: string | null;
  } | null;
}

interface Props {
  modelId: string;
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const STATUS_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending:   { label: "Pending",   icon: Clock,         color: "text-amber-400" },
  confirmed: { label: "Available", icon: CheckCircle2,  color: "text-emerald-400" },
  paid:      { label: "Paid",      icon: CheckCircle2,  color: "text-cyan-400" },
  cancelled: { label: "Cancelled", icon: XCircle,       color: "text-white/30" },
};

export default function AffiliateTab({ modelId }: Props) {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await (supabase
        .from("affiliate_commissions") as any)
        .select(`
          id, event_id, sale_amount_cents, commission_amount_cents,
          commission_rate, status, created_at, paid_at,
          events ( name, short_name, slug, start_date )
        `)
        .eq("model_id", modelId)
        .order("created_at", { ascending: false })
        .limit(50);

      setCommissions(data || []);
      setLoading(false);
    }
    load();
  }, [modelId, supabase]);

  const totalEarned = commissions.reduce((s, c) => s + c.commission_amount_cents, 0);
  const totalPending = commissions
    .filter(c => c.status === "pending")
    .reduce((s, c) => s + c.commission_amount_cents, 0);
  const totalAvailable = commissions
    .filter(c => c.status === "confirmed")
    .reduce((s, c) => s + c.commission_amount_cents, 0);
  const totalPaid = commissions
    .filter(c => c.status === "paid")
    .reduce((s, c) => s + c.commission_amount_cents, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/10 ring-1 ring-violet-500/20 mb-4">
          <Ticket className="h-6 w-6 text-violet-400" />
        </div>
        <p className="font-semibold text-white mb-1">No affiliate earnings yet</p>
        <p className="text-sm text-white/50 max-w-xs mx-auto">
          Share your referral link for upcoming shows and earn 20% on every ticket sold.
        </p>
        <Link
          href="/shows"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-xs font-semibold text-white"
        >
          Browse Shows <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Earned", value: formatUsd(totalEarned), icon: TrendingUp, color: "from-violet-500/20 to-pink-500/10", border: "border-violet-500/20", text: "text-violet-300" },
          { label: "Pending Hold", value: formatUsd(totalPending), icon: Clock, color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/20", text: "text-amber-300" },
          { label: "Available",    value: formatUsd(totalAvailable), icon: CheckCircle2, color: "from-emerald-500/20 to-green-500/10", border: "border-emerald-500/20", text: "text-emerald-300" },
          { label: "Paid Out",     value: formatUsd(totalPaid),  icon: Coins, color: "from-cyan-500/20 to-blue-500/10", border: "border-cyan-500/20", text: "text-cyan-300" },
        ].map(({ label, value, icon: Icon, color, border, text }) => (
          <Card key={label} className={`bg-gradient-to-br ${color} ${border} border`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${text}`} />
                <p className="text-[11px] text-white/50 uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-lg font-bold ${text}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-white/40 -mt-2">
        20% commission on every ticket sale. Pending commissions have a 14-day hold before becoming available.
      </p>

      {/* Commission list */}
      <div className="space-y-2">
        {commissions.map((c) => {
          const meta = STATUS_META[c.status] ?? STATUS_META.pending;
          const StatusIcon = meta.icon;
          const eventName = c.events?.short_name || c.events?.name || "Unknown Event";
          const date = c.created_at
            ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "";

          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-violet-500/10 flex-shrink-0">
                  <Ticket className="h-4 w-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {c.events?.slug ? (
                      <Link href={`/shows/${c.events.slug}`} className="hover:text-violet-300 transition-colors">
                        {eventName}
                      </Link>
                    ) : eventName}
                  </p>
                  <p className="text-[11px] text-white/40">{date} · Sale: {formatUsd(c.sale_amount_cents)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  +{formatUsd(c.commission_amount_cents)}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 border-current flex items-center gap-1 ${meta.color}`}
                >
                  <StatusIcon className="h-2.5 w-2.5" />
                  {meta.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
