import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Get user's orders
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: orders, error } = await supabase
      .from("shop_orders")
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        shipping_city,
        shipping_state,
        shipping_country,
        subtotal,
        shipping_cost,
        tax_amount,
        discount_amount,
        total,
        status,
        payment_status,
        paid_at,
        created_at,
        items:shop_order_items(
          id,
          product_name,
          variant_size,
          variant_color,
          quantity,
          unit_price,
          line_total,
          fulfillment_status,
          tracking_number,
          tracking_carrier,
          brand:shop_brands(
            name,
            slug
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Orders query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    const transformedOrders = orders?.map((order: any) => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      shippingLocation: `${order.shipping_city}, ${order.shipping_state}`,
      subtotal: order.subtotal,
      shippingCost: order.shipping_cost,
      taxAmount: order.tax_amount,
      discountAmount: order.discount_amount,
      total: order.total,
      status: order.status,
      paymentStatus: order.payment_status,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      itemCount: order.items?.length || 0,
      items: order.items?.map((item: any) => ({
        id: item.id,
        productName: item.product_name,
        size: item.variant_size,
        color: item.variant_color,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
        fulfillmentStatus: item.fulfillment_status,
        tracking: item.tracking_number
          ? { number: item.tracking_number, carrier: item.tracking_carrier }
          : null,
        brand: item.brand,
      })) || [],
    }));

    return NextResponse.json({
      orders: transformedOrders || [],
      pagination: {
        offset,
        limit,
      },
    });
  } catch (error) {
    console.error("Orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
