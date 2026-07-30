import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const VALID_STATUSES = ["new", "contacted", "responded", "interested", "not_interested", "converted", "do_not_contact"] as const;

const patchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
  mark_contacted: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required",
});

export const PATCH = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id } = params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, notes, mark_contacted } = parsed.data;
    const adminClient = createServiceRoleClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (mark_contacted) updates.last_contacted_at = new Date().toISOString();

    const { error } = await adminClient
      .from("brand_outreach_contacts")
      .update(updates)
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);

export const DELETE = withAuth<{ id: string }>(
  async ({ params }) => {
    const { id } = params;

    const adminClient = createServiceRoleClient();
    const { error } = await adminClient
      .from("brand_outreach_contacts")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
