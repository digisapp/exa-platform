"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  RefreshCw,
  Loader2,
  ExternalLink,
  Trash2,
  Plus,
  Server,
  CreditCard,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface PlatformCost {
  id: string;
  service: string;
  label: string;
  monthly_cost_cents: number;
  notes: string | null;
  billing_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VercelBreakdown {
  project: string;
  machine: string;
  mtdMinutes: number;
  mtdCents: number;
  last30Minutes: number;
  last30Cents: number;
}

interface CostsResponse {
  fixed: PlatformCost[];
  vercel: {
    available: boolean;
    note?: string;
    mtdCents?: number;
    last30Cents?: number;
    projectedMonthCents?: number;
    breakdown?: VercelBreakdown[];
  };
  stripeFees: {
    available: boolean;
    note?: string;
    mtdCents?: number;
    last30Cents?: number;
  };
  totals: { fixedMonthlyCents: number; estimatedMonthlyCents: number };
}

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: "pink" | "violet" | "cyan" | "amber";
}) {
  const tones = {
    pink: "border-pink-500/25 from-pink-500/10 to-pink-500/5 [--ring:theme(colors.pink.500/30)] [--chip:theme(colors.pink.500/20)] text-pink-300",
    violet: "border-violet-500/25 from-violet-500/10 to-violet-500/5 [--ring:theme(colors.violet.500/30)] [--chip:theme(colors.violet.500/20)] text-violet-300",
    cyan: "border-cyan-500/25 from-cyan-500/10 to-cyan-500/5 [--ring:theme(colors.cyan.500/30)] [--chip:theme(colors.cyan.500/20)] text-cyan-300",
    amber: "border-amber-500/25 from-amber-500/10 to-amber-500/5 [--ring:theme(colors.amber.500/30)] [--chip:theme(colors.amber.500/20)] text-amber-300",
  } as const;
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--chip)] ring-1 ring-[var(--ring)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-white/50">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function PlatformCostsPage() {
  const [data, setData] = useState<CostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/costs");
      if (!res.ok) throw new Error("Failed to fetch");
      const json: CostsResponse = await res.json();
      setData(json);
      setDrafts(
        Object.fromEntries(json.fixed.map((r) => [r.id, (r.monthly_cost_cents / 100).toFixed(2)]))
      );
    } catch {
      toast.error("Failed to load costs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveRow = async (row: PlatformCost, patch: Partial<PlatformCost>) => {
    const res = await fetch("/api/admin/costs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...row, ...patch }),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    toast.success("Saved");
    load();
  };

  const saveAmount = (row: PlatformCost) => {
    const dollars = parseFloat(drafts[row.id] ?? "");
    if (Number.isNaN(dollars) || dollars < 0) {
      setDrafts((d) => ({ ...d, [row.id]: (row.monthly_cost_cents / 100).toFixed(2) }));
      return;
    }
    const cents = Math.round(dollars * 100);
    if (cents !== row.monthly_cost_cents) saveRow(row, { monthly_cost_cents: cents });
  };

  const addRow = async () => {
    const dollars = parseFloat(newAmount || "0");
    if (!newLabel.trim() || Number.isNaN(dollars) || dollars < 0) {
      toast.error("Enter a name and a valid monthly amount");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          monthly_cost_cents: Math.round(dollars * 100),
          sort_order: 100,
        }),
      });
      if (!res.ok) throw new Error();
      setNewLabel("");
      setNewAmount("");
      toast.success("Added");
      load();
    } catch {
      toast.error("Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const deleteRow = async (row: PlatformCost) => {
    if (!window.confirm(`Delete "${row.label}"?`)) return;
    const res = await fetch(`/api/admin/costs?id=${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="container px-4 md:px-8 lg:px-16 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Platform Costs
        </h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              icon={DollarSign}
              label="Est. monthly total"
              value={usd(data.totals.estimatedMonthlyCents)}
              sub="fixed + projected usage"
              tone="pink"
            />
            <StatTile
              icon={Layers}
              label="Fixed subscriptions"
              value={usd(data.totals.fixedMonthlyCents)}
              sub={`${data.fixed.filter((r) => r.is_active).length} active line items`}
              tone="violet"
            />
            <StatTile
              icon={Server}
              label="Vercel builds"
              value={data.vercel.available ? usd(data.vercel.projectedMonthCents ?? 0) : "—"}
              sub={
                data.vercel.available
                  ? `${usd(data.vercel.mtdCents ?? 0)} so far this month`
                  : "not connected"
              }
              tone="cyan"
            />
            <StatTile
              icon={CreditCard}
              label="Stripe fees (30d)"
              value={data.stripeFees.available ? usd(data.stripeFees.last30Cents ?? 0) : "—"}
              sub={
                data.stripeFees.available
                  ? `${usd(data.stripeFees.mtdCents ?? 0)} this month · scales with revenue`
                  : "not connected"
              }
              tone="amber"
            />
          </div>

          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4 text-cyan-300" />
                  Vercel build usage
                </h2>
                <a
                  href="https://vercel.com/digis/~/settings/billing"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"
                >
                  billing <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {!data.vercel.available ? (
                <p className="text-sm text-muted-foreground">{data.vercel.note}</p>
              ) : (
                <div className="space-y-2">
                  {(data.vercel.breakdown ?? []).map((b) => (
                    <div
                      key={b.project}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.project}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          {b.machine}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{usd(b.last30Cents)}</span>
                        <span className="text-white/50"> / 30d · {b.last30Minutes.toLocaleString()} min</span>
                      </div>
                    </div>
                  ))}
                  {(data.vercel.breakdown ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No billable build usage in the last 30 days.
                    </p>
                  )}
                  <p className="text-xs text-white/40">
                    Preview builds are skipped on exa-platform and digis-app; only production builds
                    bill. Standard machines are free while on-demand concurrency stays off.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-300" />
                Fixed subscriptions
              </h2>
              <div className="space-y-2">
                {data.fixed.map((row) => (
                  <div
                    key={row.id}
                    className={`flex flex-col md:flex-row md:items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 ${
                      row.is_active ? "" : "opacity-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{row.label}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/30">
                          {row.service}
                        </span>
                        {row.billing_url && (
                          <a
                            href={row.billing_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white/40 hover:text-white/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {row.notes && <p className="text-xs text-white/50 truncate">{row.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/50">$</span>
                        <Input
                          value={drafts[row.id] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                          onBlur={() => saveAmount(row)}
                          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          inputMode="decimal"
                          className="w-28 pl-6 text-right"
                        />
                      </div>
                      <span className="text-xs text-white/40 w-8">/mo</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => saveRow(row, { is_active: !row.is_active })}
                      >
                        {row.is_active ? "On" : "Off"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRow(row)}>
                        <Trash2 className="h-4 w-4 text-rose-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-2 pt-2 border-t border-white/10">
                <Input
                  placeholder="Add a cost (e.g. Figma, domain, tool…)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="flex-1"
                />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-white/50">$</span>
                  <Input
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    inputMode="decimal"
                    className="w-28 pl-6 text-right"
                  />
                </div>
                <Button onClick={addRow} disabled={adding}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <p className="text-xs text-white/40">
                Amounts here are editable estimates for services without billing APIs — keep them in
                sync with the real invoices via the links.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
