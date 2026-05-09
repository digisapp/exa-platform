import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

async function checkAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") return null;
  return user;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const userIds: unknown = body?.userIds;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ dobs: {} });
  }

  const ids = userIds.filter((u): u is string => typeof u === "string");
  if (ids.length === 0) {
    return NextResponse.json({ dobs: {} });
  }

  const adminClient = createServiceRoleClient();
  const { data, error } = await adminClient
    .from("model_applications")
    .select("user_id, date_of_birth")
    .in("user_id", ids)
    .not("date_of_birth", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dobs: Record<string, string> = {};
  for (const row of data || []) {
    if (row.user_id && row.date_of_birth && !dobs[row.user_id]) {
      dobs[row.user_id] = row.date_of_birth;
    }
  }
  return NextResponse.json({ dobs });
}
