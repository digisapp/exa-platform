import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const heartbeatSchema = z.object({
  sessionId: z.string().uuid(),
});

// POST /api/calls/heartbeat
// Called periodically by the in-call client while a call is live. Records the
// last time the call was known to be alive so the reconciliation sweeper can
// bill a crashed/abandoned call for its true observed duration instead of
// leaving it unbilled. Intentionally lightweight — a single scoped UPDATE.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = heartbeatSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { sessionId } = parsed.data;

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Only a participant can heartbeat, and only while the call is active.
    // Cast: last_heartbeat_at is newer than the generated DB types.
    await (supabase.from("video_call_sessions") as any)
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("status", "active")
      .or(`initiated_by.eq.${actor.id},recipient_id.eq.${actor.id}`);

    return NextResponse.json({ ok: true });
  } catch {
    // Heartbeats are best-effort; never surface an error to the call UI.
    return NextResponse.json({ ok: false });
  }
}
