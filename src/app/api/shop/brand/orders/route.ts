import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get brand's orders
export async function GET(request: Request) {
  try {
    // as any needed: shop tables not fully in generated types
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get shop_brand for this user
    const { data: shopBrand } = await supabase
      .from("shop_brands")
      .select("id, name")
      .eq("contact_email", user.email)
      .single();

    if (!shopBrand) {
      return NextResponse.json({
        brand: null,
        orders: [],
        message: "No shop brand found for this account",
      });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Get order items for this brand
    let query = supabase
      .from("shop_order_items")
      .select(`
        id,
        product_name,
        variant_sku,
        variant_size,
        variant_color,
        quantity,
        unit_price,
        wholesale_price,
        line_total,
        fulfillment_status,
        shipped_at,
        tracking_number,
        tracking_carrier,
        delivered_at,
        return_status,
        created_at,
        order:shop_orders(
          id,
          order_number,
          customer_name,
          customer_email,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          shipping_country,
          status,
          payment_status,
          paid_at
        )
      `)
      .eq("brand_id", shopBrand.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("fulfillment_status", status);
    }

    const { data: orderItems, error } = await query;

    if (error) {
      console.error("Brand orders query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    // Group by order
    const orderMap: Record<string, any> = {};

    orderItems?.forEach((item: any) => {
      const orderId = item.order?.id;
      if (!orderId) return;

      if (!orderMap[orderId]) {
        orderMap[orderId] = {
          id: orderId,
          orderNumber: item.order.order_number,
          customer: {
            name: item.order.customer_name,
            email: item.order.customer_email,
          },
          shippingAddress: {
            line1: item.order.shipping_address_line1,
            line2: item.order.shipping_address_line2,
            city: item.order.shipping_city,
            state: item.order.shipping_state,
            postalCode: item.order.shipping_postal_code,
            country: item.order.shipping_country,
          },
          status: item.order.status,
          paymentStatus: item.order.payment_status,
          paidAt: item.order.paid_at,
          items: [],
          totalRevenue: 0,
          totalWholesale: 0,
        };
      }

      orderMap[orderId].items.push({
        id: item.id,
        productName: item.product_name,
        sku: item.variant_sku,
        size: item.variant_size,
        color: item.variant_color,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        wholesalePrice: item.wholesale_price,
        lineTotal: item.line_total,
        fulfillmentStatus: item.fulfillment_status,
        shippedAt: item.shipped_at,
        trackingNumber: item.tracking_number,
        trackingCarrier: item.tracking_carrier,
        deliveredAt: item.delivered_at,
        returnStatus: item.return_status,
      });

      orderMap[orderId].totalRevenue += item.line_total;
      orderMap[orderId].totalWholesale += item.wholesale_price * item.quantity;
    });

    const orders = Object.values(orderMap);

    // Calculate stats
    const stats = {
      pending: orders.filter((o: any) =>
        o.items.some((i: any) => i.fulfillmentStatus === "pending" || i.fulfillmentStatus === "confirmed")
      ).length,
      shipped: orders.filter((o: any) =>
        o.items.every((i: any) => i.fulfillmentStatus === "shipped" || i.fulfillmentStatus === "delivered")
      ).length,
      totalRevenue: orders.reduce((sum: number, o: any) => sum + o.totalRevenue, 0),
      totalItems: orderItems?.length || 0,
    };

    return NextResponse.json({
      brand: {
        id: shopBrand.id,
        name: shopBrand.name,
      },
      orders,
      stats,
    });
  } catch (error) {
    console.error("Brand orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// PATCH - Update order item (add tracking, mark shipped)
export async function PATCH(request: Request) {
  try {
    // as any needed: shop tables not fully in generated types
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get shop_brand for this user
    const { data: shopBrand } = await supabase
      .from("shop_brands")
      .select("id")
      .eq("contact_email", user.email)
      .single();

    if (!shopBrand) {
      return NextResponse.json(
        { error: "No shop brand found" },
        { status: 403 }
      );
    }

    const { itemId, trackingNumber, trackingCarrier, fulfillmentStatus } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify item belongs to this brand
    const { data: item } = await supabase
      .from("shop_order_items")
      .select("id, brand_id")
      .eq("id", itemId)
      .single();

    if (!item || item.brand_id !== shopBrand.id) {
      return NextResponse.json(
        { error: "Item not found or unauthorized" },
        { status: 404 }
      );
    }

    // Validate fulfillmentStatus
    const allowedFulfillmentStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (fulfillmentStatus && !allowedFulfillmentStatuses.includes(fulfillmentStatus)) {
      return NextResponse.json(
        { error: `Invalid fulfillment status. Must be one of: ${allowedFulfillmentStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (trackingNumber !== undefined) {
      updateData.tracking_number = trackingNumber;
    }
    if (trackingCarrier !== undefined) {
      updateData.tracking_carrier = trackingCarrier;
    }
    if (fulfillmentStatus) {
      updateData.fulfillment_status = fulfillmentStatus;
      if (fulfillmentStatus === "shipped") {
        updateData.shipped_at = new Date().toISOString();
      }
      if (fulfillmentStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from("shop_order_items")
      .update(updateData)
      .eq("id", itemId);

    if (error) {
      console.error("Update order item error:", error);
      return NextResponse.json(
        { error: "Failed to update item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
