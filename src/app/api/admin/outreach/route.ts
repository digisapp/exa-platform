import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { escapeIlike } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 50;

const VALID_STATUSES = ["new", "contacted", "responded", "interested", "not_interested", "converted", "do_not_contact"];
const VALID_CATEGORIES = ["swimwear", "resort_wear", "luxury", "fashion", "lingerie", "activewear", "accessories", "beauty"];

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

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

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
      const escaped = escapeIlike(search);
      query = query.or(
        `brand_name.ilike.%${escaped}%,contact_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
      ) as typeof query;
    }

    if (status !== "all" && VALID_STATUSES.includes(status)) {
      query = query.eq("status", status) as typeof query;
    }

    if (category !== "all" && VALID_CATEGORIES.includes(category)) {
      query = query.eq("category", category) as typeof query;
    }

    const [
      { data: contacts, count, error },
      { count: newCount },
      { count: contactedCount },
      { count: interestedCount },
      { count: convertedCount },
    ] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to),
      adminClient.from("brand_outreach_contacts").select("id", { count: "exact", head: true }).eq("status", "new"),
      adminClient.from("brand_outreach_contacts").select("id", { count: "exact", head: true }).eq("status", "contacted"),
      adminClient.from("brand_outreach_contacts").select("id", { count: "exact", head: true }).eq("status", "interested"),
      adminClient.from("brand_outreach_contacts").select("id", { count: "exact", head: true }).eq("status", "converted"),
    ]);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      contacts: contacts || [],
      total: count || 0,
      statusCounts: {
        new: newCount || 0,
        contacted: contactedCount || 0,
        interested: interestedCount || 0,
        converted: convertedCount || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Admin outreach list error:", message);
    return NextResponse.json({ error: "Failed to load outreach contacts" }, { status: 500 });
  }
}
