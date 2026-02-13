import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const assignSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(50),
  notes: z.string().max(2000).optional().nullable(),
});

async function verifyAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// POST - Assign library item to brands or models
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    if (!(await verifyAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify item exists
    const { data: item } = await adminClient.from("content_library" as any)
      .select("id, title")
      .eq("id", itemId)
      .maybeSingle() as { data: any };

    if (!item) {
      return NextResponse.json({ error: "Library item not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { recipientIds, notes } = parsed.data;

    // Build insert records
    const records = recipientIds.map((recipientId) => ({
      library_item_id: itemId,
      recipient_actor_id: recipientId,
      assigned_by: user.id,
      notes: notes || null,
      assigned_at: new Date().toISOString(),
    }));

    const { data: assignments, error } = await adminClient.from("content_assignments" as any)
      .upsert(records, { onConflict: "library_item_id,recipient_actor_id" })
      .select() as { data: any; error: any };

    if (error) {
      console.error("Failed to assign content:", error);
      return NextResponse.json({ error: "Failed to assign content" }, { status: 500 });
    }

    // Send notifications to recipients
    for (const recipientId of recipientIds) {
      try {
        await adminClient.from("notifications" as any).insert({
          actor_id: recipientId,
          type: "content_shared",
          title: "Content Shared",
          body: `EXA has shared content with you: "${item.title}"`,
          data: {
            library_item_id: itemId,
          },
        });
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }

    return NextResponse.json({ assignments: assignments || [], count: recipientIds.length });
  } catch (error) {
    console.error("Assign content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
