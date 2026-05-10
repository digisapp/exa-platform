import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminActor = { id: string; type: "admin"; user_id: string };

export async function requireAdmin(): Promise<
  { ok: true; actor: AdminActor } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: actor } = await (supabase.from("actors") as any)
    .select("id, type, user_id")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, actor: actor as AdminActor };
}
