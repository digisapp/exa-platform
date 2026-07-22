import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

// POST - Remove this browser's push subscription. Scoped to the caller's own
// actor; idempotent (unsubscribing an unknown endpoint still succeeds).
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
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { endpoint } = parsed.data;

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Service-role delete, scoped to the caller's own rows
    // (push_subscriptions is newer than the generated DB types)
    const service = createServiceRoleClient();
    const { error } = await (service as any)
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("actor_id", actor.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Push unsubscribe error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
