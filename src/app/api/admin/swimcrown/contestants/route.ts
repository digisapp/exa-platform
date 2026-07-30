import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";

const patchSchema = z.object({
  id: z.string().uuid("Invalid contestant ID"),
  status: z.enum(["approved", "rejected"]),
});

// PATCH - Approve or reject a contestant
export const PATCH = withAuth(
  async ({ request }) => {
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
  },
  { requireType: "admin", rateLimit: "general" }
);
