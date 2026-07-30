import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

export const PATCH = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id } = params;
    const body = await request.json();
    const { new_face } = body;

    if (typeof new_face !== "boolean") {
      return NextResponse.json({ error: "Invalid new_face value" }, { status: 400 });
    }

    // Service role: models UPDATE policies are own-row only (20260716000001),
    // so a session-client write to another model's row silently no-ops.
    const { error } = await createServiceRoleClient()
      .from("models")
      .update({ new_face, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
