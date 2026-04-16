"use client";

import { Button } from "@/components/ui/button";
import {
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Heart,
  Lock,
  MessageCircle,
  CreditCard,
  BarChart3,
  Phone,
  Gift,
  Briefcase,
  Eye,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { Transaction } from "@/app/(dashboard)/wallet/page";

const EARNING_TYPE_META: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string; // tailwind color keyword used in gradients
  }
> = {
  tip_received: { label: "Tips", icon: Gift, color: "pink" },
  video_call: { label: "Video Calls", icon: Phone, color: "cyan" },
  voice_call: { label: "Voice Calls", icon: Phone, color: "emerald" },
  message_received: { label: "Messages", icon: MessageCircle, color: "violet" },
  content_sale: { label: "Content Sales", icon: Eye, color: "orange" },
  booking_payment: { label: "Bookings", icon: Briefcase, color: "blue" },
};

interface EarningsTabProps {
  totalEarnings: number;
  thisMonthEarnings: number;
  earningsByMonth: Record<string, number>;
  earningsByType: Record<string, number>;
  transactions: Transaction[];
  hasMoreTransactions: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

function getActionMeta(action: string) {
  switch (action) {
    case "tip_received":
    case "tip_sent":
      return { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/15", ring: "ring-pink-500/30" };
    case "content_sale":
    case "content_unlock":
      return { icon: Lock, color: "text-violet-400", bg: "bg-violet-500/15", ring: "ring-violet-500/30" };
    case "message_received":
    case "message_sent":
      return { icon: MessageCircle, color: "text-cyan-400", bg: "bg-cyan-500/15", ring: "ring-cyan-500/30" };
    case "purchase":
      return { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30" };
    default:
      return { icon: Coins, color: "text-amber-400", bg: "bg-amber-500/15", ring: "ring-amber-500/30" };
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "tip_received":
      return "Tip Received";
    case "tip_sent":
      return "Tip Sent";
    case "content_sale":
      return "Content Sale";
    case "content_unlock":
      return "Content Unlock";
    case "message_received":
      return "Message Payment";
    case "message_sent":
      return "Message";
    case "purchase":
      return "Coin Purchase";
    default:
      return action.replace(/_/g, " ");
  }
}

// Monthly sparkline helper — inline SVG, no deps
function MonthlyChart({ months, values }: { months: string[]; values: number[] }) {
  const w = 700;
  const h = 200;
  const pad = 24;
  const max = Math.max(...values, 1) * 1.15;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${pad + i * step},${h - pad - (v / max) * (h - pad * 2)}`)
    .join(" ");
  const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="200"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="monthlyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF69B4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF69B4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="monthlyStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#FF00FF" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={pad}
            x2={w - pad}
            y1={h - pad - p * (h - pad * 2)}
            y2={h - pad - p * (h - pad * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="2 4"
          />
        ))}
        <polygon points={areaPoints} fill="url(#monthlyFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="url(#monthlyStroke)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(255,105,180,0.5))" }}
        />
        {/* Data point dots */}
        {values.map((v, i) => (
          <circle
            key={i}
            cx={pad + i * step}
            cy={h - pad - (v / max) * (h - pad * 2)}
            r="3"
            fill="#FF69B4"
            style={{ filter: "drop-shadow(0 0 4px rgba(255,105,180,0.8))" }}
          />
        ))}
      </svg>
      <div className="flex justify-between px-6 mt-2">
        {months.map((month, i) => {
          const [year, m] = month.split("-");
          const label = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString("en-US", {
            month: "short",
          });
          return (
            <div key={month} className="text-center">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-semibold text-white/80">{values[i].toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EarningsTab({
  totalEarnings,
  thisMonthEarnings,
  earningsByMonth,
  earningsByType,
  transactions,
  hasMoreTransactions,
  loadingMore,
  onLoadMore,
}: EarningsTabProps) {
  const tipsTotal = transactions
    .filter((t) => t.action === "tip_received")
    .reduce((sum, t) => sum + t.amount, 0);
  const contentTotal = transactions
    .filter((t) => t.action === "content_sale")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* ────────────────────────────────────────────
          Hero earnings card (matches Payouts pattern)
         ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 p-6 md:p-8 text-center bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10">
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Total earned</p>
          <p className="mt-2 text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
            {totalEarnings.toLocaleString()}
          </p>
          <p className="text-xs text-white/50 mt-1">coins · lifetime</p>
        </div>
      </div>

      {/* ────────────────────────────────────────────
          Stat cards — color-coded
         ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="uppercase tracking-wider font-medium">This Month</span>
          </div>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-white">
            {thisMonthEarnings.toLocaleString()}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">coins earned</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-4 hover:border-pink-500/40 transition-colors">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400/50" />
            <span className="uppercase tracking-wider font-medium">From Tips</span>
          </div>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-white">
            {tipsTotal.toLocaleString()}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {transactions.filter((t) => t.action === "tip_received").length} tips
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-4 hover:border-violet-500/40 transition-colors">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Lock className="h-3.5 w-3.5 text-violet-400" />
            <span className="uppercase tracking-wider font-medium">Content</span>
          </div>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-white">
            {contentTotal.toLocaleString()}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">
            {transactions.filter((t) => t.action === "content_sale").length} sales
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-4 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="uppercase tracking-wider font-medium">Streams</span>
          </div>
          <p className="mt-2 text-2xl md:text-3xl font-bold text-white">
            {Object.keys(earningsByType).length}
          </p>
          <p className="text-[11px] text-white/50 mt-0.5">revenue types</p>
        </div>
      </div>

      {/* ────────────────────────────────────────────
          Monthly Earnings Chart — SVG line
         ──────────────────────────────────────────── */}
      {Object.keys(earningsByMonth).length > 0 &&
        (() => {
          const months = Object.keys(earningsByMonth).sort().slice(-6);
          const values = months.map((m) => earningsByMonth[m] || 0);
          return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <header className="flex items-center justify-between p-5 border-b border-white/5">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-pink-400" />
                    Monthly earnings
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">Last 6 months</p>
                </div>
              </header>
              <div className="p-5 pt-4">
                <MonthlyChart months={months} values={values} />
              </div>
            </div>
          );
        })()}

      {/* ────────────────────────────────────────────
          Earnings Breakdown — neon progress bars
         ──────────────────────────────────────────── */}
      {Object.keys(earningsByType).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Where coins come from
              </h3>
              <p className="text-xs text-white/50 mt-0.5">Earnings breakdown by source</p>
            </div>
          </header>
          <div className="p-5">
            {(() => {
              const entries = Object.entries(earningsByType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);
              const totalFromTypes = entries.reduce((sum, [, a]) => sum + a, 0);

              const colorGradients: Record<string, string> = {
                pink: "from-pink-500 to-rose-500",
                cyan: "from-cyan-500 to-blue-500",
                emerald: "from-emerald-500 to-teal-500",
                violet: "from-violet-500 to-purple-500",
                orange: "from-orange-500 to-amber-500",
                blue: "from-blue-500 to-indigo-500",
              };
              const colorShadows: Record<string, string> = {
                pink: "shadow-[0_0_12px_rgba(236,72,153,0.5)]",
                cyan: "shadow-[0_0_12px_rgba(34,211,238,0.5)]",
                emerald: "shadow-[0_0_12px_rgba(52,211,153,0.5)]",
                violet: "shadow-[0_0_12px_rgba(167,139,250,0.5)]",
                orange: "shadow-[0_0_12px_rgba(249,115,22,0.5)]",
                blue: "shadow-[0_0_12px_rgba(59,130,246,0.5)]",
              };
              const iconColors: Record<string, string> = {
                pink: "text-pink-300",
                cyan: "text-cyan-300",
                emerald: "text-emerald-300",
                violet: "text-violet-300",
                orange: "text-orange-300",
                blue: "text-blue-300",
              };
              const iconBgs: Record<string, string> = {
                pink: "bg-pink-500/15 ring-pink-500/30",
                cyan: "bg-cyan-500/15 ring-cyan-500/30",
                emerald: "bg-emerald-500/15 ring-emerald-500/30",
                violet: "bg-violet-500/15 ring-violet-500/30",
                orange: "bg-orange-500/15 ring-orange-500/30",
                blue: "bg-blue-500/15 ring-blue-500/30",
              };

              return (
                <div className="space-y-4">
                  {entries.map(([type, amount]) => {
                    const meta =
                      EARNING_TYPE_META[type] ||
                      { label: type.replace(/_/g, " "), icon: Coins, color: "pink" };
                    const Icon = meta.icon;
                    const pct = totalFromTypes > 0 ? Math.round((amount / totalFromTypes) * 100) : 0;
                    return (
                      <div key={type} className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-xl ring-1 ${iconBgs[meta.color]} ${iconColors[meta.color]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-white capitalize">
                              {meta.label}
                            </span>
                            <span className="text-xs text-white/60">
                              {amount.toLocaleString()} coins
                            </span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${colorGradients[meta.color]} ${colorShadows[meta.color]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-white w-12 text-right">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────
          Transactions list
         ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <header className="p-5 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">Recent transactions</h3>
          <p className="text-xs text-white/50 mt-0.5">Your coin activity</p>
        </header>
        <div className="p-3">
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 ring-1 ring-white/10 mb-3">
                <Coins className="h-6 w-6 text-white/40" />
              </div>
              <p className="text-sm text-white/60">No transactions yet</p>
              <p className="text-xs text-white/40 mt-0.5">Your earnings will show up here</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx) => {
                const meta = getActionMeta(tx.action);
                const Icon = meta.icon;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl ring-1 ${meta.bg} ${meta.ring} ${meta.color} shrink-0`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-white truncate">
                          {getActionLabel(tx.action)}
                        </p>
                        <p className="text-[11px] text-white/40">
                          {new Date(tx.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-bold text-sm flex items-center gap-1 shrink-0",
                        tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {tx.amount >= 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {hasMoreTransactions && (
                <div className="text-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
