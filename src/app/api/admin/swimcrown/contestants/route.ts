import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const patchSchema = z.object({
  id: z.string().uuid("Invalid contestant ID"),
  status: z.enum(["approved", "rejected"]),
});

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// PATCH - Approve or reject a contestant
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    const validationResult = patchSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { id, status } = validationResult.data;

    const adminClient = createServiceRoleClient();

    const { data: updated, error: updateError } = await (adminClient as any)
      .from("swimcrown_contestants")
      .update({ status })
      .eq("id", id)
      .select(`
        id,
        status,
        model_id,
        tier,
        models!inner (
          id,
          first_name,
          username
        )
      `)
      .single();

    if (updateError) {
      console.error("Admin contestant update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update contestant" },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Contestant not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contestant: {
        id: updated.id,
        status: updated.status,
        modelId: updated.model_id,
        tier: updated.tier,
        model: updated.models
          ? {
              id: updated.models.id,
              firstName: updated.models.first_name,
              username: updated.models.username,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Admin contestant PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update contestant" },
      { status: 500 }
    );
  }
}
