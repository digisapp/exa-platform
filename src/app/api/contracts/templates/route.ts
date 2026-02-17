import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { data: templates, error } = await (supabase as any)
      .from("contract_templates")
      .select("id, name, slug, description, category, content")
      .eq("is_system", true)
      .order("name");

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error("Error in GET /api/contracts/templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
