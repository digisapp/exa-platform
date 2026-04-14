import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const pinSchema = z.object({
  messageId: z.string().uuid(),
  pin: z.boolean(),
});

export async function POST(request: NextRequest) {
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
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validation = pinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { messageId, pin } = validation.data;

    // Unpin any currently pinned message first
    if (pin) {
      await (adminClient as any)
        .from("live_wall_messages")
        .update({ is_pinned: false })
        .eq("is_pinned", true);
    }

    // Pin/unpin the target message
    const { error } = await (adminClient as any)
      .from("live_wall_messages")
      .update({ is_pinned: pin })
      .eq("id", messageId);

    if (error) {
      console.error("Pin error:", error);
      return NextResponse.json({ error: "Failed to update pin" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pin route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
