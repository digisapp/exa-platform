import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Admin CRUD for tour stops (gigs with type='tour'). All writes go through
// the service role — the admin session client's own-row RLS policies silently
// no-op on gigs (same failure mode as the 20260716000001 lockdown fallout).
// Note: publishing here does NOT fire the all-models announcement blast that
// /admin/gigs publish does.

const STOP_STATUSES = ["upcoming", "open", "closed", "completed", "cancelled"] as const;

const stopFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  location_name: z.string().trim().max(200).optional().nullable(),
  location_city: z.string().trim().min(1).max(100),
  location_state: z.string().trim().max(100).optional().nullable(),
  location_country: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(10000).optional().nullable(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime().optional().nullable(),
  application_deadline: z.string().datetime().optional().nullable(),
  compensation_type: z.enum(["none", "paid", "tfp", "perks", "exposure"]),
  compensation_amount: z.number().int().min(0).max(10000000), // cents
  spots: z.number().int().min(1).max(500),
  status: z.enum(STOP_STATUSES),
  cover_image_url: z.string().url().max(1000).optional().nullable().or(z.literal("")),
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

function toPayload(fields: z.infer<typeof stopFieldsSchema>) {
  return {
    ...fields,
    type: "tour",
    visibility: "public",
    location_name: fields.location_name || null,
    location_state: fields.location_state || null,
    location_country: fields.location_country || null,
    description: fields.description || null,
    end_at: fields.end_at || null,
    application_deadline: fields.application_deadline || null,
    cover_image_url: fields.cover_image_url || null,
  };
}

// POST — create a tour stop
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const rateLimited = await checkEndpointRateLimit(request, "general", auth.user.id);
    if (rateLimited) return rateLimited;

    const parsed = stopFieldsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const slugBase = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = `${slugBase}-${Date.now()}`;

    const adminClient = createServiceRoleClient();
    const { data: stop, error } = await (adminClient.from("gigs") as any)
      .insert({ ...toPayload(parsed.data), slug })
      .select()
      .single();

    if (error) {
      logger.error("Tour stop create failed", error);
      return NextResponse.json({ error: `Failed to create stop: ${error.message}` }, { status: 500 });
    }

    await logAdminAction({
      supabase: auth.supabase,
      adminUserId: auth.user.id,
      action: AdminActions.GIG_CREATED,
      targetType: "gig",
      targetId: stop.id,
      newValues: { type: "tour", title: stop.title, slug: stop.slug },
    });

    return NextResponse.json({ success: true, stop });
  } catch (error) {
    logger.error("Tour stop create error", error);
    return NextResponse.json({ error: "Failed to create stop" }, { status: 500 });
  }
}

// PATCH — update a stop (full form save or status-only change)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const rateLimited = await checkEndpointRateLimit(request, "general", auth.user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const idParse = z.object({ id: z.string().uuid() }).safeParse(body);
    if (!idParse.success) {
      return NextResponse.json({ error: "Stop id required" }, { status: 400 });
    }

    // Status-only quick change from the stop list dropdown
    const parsed = z
      .union([stopFieldsSchema, z.object({ status: z.enum(STOP_STATUSES) })])
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
    if (!existing || existing.type !== "tour") {
      return NextResponse.json({ error: "Stop not found" }, { status: 404 });
    }

    const payload =
      "title" in parsed.data ? toPayload(parsed.data) : { status: parsed.data.status };

    const { data: stop, error } = await (adminClient.from("gigs") as any)
      .update(payload)
      .eq("id", idParse.data.id)
      .select()
      .single();

    if (error) {
      logger.error("Tour stop update failed", error);
      return NextResponse.json({ error: `Failed to update stop: ${error.message}` }, { status: 500 });
    }

    await logAdminAction({
      supabase: auth.supabase,
      adminUserId: auth.user.id,
      action: AdminActions.GIG_UPDATED,
      targetType: "gig",
      targetId: stop.id,
      oldValues: { status: existing.status },
      newValues: { status: stop.status, title: stop.title },
    });

    return NextResponse.json({ success: true, stop });
  } catch (error) {
    logger.error("Tour stop update error", error);
    return NextResponse.json({ error: "Failed to update stop" }, { status: 500 });
  }
}

// DELETE — remove a stop that has no applications (otherwise cancel it instead,
// so applicant history isn't silently erased)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Stop id required" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    const { data: existing } = await (adminClient.from("gigs") as any)
      .select("id, type, title")
      .eq("id", parsed.data.id)
      .single();
    if (!existing || existing.type !== "tour") {
      return NextResponse.json({ error: "Stop not found" }, { status: 404 });
    }

    const { count: modelApps } = await (adminClient.from("gig_applications") as any)
      .select("id", { count: "exact", head: true })
      .eq("gig_id", parsed.data.id);
    const { count: roleApps } = await ((adminClient as any).from("tour_applications") as any)
      .select("id", { count: "exact", head: true })
      .eq("gig_id", parsed.data.id);
    const total = (modelApps ?? 0) + (roleApps ?? 0);
    if (total > 0) {
      return NextResponse.json(
        { error: `This stop has ${total} application(s). Cancel it instead of deleting so applicant history is kept.` },
        { status: 409 }
      );
    }

    const { error } = await (adminClient.from("gigs") as any).delete().eq("id", parsed.data.id);
    if (error) {
      logger.error("Tour stop delete failed", error);
      return NextResponse.json({ error: `Failed to delete stop: ${error.message}` }, { status: 500 });
    }

    await logAdminAction({
      supabase: auth.supabase,
      adminUserId: auth.user.id,
      action: AdminActions.GIG_DELETED,
      targetType: "gig",
      targetId: parsed.data.id,
      oldValues: { title: existing.title, type: "tour" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Tour stop delete error", error);
    return NextResponse.json({ error: "Failed to delete stop" }, { status: 500 });
  }
}
