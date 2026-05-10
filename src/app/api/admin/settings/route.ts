import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/settings?key=ai_auto_reply_enabled
 * Get a platform setting
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const { data, error } = await (supabase.from("platform_settings" as any) as any)
    .select("value")
    .eq("key", key)
    .single();

  if (error) {
    return NextResponse.json({ value: null });
  }

  return NextResponse.json({ value: data.value });
}

/**
 * Allowlist of settable platform_settings keys + the JS type each key's `value`
 * must satisfy. Without this, an admin (or anyone with an admin session) could
 * write arbitrary keys that other privileged code paths might trust.
 *
 * To add a new setting: add the key here AND ensure the reader handles missing
 * values gracefully.
 */
const ALLOWED_SETTINGS: Record<string, "boolean" | "string" | "number"> = {
  ai_auto_reply_enabled: "boolean",
};

/**
 * PUT /api/admin/settings
 * Update a platform setting
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key, value } = await request.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const expectedType = ALLOWED_SETTINGS[key];
  if (!expectedType) {
    return NextResponse.json(
      { error: `Setting "${key}" is not on the allowlist` },
      { status: 400 }
    );
  }
  if (typeof value !== expectedType) {
    return NextResponse.json(
      { error: `Setting "${key}" expects a ${expectedType} value` },
      { status: 400 }
    );
  }

  const { error } = await (supabase.from("platform_settings" as any) as any)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
