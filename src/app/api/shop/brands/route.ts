import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limit (public endpoint, IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const query = supabase
      .from("shop_brands")
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        ships_internationally,
        avg_ship_days
      `)
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(limit);

    const { data: brands, error } = await query;

    if (error) {
      console.error("Shop brands query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch brands" },
        { status: 500 }
      );
    }

    // Get product counts for each brand
    const brandIds = brands?.map((b: any) => b.id) || [];

    const { data: productCounts } = await supabase
      .from("shop_products")
      .select("brand_id")
      .eq("is_active", true)
      .in("brand_id", brandIds);

    // Count products per brand
    const countMap: Record<string, number> = {};
    productCounts?.forEach((p: any) => {
      countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
    });

    const transformedBrands = brands?.map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logo_url,
      shipsInternationally: brand.ships_internationally,
      avgShipDays: brand.avg_ship_days,
      productCount: countMap[brand.id] || 0,
    }));

    return NextResponse.json({
      brands: transformedBrands || [],
    }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Shop brands error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
