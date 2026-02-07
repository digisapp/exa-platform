import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get shop_brand for this user
    const { data: shopBrand } = await supabase
      .from("shop_brands")
      .select(`
        id,
        name,
        slug,
        commission_rate,
        model_commission_rate,
        status,
        created_at
      `)
      .eq("contact_email", user.email || "")
      .single();

    if (!shopBrand) {
      return NextResponse.json({
        brand: null,
        stats: null,
        message: "No shop brand found for this account",
      });
    }

    // Get product stats
    const { data: products } = await supabase
      .from("shop_products")
      .select("id, is_active, total_sold, view_count")
      .eq("brand_id", shopBrand.id);

    const activeProducts = products?.filter((p: any) => p.is_active).length || 0;
    const totalProducts = products?.length || 0;
    const totalSold = products?.reduce((sum: number, p: any) => sum + (p.total_sold || 0), 0) || 0;
    const totalViews = products?.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0) || 0;

    // Get variant stock
    const { data: variants } = await supabase
      .from("shop_product_variants")
      .select("stock_quantity, low_stock_threshold, product:shop_products!inner(brand_id)")
      .eq("product.brand_id", shopBrand.id);

    const totalStock = variants?.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0) || 0;
    const lowStockCount = variants?.filter((v: any) =>
      v.stock_quantity <= (v.low_stock_threshold || 5)
    ).length || 0;

    // Get order stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentItems } = await supabase
      .from("shop_order_items")
      .select(`
        line_total,
        wholesale_price,
        quantity,
        fulfillment_status,
        order:shop_orders!inner(payment_status, paid_at)
      `)
      .eq("brand_id", shopBrand.id)
      .eq("order.payment_status", "paid")
      .gte("order.paid_at", thirtyDaysAgo.toISOString());

    const last30Days = {
      revenue: recentItems?.reduce((sum: number, i: any) => sum + i.line_total, 0) || 0,
      payout: recentItems?.reduce((sum: number, i: any) => sum + (i.wholesale_price * i.quantity), 0) || 0,
      orders: new Set(recentItems?.map((i: any) => i.order?.id) || []).size,
      pending: recentItems?.filter((i: any) =>
        i.fulfillment_status === "pending" || i.fulfillment_status === "confirmed"
      ).length || 0,
    };

    // Get pending payouts
    const { data: pendingPayouts } = await supabase
      .from("shop_brand_payouts")
      .select("net_payout")
      .eq("brand_id", shopBrand.id)
      .eq("status", "pending");

    const totalPendingPayout = pendingPayouts?.reduce((sum: number, p: any) => sum + p.net_payout, 0) || 0;

    return NextResponse.json({
      brand: {
        id: shopBrand.id,
        name: shopBrand.name,
        slug: shopBrand.slug,
        commissionRate: shopBrand.commission_rate,
        modelCommissionRate: shopBrand.model_commission_rate,
        status: shopBrand.status,
      },
      stats: {
        products: {
          total: totalProducts,
          active: activeProducts,
          totalSold,
          totalViews,
        },
        inventory: {
          totalStock,
          lowStockCount,
          variantCount: variants?.length || 0,
        },
        last30Days,
        payouts: {
          pending: totalPendingPayout,
        },
      },
    });
  } catch (error) {
    console.error("Brand stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
