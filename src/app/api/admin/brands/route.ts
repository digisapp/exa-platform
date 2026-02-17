import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single() as { data: { type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const search = searchParams.get("search") || "";
    const tierFilter = searchParams.get("tier") || "all";
    const verifiedFilter = searchParams.get("verified") || "all";

    const adminClient = createServiceRoleClient();

    let query = adminClient
      .from("brands")
      .select(
        "id, company_name, contact_name, email, website, phone, username, logo_url, subscription_tier, is_verified, coin_balance, created_at",
        { count: "exact" }
      );

    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,email.ilike.%${search}%,contact_name.ilike.%${search}%`
      );
    }

    if (tierFilter !== "all") {
      query = query.eq("subscription_tier", tierFilter);
    }

    if (verifiedFilter === "verified") {
      query = query.eq("is_verified", true);
    } else if (verifiedFilter === "unverified") {
      query = query.eq("is_verified", false);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: brands, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({ brands: brands || [], total: count || 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Admin brands list error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
