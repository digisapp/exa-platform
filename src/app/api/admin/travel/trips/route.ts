import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Admin CRUD for travel trips (gigs with type='travel'). All writes go through
// the service role — the admin session client's own-row RLS policies silently
// no-op on gigs (same failure mode as the 20260716000001 lockdown fallout).

const tripFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  location_city: z.string().trim().min(1).max(100),
  location_state: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime().optional().nullable(),
  application_deadline: z.string().datetime().optional().nullable(),
  compensation_type: z.enum(["hosted", "paid", "revenue_share"]),
  compensation_amount: z.number().int().min(0).max(10000000), // cents
  spots: z.number().int().min(1).max(500),
  status: z.enum(["upcoming", "open", "closed", "cancelled"]),
  cover_image_url: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  require_id_verification: z.boolean().optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single();
  if (!actor || actor.type !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user };
}

function toPayload(fields: z.infer<typeof tripFieldsSchema>) {
  return {
    ...fields,
    type: "travel",
    visibility: "public",
    location_state: fields.location_state || null,
    description: fields.description || null,
    end_at: fields.end_at || null,
    application_deadline: fields.application_deadline || null,
    cover_image_url: fields.cover_image_url || null,
    require_id_verification: fields.require_id_verification ?? false,
  };
}

// POST — create a trip
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const rateLimited = await checkEndpointRateLimit(request, "general", auth.user.id);
    if (rateLimited) return rateLimited;

    const parsed = tripFieldsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const slugBase = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Date.now()}`;

    const adminClient = createServiceRoleClient();
    const { data: trip, error } = await (adminClient.from("gigs") as any)
      .insert({ ...toPayload(parsed.data), slug })
      .select()
      .single();

    if (error) {
      logger.error("Trip create failed", error);
      return NextResponse.json({ error: `Failed to create trip: ${error.message}` }, { status: 500 });
    }

    await logAdminAction({
      supabase: auth.supabase,
      adminUserId: auth.user.id,
      action: AdminActions.GIG_CREATED,
      targetType: "gig",
      targetId: trip.id,
      newValues: { type: "travel", title: trip.title, slug: trip.slug },
    });

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    logger.error("Trip create error", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}

// PATCH — update a trip (full form save or status-only change)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const rateLimited = await checkEndpointRateLimit(request, "general", auth.user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const idParse = z.object({ id: z.string().uuid() }).safeParse(body);
    if (!idParse.success) {
      return NextResponse.json({ error: "Trip id required" }, { status: 400 });
    }

    // Status-only quick change from the trip list dropdown
    const parsed = z
      .union([tripFieldsSchema, z.object({ status: z.enum(["upcoming", "open", "closed", "cancelled"]) })])
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const adminClient = createServiceRoleClient();
    const { data: existing } = await (adminClient.from("gigs") as any)
      .select("id, type, status, title")
      .eq("id", idParse.data.id)
      .single();
    if (!existing || existing.type !== "travel") {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const payload =
      "title" in parsed.data ? toPayload(parsed.data) : { status: parsed.data.status };

    const { data: trip, error } = await (adminClient.from("gigs") as any)
      .update(payload)
      .eq("id", idParse.data.id)
      .select()
      .single();

    if (error) {
      logger.error("Trip update failed", error);
      return NextResponse.json({ error: `Failed to update trip: ${error.message}` }, { status: 500 });
    }

    await logAdminAction({
      supabase: auth.supabase,
      adminUserId: auth.user.id,
      action: AdminActions.GIG_UPDATED,
      targetType: "gig",
      targetId: trip.id,
      oldValues: { status: existing.status },
      newValues: { status: trip.status, title: trip.title },
    });

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    logger.error("Trip update error", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

// DELETE — remove a trip that has no applications (otherwise cancel it instead,
// so applicants' history isn't silently erased)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Trip id required" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    const { data: existing } = await (adminClient.from("gigs") as any)
      .select("id, type, title")
      .eq("id", parsed.data.id)
      .single();
    if (!existing || existing.type !== "travel") {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { count } = await (adminClient.from("gig_applications") as any)
      .select("id", { count: "exact", head: true })
      .eq("gig_id", parsed.data.id);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `This trip has ${count} application(s). Cancel it instead of deleting so applicant history is kept.` },
        { status: 409 }
      );
    }

    const { error } = await (adminClient.from("gigs") as any).delete().eq("id", parsed.data.id);
    if (error) {
      logger.error("Trip delete failed", error);
      return NextResponse.json({ error: `Failed to delete trip: ${error.message}` }, { status: 500 });
    }

    await logAdminAction({
      supabase: auth.supabase,
      adminUserId: auth.user.id,
      action: AdminActions.GIG_DELETED,
      targetType: "gig",
      targetId: parsed.data.id,
      oldValues: { title: existing.title, type: "travel" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Trip delete error", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
