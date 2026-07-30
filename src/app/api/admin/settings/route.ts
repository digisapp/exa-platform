import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/settings?key=ai_auto_reply_enabled
 * Get a platform setting
 */
export const GET = withAuth(
  async ({ request, supabase }) => {
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
  },
  { requireType: "admin" }
);

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
export const PUT = withAuth(
  async ({ request, supabase }) => {
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
  },
  { requireType: "admin" }
);
