import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
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

// One row of the public show schedule. Each becomes a clickable Digis ticket
// link on /shows/[slug]; digisEventId points at digis.cc/events/{id}.
const scheduleEntrySchema = z.object({
  id: z.string().trim().min(1),
  day: z.string().trim().max(20).default(""),
  dayShort: z.string().trim().max(8).default(""),
  date: z.string().trim().max(30).default(""),
  dateNum: z.string().trim().max(8).default(""),
  title: z.string().trim().min(1, "Each schedule row needs a title").max(120),
  description: z.string().trim().max(300).default(""),
  highlight: z.boolean().default(false),
  badge: z.string().nullable().default(null),
  digisEventId: z.string().trim().max(100).default(""),
});

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
  // Show-setup capability fields — see migration 20260704000002_events_self_describing.
  ticket_url: z.string().trim().max(500).optional().or(z.literal("")),
  countdown_at: z.string().trim().max(64).optional().or(z.literal("")),
  use_external_ticketing: z.boolean().optional(),
  has_casting_call: z.boolean().optional(),
  has_sponsor_pages: z.boolean().optional(),
  has_venue_map: z.boolean().optional(),
  schedule: z.array(scheduleEntrySchema).max(50).optional(),
  // 🎟️ Tickets toggle — approved models promote this show's ticket link on
  // their profile (events.promote_tickets_on_profiles, migration 20260711000001).
  promote_tickets_on_profiles: z.boolean().optional(),
  // 🏅 Badges toggle — writes the event badge's is_active. When true, accepted
  // models earn the show badge at event completion.
  badges_enabled: z.boolean().optional(),
};

// Only write capability columns that were actually sent, so a partial update
// never clobbers existing values with nulls.
function capabilityFieldsFor(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (input.ticket_url !== undefined) out.ticket_url = nn(input.ticket_url as string);
  if (input.countdown_at !== undefined) out.countdown_at = nn(input.countdown_at as string);
  if (input.use_external_ticketing !== undefined) out.use_external_ticketing = input.use_external_ticketing;
  if (input.has_casting_call !== undefined) out.has_casting_call = input.has_casting_call;
  if (input.has_sponsor_pages !== undefined) out.has_sponsor_pages = input.has_sponsor_pages;
  if (input.has_venue_map !== undefined) out.has_venue_map = input.has_venue_map;
  if (input.promote_tickets_on_profiles !== undefined) out.promote_tickets_on_profiles = input.promote_tickets_on_profiles;
  if (input.schedule !== undefined) {
    const s = input.schedule as unknown[];
    out.schedule = s.length ? s : null;
  }
  return out;
}

const createSchema = z.object(baseFields);
const updateSchema = z.object({ id: z.string().uuid(), ...baseFields });

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
    if (!auth.ok) return auth.response;

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
        ...capabilityFieldsFor(input),
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
          // 🏅 Badges toggle — defaults on for a new show.
          is_active: input.badges_enabled ?? true,
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
    if (!auth.ok) return auth.response;

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
        ...capabilityFieldsFor(input),
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

    // Keep the event's badge label in sync (name/description). is_active is
    // driven by the 🏅 Badges toggle: write it only when the client actually
    // sent badges_enabled, so an API call that omits it never flips the badge.
    // Only overwrite the icon when the admin explicitly supplied a badge_emoji;
    // the edit form doesn't pre-populate it, so always writing the computed
    // default would silently reset a custom badge emoji to ⭐ on any edit.
    const bf = badgeFieldsFor(input);
    const badgeUpdate: Record<string, unknown> = {
      name: bf.name,
      description: bf.description,
    };
    if (nn(input.badge_emoji)) {
      badgeUpdate.icon = bf.icon;
    }
    if (input.badges_enabled !== undefined) {
      badgeUpdate.is_active = input.badges_enabled;
    }
    await (admin as any)
      .from("badges")
      .update(badgeUpdate)
      .eq("event_id", id)
      .eq("badge_type", "event");

    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
