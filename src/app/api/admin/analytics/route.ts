import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
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

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Fetch all analytics data in parallel.
    // All page_views functions exclude internal/admin devices (20260717000006);
    // service-role client is required for the REVOKEd functions.
    const serviceClient = createServiceRoleClient();
    const [
      totalViewsResult,
      uniqueVisitorsResult,
      deviceBreakdownResult,
      topPagesResult,
      topModelsResult,
      dailyViewsResult,
      browserBreakdownResult,
      countryBreakdownResult,
      countryVisitorsResult,
      signupsByCountryResult,
    ] = await Promise.all([
      // Total page views (internal excluded)
      serviceClient.rpc("count_page_views", { start_date: startDateStr }),

      // Unique visitors
      supabase.rpc("count_unique_visitors", { start_date: startDateStr }),

      // Device breakdown
      supabase.rpc("get_device_breakdown", { start_date: startDateStr }),

      // Top pages
      supabase.rpc("get_top_pages", { start_date: startDateStr, limit_count: 10 }),

      // Top model profiles
      supabase.rpc("get_top_model_profiles", { start_date: startDateStr, limit_count: 50 }),

      // Daily views
      supabase.rpc("get_daily_views", { start_date: startDateStr }),

      // Browser breakdown
      supabase.rpc("get_browser_breakdown", { start_date: startDateStr }),

      // Country breakdown
      supabase.rpc("get_country_breakdown", { start_date: startDateStr, limit_count: 10 }),

      // Unique real visitors per country
      serviceClient.rpc("get_country_visitor_breakdown", {
        start_date: startDateStr,
        limit_count: 20,
      }),

      // New model/fan signups attributed to the country of their first located view
      serviceClient.rpc("get_signups_by_country", {
        start_date: startDateStr,
        limit_count: 20,
      }),
    ]);

    const totalViews = totalViewsResult.data || 0;
    const uniqueVisitors = uniqueVisitorsResult.data || 0;

    return NextResponse.json({
      totalViews,
      uniqueVisitors,
      viewsPerVisitor: uniqueVisitors > 0 ? (totalViews / uniqueVisitors).toFixed(2) : "0",
      deviceBreakdown: deviceBreakdownResult.data || [],
      topPages: topPagesResult.data || [],
      topModels: topModelsResult.data || [],
      dailyViews: dailyViewsResult.data || [],
      browserBreakdown: browserBreakdownResult.data || [],
      countryBreakdown: countryBreakdownResult.data || [],
      countryVisitors: countryVisitorsResult.data || [],
      signupsByCountry: signupsByCountryResult.data || [],
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
