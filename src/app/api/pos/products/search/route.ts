import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { escapeIlike } from "@/lib/utils";
import { requirePosAuth, isPosAuthError } from "@/lib/pos-auth";

const supabase = createServiceRoleClient();

export async function GET(request: NextRequest) {
  try {
    // POS staff authentication
    const authResult = await requirePosAuth(request);
    if (isPosAuthError(authResult)) return authResult;

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "search");
    if (rateLimitResponse) return rateLimitResponse;

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ products: [] });
    }

    // Search products by name or SKU
    const { data: products, error } = await supabase
      .from("shop_products")
      .select(`
        id,
        name,
        retail_price,
        images,
        brand_id,
        shop_brands (
          name
        ),
        shop_product_variants (
          id,
          sku,
          size,
          color,
          stock_quantity,
          price_override
        )
      `)
      .eq("is_active", true)
      .or(`name.ilike.%${escapeIlike(query)}%,shop_product_variants.sku.ilike.%${escapeIlike(query)}%`)
      .limit(20);

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Format response
    const formattedProducts = (products || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      retail_price: product.retail_price,
      images: product.images || [],
      brand_id: product.brand_id,
      brand_name: product.shop_brands?.name,
      variants: (product.shop_product_variants || []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity,
        price_override: v.price_override,
      })),
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error("POS search error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
