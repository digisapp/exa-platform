import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 50;

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";

    const adminClient = createServiceRoleClient();
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = adminClient
      .from("brand_outreach_contacts")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(
        `brand_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
      ) as typeof query;
    }

    if (status !== "all") {
      query = query.eq("status", status) as typeof query;
    }

    if (category !== "all") {
      query = query.eq("category", category) as typeof query;
    }

    const { data: contacts, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return NextResponse.json({ contacts: contacts || [], total: count || 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Admin outreach list error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
