import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  DEFAULT_PUSH_PREFERENCES,
  type PushEventKey,
  type PushPreferences,
} from "@/lib/push-config";

// Fixed event vocabulary — keys must match PUSH_EVENT_KEYS and the BOOLEAN
// columns on push_preferences (the `satisfies` keeps them in lockstep).
const preferencesSchema = z
  .object({
    calls: z.boolean(),
    messages: z.boolean(),
    earnings: z.boolean(),
    offers: z.boolean(),
  } satisfies Record<PushEventKey, unknown>)
  .partial()
  .refine((prefs) => Object.keys(prefs).length > 0, {
    message: "At least one preference is required",
  });

const PREF_COLUMNS = "calls, messages, earnings, offers";

// GET - The caller's push preferences; defaults (all enabled) when no row.
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Read-own via RLS (push_preferences is newer than the generated DB types)
    const { data: prefs } = await (supabase as any)
      .from("push_preferences")
      .select(PREF_COLUMNS)
      .eq("actor_id", actor.id)
      .maybeSingle();

    return NextResponse.json({
      preferences: (prefs as PushPreferences | null) ?? DEFAULT_PUSH_PREFERENCES,
    });
  } catch (error) {
    logger.error("Push preferences fetch error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Partial update of the caller's push preferences. Writes are
// service-role-only (RLS); the row is created on first toggle (missing
// columns fall back to their DB defaults, all true).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Upsert only the provided keys: on insert, absent columns take their
    // defaults (true); on conflict, absent columns keep their stored values.
    const service = createServiceRoleClient();
    const { data: prefs, error } = await (service as any)
      .from("push_preferences")
      .upsert(
        {
          actor_id: actor.id,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "actor_id" }
      )
      .select(PREF_COLUMNS)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      preferences: prefs as PushPreferences,
    });
  } catch (error) {
    logger.error("Push preferences update error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
