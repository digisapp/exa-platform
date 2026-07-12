import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Admin CRUD for an event's B2B packages (event_packages, migration
// 20260704000003). Packages are the designer/sponsor offerings sold via the
// brands package-checkout route and shown on the public /events/[slug] page.
//
// This must go through the service-role client: event_packages' only RLS
// policy is "anyone can read ACTIVE packages", so an admin browsing with the
// anon/authenticated client would never see deactivated rows (and couldn't
// write at all).
//
// Units: this API speaks CENTS end-to-end (*_cents fields). The admin UI
// collects dollars and converts before calling — never mix the two (see the
// 100x payout display bug history).

const PACKAGE_CATEGORIES = ["runway", "showroom", "retail", "shoot", "party", "other"] as const;

function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const packageFields = {
  name: z.string().trim().min(2, "Name is required").max(200),
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Key must be lowercase letters, numbers and dashes")
    .max(80)
    .optional()
    .or(z.literal("")),
  category: z.enum(PACKAGE_CATEGORIES).default("other"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  full_price_cents: z.coerce.number().int().min(1, "Price is required").max(100_000_000),
  // Per-month price for the 3-month plan. Required when installments are
  // offered; otherwise stored equal to the full price (checkout convention —
  // the checkout route rejects installment attempts on non-plan packages).
  installment_price_cents: z.coerce.number().int().min(1).max(100_000_000).optional(),
  installments_available: z.boolean().default(false),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  is_active: z.boolean().default(true),
};

const createSchema = z.object(packageFields);
const updateSchema = z.object({
  id: z.string().uuid(),
  ...packageFields,
  // No create-defaults on PATCH: only sent fields are written.
  category: z.enum(PACKAGE_CATEGORIES).optional(),
  installments_available: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(10000).optional(),
  is_active: z.boolean().optional(),
  full_price_cents: z.coerce.number().int().min(1).max(100_000_000).optional(),
  name: z.string().trim().min(2).max(200).optional(),
});

function nn(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

async function eventExists(admin: ReturnType<typeof createServiceRoleClient>, eventId: string) {
  const { data } = await (admin as any)
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();
  return !!data;
}

// List ALL of an event's packages (active + deactivated) for the admin UI.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: eventId } = await params;
    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const { data, error } = await (admin as any)
      .from("event_packages")
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: `Failed to fetch packages: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ packages: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: eventId } = await params;
    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const input = parsed.data;

    if (input.installments_available && input.installment_price_cents === undefined) {
      return NextResponse.json(
        { error: "Set a monthly installment price, or turn the installment plan off" },
        { status: 400 }
      );
    }

    const admin = createServiceRoleClient();
    if (!(await eventExists(admin, eventId))) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const key = nn(input.key) || slugifyKey(input.name);
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const { data: pkg, error } = await (admin as any)
      .from("event_packages")
      .insert({
        event_id: eventId,
        key,
        category: input.category,
        name: input.name,
        description: nn(input.description),
        full_price_cents: input.full_price_cents,
        // No plan → store full price (seed/checkout convention).
        installment_price_cents: input.installments_available
          ? input.installment_price_cents
          : input.full_price_cents,
        installments_available: input.installments_available,
        sort_order: input.sort_order,
        is_active: input.is_active,
      })
      .select("*")
      .single();

    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json(
        { error: dup ? `This event already has a package with key "${key}"` : `Failed to create package: ${error.message}` },
        { status: dup ? 409 : 500 }
      );
    }
    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id: eventId } = await params;
    if (!z.string().uuid().safeParse(eventId).success) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { id: packageId, ...input } = parsed.data;

    const admin = createServiceRoleClient();

    // Load the current row (scoped to this event) so installment/full-price
    // invariants can be enforced against the merged result.
    const { data: existing } = await (admin as any)
      .from("event_packages")
      .select("*")
      .eq("id", packageId)
      .eq("event_id", eventId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) update.name = input.name;
    if (nn(input.key)) update.key = nn(input.key);
    if (input.category !== undefined) update.category = input.category;
    if (input.description !== undefined) update.description = nn(input.description);
    if (input.full_price_cents !== undefined) update.full_price_cents = input.full_price_cents;
    if (input.installments_available !== undefined) update.installments_available = input.installments_available;
    if (input.installment_price_cents !== undefined) update.installment_price_cents = input.installment_price_cents;
    if (input.sort_order !== undefined) update.sort_order = input.sort_order;
    if (input.is_active !== undefined) update.is_active = input.is_active;

    const merged = { ...existing, ...update };
    if (merged.installments_available) {
      if (!merged.installment_price_cents || merged.installment_price_cents === merged.full_price_cents) {
        // Guard against a plan whose "monthly" price is unset or equals the
        // full price — a 3-month subscription on it would charge ~3x.
        if (input.installment_price_cents === undefined) {
          return NextResponse.json(
            { error: "Set a monthly installment price before enabling the installment plan" },
            { status: 400 }
          );
        }
      }
    } else {
      // Plan off → keep installment price pinned to the (possibly updated)
      // full price, matching the seed/checkout convention.
      update.installment_price_cents = merged.full_price_cents;
    }

    const { data: pkg, error } = await (admin as any)
      .from("event_packages")
      .update(update)
      .eq("id", packageId)
      .eq("event_id", eventId)
      .select("*")
      .single();

    if (error) {
      const dup = error.code === "23505";
      return NextResponse.json(
        { error: dup ? "This event already has a package with that key" : `Failed to update package: ${error.message}` },
        { status: dup ? 409 : 500 }
      );
    }
    return NextResponse.json({ package: pkg });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
