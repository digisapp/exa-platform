import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Create / edit events (and keep each event's "confirmed to walk" badge in sync).
//
// Events used to be seed-only (migration 00050) — every new show needed a code
// deploy. This route makes them admin-manageable. Creating an event also creates
// its badge_type='event' badge so the badge-per-show awarding (trigger
// manage_event_badge + the accept route) works immediately. See
// docs/badge-showcase-plan.md and memory project_event_badge_awarding.

const EMOJI_BY_SHORT: Record<string, string> = {
  MSW: "🏖️",
  NYFW: "🗽",
  MAW: "🎨",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const baseFields = {
  name: z.string().trim().min(2, "Name is required"),
  short_name: z.string().trim().min(1, "Short name is required").max(12),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes").optional(),
  year: z.coerce.number().int().min(2020).max(2100),
  status: z.enum(["upcoming", "active", "completed", "cancelled"]).default("upcoming"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  location_city: z.string().trim().max(120).optional().or(z.literal("")),
  location_state: z.string().trim().max(120).optional().or(z.literal("")),
  location_country: z.string().trim().max(120).optional().or(z.literal("")),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
  points_awarded: z.coerce.number().int().min(0).max(100000).default(500),
  badge_emoji: z.string().trim().max(8).optional().or(z.literal("")),
};

const createSchema = z.object(baseFields);
const updateSchema = z.object({ id: z.string().uuid(), ...baseFields });

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };
  if (!actor || actor.type !== "admin") return { error: "Forbidden", status: 403 as const };
  return { actor };
}

// Empty-string -> null so we don't write "" into nullable date/text columns.
function nn(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

function badgeFieldsFor(input: z.infer<typeof createSchema>) {
  const icon =
    nn(input.badge_emoji) ||
    EMOJI_BY_SHORT[input.short_name.toUpperCase()] ||
    "⭐";
  return {
    name: `${input.short_name} ${input.year}`,
    description: `Confirmed to walk in ${input.name}`,
    icon,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const input = parsed.data;
    const slug = nn(input.slug) || slugify(input.name);
    const admin = createServiceRoleClient();

    // Insert the event
    const { data: event, error: eventError } = await (admin as any)
      .from("events")
      .insert({
        slug,
        name: input.name,
        short_name: input.short_name,
        description: nn(input.description),
        location_city: nn(input.location_city),
        location_state: nn(input.location_state),
        location_country: nn(input.location_country) || "US",
        start_date: nn(input.start_date),
        end_date: nn(input.end_date),
        year: input.year,
        status: input.status,
        points_awarded: input.points_awarded,
      })
      .select("*")
      .single();

    if (eventError) {
      const dup = eventError.code === "23505";
      return NextResponse.json(
        { error: dup ? `An event with slug "${slug}" already exists` : `Failed to create event: ${eventError.message}` },
        { status: dup ? 409 : 500 }
      );
    }

    // Create the matching event badge (mirrors the 00050 seed). Idempotent on slug.
    const bf = badgeFieldsFor(input);
    const { error: badgeError } = await (admin as any)
      .from("badges")
      .upsert(
        {
          slug,
          name: bf.name,
          description: bf.description,
          icon: bf.icon,
          badge_type: "event",
          event_id: event.id,
          is_active: true,
        },
        { onConflict: "slug" }
      );

    if (badgeError) {
      // Event exists but badge failed — surface it so the admin can retry.
      return NextResponse.json(
        { event, warning: `Event created but badge creation failed: ${badgeError.message}` },
        { status: 207 }
      );
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { id, ...input } = parsed.data;
    const slug = nn(input.slug) || slugify(input.name);
    const admin = createServiceRoleClient();

    const { data: event, error: eventError } = await (admin as any)
      .from("events")
      .update({
        slug,
        name: input.name,
        short_name: input.short_name,
        description: nn(input.description),
        location_city: nn(input.location_city),
        location_state: nn(input.location_state),
        location_country: nn(input.location_country) || "US",
        start_date: nn(input.start_date),
        end_date: nn(input.end_date),
        year: input.year,
        status: input.status,
        points_awarded: input.points_awarded,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (eventError) {
      const dup = eventError.code === "23505";
      return NextResponse.json(
        { error: dup ? `An event with slug "${slug}" already exists` : `Failed to update event: ${eventError.message}` },
        { status: dup ? 409 : 500 }
      );
    }

    // Keep the event's badge label in sync (name/description/icon). Do NOT touch
    // is_active here — that's the deliberate "retire this badge" switch.
    const bf = badgeFieldsFor(input);
    await (admin as any)
      .from("badges")
      .update({ name: bf.name, description: bf.description, icon: bf.icon })
      .eq("event_id", id)
      .eq("badge_type", "event");

    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
