import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LOW_STOCK_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  try {
    const countOnly = request.nextUrl.searchParams.get("count_only") === "true";

    // Get variants with low stock
    const { data: variants, error } = await supabase
      .from("shop_product_variants")
      .select(`
        id,
        sku,
        size,
        color,
        stock_quantity,
        product_id,
        shop_products (
          name,
          is_active
        )
      `)
      .lte("stock_quantity", LOW_STOCK_THRESHOLD)
      .order("stock_quantity", { ascending: true });

    if (error) {
      console.error("Error fetching low stock:", error);
      return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }

    // Filter to only active products
    const lowStockItems = (variants || [])
      .filter((v: any) => v.shop_products?.is_active)
      .map((v: any) => ({
        id: v.id,
        sku: v.sku,
        product_name: v.shop_products?.name,
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity,
        low_stock_threshold: LOW_STOCK_THRESHOLD,
      }));

    if (countOnly) {
      return NextResponse.json({ count: lowStockItems.length });
    }

    return NextResponse.json({ items: lowStockItems });
  } catch (error) {
    console.error("Low stock error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
