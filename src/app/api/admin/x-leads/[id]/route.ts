import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

// PATCH /api/admin/x-leads/[id]
// Body: { status?, notes?, contacted_at? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single() as { data: { type: string } | null };
  if (actor?.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const xLeadSchema = z.object({
    status: z.string().optional(),
    notes: z.string().optional(),
    contacted_at: z.string().datetime().optional(),
  }).refine(data => Object.values(data).some(v => v !== undefined), {
    message: "No valid fields to update",
  });
  const parsed = xLeadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const update: Record<string, string> = {};
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.notes) update.notes = parsed.data.notes;
  if (parsed.data.contacted_at) update.contacted_at = parsed.data.contacted_at;

  const db = createServiceRoleClient() as any;
  const { data, error } = await db
    .from("x_leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error("Failed to update x-lead", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }

  return NextResponse.json(data);
}
