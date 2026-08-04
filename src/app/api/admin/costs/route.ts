import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

// Vercel bills $0.0035 per CPU-minute; minutes round up per build.
const CPU_MINUTE_CENTS = 0.35;
const MACHINE_VCPUS: Record<string, number> = {
  standard: 4,
  enhanced: 8,
  turbo: 30,
  elastic: 8, // varies 4-30; assume enhanced-sized for the estimate
};

const VERCEL_API = "https://api.vercel.com";

type VercelProjectBreakdown = {
  project: string;
  machine: string;
  mtdMinutes: number;
  mtdCents: number;
  last30Minutes: number;
  last30Cents: number;
};

type VercelUsage = {
  available: boolean;
  note?: string;
  mtdCents?: number;
  last30Cents?: number;
  projectedMonthCents?: number;
  breakdown?: VercelProjectBreakdown[];
};

type StripeFees = {
  available: boolean;
  note?: string;
  mtdCents?: number;
  last30Cents?: number;
};

async function vercelGet(path: string, token: string) {
  const res = await fetch(`${VERCEL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Vercel API ${res.status} on ${path}`);
  return res.json();
}

async function getVercelUsage(): Promise<VercelUsage> {
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !teamId) {
    return {
      available: false,
      note: "Set VERCEL_API_TOKEN and VERCEL_TEAM_ID env vars to compute build usage.",
    };
  }

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const since = now.getTime() - 30 * 24 * 3600 * 1000;

  const { projects } = await vercelGet(`/v10/projects?teamId=${teamId}&limit=100`, token);

  // Standard machines only bill while on-demand concurrency is enabled;
  // bigger machines always bill.
  const billable = (projects as any[]).filter((p) => {
    const rc = p.resourceConfig || {};
    const machine = rc.buildMachineType || "standard";
    return machine !== "standard" || rc.elasticConcurrencyEnabled === true;
  });

  const breakdown: VercelProjectBreakdown[] = [];
  await Promise.all(
    billable.map(async (p) => {
      const machine = p.resourceConfig?.buildMachineType || "standard";
      const vcpus = MACHINE_VCPUS[machine] ?? 4;
      let mtdMinutes = 0;
      let last30Minutes = 0;
      const base = `/v6/deployments?teamId=${teamId}&projectId=${p.id}&limit=100&since=${since}`;
      let url = base;
      for (let page = 0; page < 15 && url; page++) {
        const data = await vercelGet(url, token);
        const deps: any[] = data.deployments || [];
        for (const d of deps) {
          if (!d.buildingAt || !d.ready || d.ready <= d.buildingAt) continue;
          const minutes = Math.ceil((d.ready - d.buildingAt) / 60000);
          last30Minutes += minutes;
          if (d.created >= monthStart) mtdMinutes += minutes;
        }
        const next = data.pagination?.next;
        url = next && deps.length ? `${base}&until=${next}` : "";
      }
      if (last30Minutes > 0) {
        breakdown.push({
          project: p.name,
          machine,
          mtdMinutes,
          mtdCents: Math.round(mtdMinutes * vcpus * CPU_MINUTE_CENTS),
          last30Minutes,
          last30Cents: Math.round(last30Minutes * vcpus * CPU_MINUTE_CENTS),
        });
      }
    })
  );

  breakdown.sort((a, b) => b.last30Cents - a.last30Cents);
  const mtdCents = breakdown.reduce((s, b) => s + b.mtdCents, 0);
  const last30Cents = breakdown.reduce((s, b) => s + b.last30Cents, 0);
  const dayOfMonth = now.getUTCDate();
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const projectedMonthCents = Math.round((mtdCents / dayOfMonth) * daysInMonth);

  return { available: true, mtdCents, last30Cents, projectedMonthCents, breakdown };
}

async function getStripeFees(): Promise<StripeFees> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { available: false, note: "STRIPE_SECRET_KEY not configured." };
  }
  const now = new Date();
  const monthStart = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  const since = Math.floor(now.getTime() / 1000) - 30 * 24 * 3600;

  let mtdCents = 0;
  let last30Cents = 0;
  for await (const tx of stripe.balanceTransactions.list({
    created: { gte: since },
    limit: 100,
  })) {
    if (!tx.fee) continue;
    last30Cents += tx.fee;
    if (tx.created >= monthStart) mtdCents += tx.fee;
  }
  return { available: true, mtdCents, last30Cents };
}

export const GET = withAuth(
  async () => {
    const service: any = createServiceRoleClient();

    const [fixedRes, vercel, stripeFees] = await Promise.all([
      service
        .from("platform_costs")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      getVercelUsage().catch((e): VercelUsage => ({ available: false, note: e.message })),
      getStripeFees().catch((e): StripeFees => ({ available: false, note: e.message })),
    ]);

    if (fixedRes.error) throw fixedRes.error;
    const fixed = fixedRes.data || [];

    const fixedMonthlyCents = fixed
      .filter((r: any) => r.is_active)
      .reduce((s: number, r: any) => s + r.monthly_cost_cents, 0);
    const estimatedMonthlyCents =
      fixedMonthlyCents +
      (vercel.projectedMonthCents ?? vercel.mtdCents ?? 0) +
      (stripeFees.last30Cents ?? 0);

    return NextResponse.json({
      fixed,
      vercel,
      stripeFees,
      totals: { fixedMonthlyCents, estimatedMonthlyCents },
    });
  },
  { requireType: "admin" }
);

export const PUT = withAuth(
  async ({ request }) => {
    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const cents = Number(body.monthly_cost_cents);
    if (!label || !Number.isInteger(cents) || cents < 0) {
      return NextResponse.json({ error: "label and a non-negative monthly_cost_cents are required" }, { status: 400 });
    }

    const row: Record<string, unknown> = {
      service: typeof body.service === "string" && body.service.trim() ? body.service.trim() : "other",
      label,
      monthly_cost_cents: cents,
      notes: typeof body.notes === "string" ? body.notes : null,
      billing_url: typeof body.billing_url === "string" && body.billing_url ? body.billing_url : null,
      is_active: body.is_active !== false,
    };
    if (typeof body.sort_order === "number") row.sort_order = body.sort_order;

    const service: any = createServiceRoleClient();
    const query = body.id
      ? service.from("platform_costs").update(row).eq("id", body.id).select().single()
      : service.from("platform_costs").insert(row).select().single();
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ cost: data });
  },
  { requireType: "admin", rateLimit: "general" }
);

export const DELETE = withAuth(
  async ({ request }) => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const service: any = createServiceRoleClient();
    const { error } = await service.from("platform_costs").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
